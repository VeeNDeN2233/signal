import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { requireRole } from '../middleware/auth';
import * as admin from 'firebase-admin';
const router = Router();
function getFirebaseApp(): admin.app.App {
    if (admin.apps.length > 0) {
        return admin.apps[0]!;
    }
    let credential: admin.credential.Credential;
    let projectId: string | undefined;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        const raw = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) as {
            project_id?: string;
            projectId?: string;
        };
        credential = admin.credential.cert(raw as admin.ServiceAccount);
        projectId = raw.project_id ?? raw.projectId;
    }
    else {
        credential = admin.credential.applicationDefault();
        projectId =
            process.env.FIREBASE_PROJECT_ID ||
                process.env.GOOGLE_CLOUD_PROJECT ||
                process.env.GCLOUD_PROJECT;
    }
    const options: admin.AppOptions = { credential };
    if (projectId) {
        options.projectId = projectId;
    }
    return admin.initializeApp(options);
}
router.get('/', requireRole('commander'), async (req: Request, res: Response): Promise<void> => {
    const unit_id = req.user!.unit_id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const page_size = Math.max(1, parseInt(req.query.page_size as string) || 20);
    const offset = (page - 1) * page_size;
    if (!unit_id) {
        res.status(400).json({ error: 'Подразделение пользователя не определено' });
        return;
    }
    try {
        const countResult = await pool.query('SELECT COUNT(*) FROM alerts WHERE unit_id = $1', [unit_id]);
        const total = parseInt(countResult.rows[0].count, 10);
        const result = await pool.query(`SELECT
         a.id, a.created_at,
         COUNT(DISTINCT e.id)::int                                        AS total_employees,
         COUNT(DISTINCT ar.employee_id)::int                              AS responded_count
       FROM alerts a
       LEFT JOIN employees e ON e.unit_id = a.unit_id
       LEFT JOIN alert_responses ar ON ar.alert_id = a.id
       WHERE a.unit_id = $1
       GROUP BY a.id
       ORDER BY a.created_at DESC
       LIMIT $2 OFFSET $3`, [unit_id, page_size, offset]);
        res.json({ data: result.rows, meta: { page, page_size, total } });
    }
    catch (err) {
        console.error('Ошибка при получении истории тревог:', err);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.post('/', requireRole('commander'), async (req: Request, res: Response): Promise<void> => {
    const created_by_user_id = req.user!.id;
    const unit_id = req.user!.unit_id;
    if (!unit_id) {
        res.status(400).json({ error: 'Подразделение пользователя не определено' });
        return;
    }
    const client = await pool.connect();
    try {
        const alertResult = await client.query(`INSERT INTO alerts (created_by_user_id, unit_id)
       VALUES ($1, $2)
       RETURNING id, created_by_user_id, unit_id, created_at`, [created_by_user_id, unit_id]);
        const alert = alertResult.rows[0];
        const tokensResult = await client.query<{
            id: number;
            fcm_token: string;
        }>(fetchEmployeesForAlertPushSql(), [alert.id, unit_id]);
        if (tokensResult.rows.length > 0) {
            sendFcmNotifications(alert.id, tokensResult.rows).catch((err) => {
                console.error('Критическая ошибка при отправке FCM-уведомлений:', err);
            });
        }
        res.status(201).json({
            data: {
                id: alert.id,
                created_by_user_id: alert.created_by_user_id,
                unit_id: alert.unit_id,
                created_at: alert.created_at,
            },
        });
    }
    catch (err) {
        console.error('Ошибка при создании тревоги:', err);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
    finally {
        client.release();
    }
});
router.get('/:id/responses', requireRole('commander'), async (req: Request, res: Response): Promise<void> => {
    const alertId = parseInt(req.params.id, 10);
    const commanderUnitId = req.user!.unit_id;
    if (isNaN(alertId)) {
        res.status(400).json({ error: 'Некорректный идентификатор тревоги' });
        return;
    }
    try {
        const alertResult = await pool.query('SELECT id, unit_id FROM alerts WHERE id = $1 LIMIT 1', [alertId]);
        if (alertResult.rowCount === 0) {
            res.status(404).json({ error: 'Тревога не найдена' });
            return;
        }
        const alert = alertResult.rows[0];
        if (alert.unit_id !== commanderUnitId) {
            res.status(403).json({ error: 'Нет доступа к данной тревоге' });
            return;
        }
        const result = await pool.query(`SELECT
         e.id          AS employee_id,
         e.last_name,
         e.first_name,
         e.middle_name,
         ar.responded_at
       FROM employees e
       LEFT JOIN alert_responses ar
         ON ar.employee_id = e.id AND ar.alert_id = $1
       WHERE e.unit_id = $2
         AND (e.user_id IS NULL OR e.user_id != $3)
       ORDER BY e.last_name, e.first_name`, [alertId, alert.unit_id, req.user!.id]);
        res.json({ data: result.rows });
    }
    catch (err) {
        console.error('Ошибка при получении откликов на тревогу:', err);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.post('/:id/respond', requireRole('user'), async (req: Request, res: Response): Promise<void> => {
    const alertId = parseInt(req.params.id, 10);
    const userId = req.user!.id;
    if (isNaN(alertId)) {
        res.status(400).json({ error: 'Некорректный идентификатор тревоги' });
        return;
    }
    try {
        const empResult = await pool.query('SELECT id FROM employees WHERE user_id = $1 LIMIT 1', [userId]);
        if (empResult.rowCount === 0) {
            res.status(404).json({ error: 'Сотрудник не найден для данного пользователя' });
            return;
        }
        const employeeId = empResult.rows[0].id as number;
        const alertResult = await pool.query('SELECT id FROM alerts WHERE id = $1 LIMIT 1', [alertId]);
        if (alertResult.rowCount === 0) {
            res.status(404).json({ error: 'Тревога не найдена' });
            return;
        }
        const responseResult = await pool.query(`INSERT INTO alert_responses (alert_id, employee_id, responded_at)
       VALUES ($1, $2, NOW())
       RETURNING id, alert_id, employee_id, responded_at`, [alertId, employeeId]);
        const record = responseResult.rows[0];
        res.status(201).json({
            data: {
                id: record.id,
                alert_id: record.alert_id,
                employee_id: record.employee_id,
                responded_at: record.responded_at,
            },
        });
    }
    catch (err: unknown) {
        if (typeof err === 'object' &&
            err !== null &&
            'code' in err &&
            (err as {
                code: string;
            }).code === '23505') {
            res.status(409).json({ error: 'Вы уже подтвердили получение этой тревоги' });
            return;
        }
        console.error('Ошибка при подтверждении тревоги:', err);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
function fetchEmployeesForAlertPushSql(): string {
    return `
    WITH alert_day AS (
      SELECT created_at::date AS d FROM alerts WHERE id = $1
    ),
    latest_raskhod AS (
      SELECT r.id
      FROM raskhod r
      INNER JOIN alert_day ad ON r.unit_id = $2 AND r.raskhod_date = ad.d
      ORDER BY r.raskhod_time DESC
      LIMIT 1
    )
    SELECT e.id, e.fcm_token
    FROM employees e
    WHERE e.unit_id = $2
      AND e.fcm_token IS NOT NULL
      AND trim(e.fcm_token) <> ''
      AND (
        NOT EXISTS (
          SELECT 1 FROM raskhod r INNER JOIN alert_day ad ON r.unit_id = $2 AND r.raskhod_date = ad.d
        )
        OR NOT EXISTS (
          SELECT 1
          FROM latest_raskhod lr
          INNER JOIN raskhod_entries re ON re.raskhod_id = lr.id AND re.employee_id = e.id
          INNER JOIN user_statuses us ON us.id = re.status_id
          WHERE us.name IS NOT NULL AND us.name <> 'налицо'
        )
      )
  `;
}
async function sendFcmNotifications(alertId: number, employees: Array<{
    id: number;
    fcm_token: string;
}>): Promise<void> {
    const app = getFirebaseApp();
    const messaging = app.messaging();
    const sends = employees.map(async (emp) => {
        try {
            await messaging.send({
                token: emp.fcm_token,
                data: {
                    alert_id: String(alertId),
                    type: 'alert',
                },
                android: {
                    priority: 'high',
                },
            });
        }
        catch (err) {
            console.error(`FCM: ошибка доставки сотруднику id=${emp.id}, token=${emp.fcm_token}:`, err);
        }
    });
    await Promise.allSettled(sends);
}
export default router;
