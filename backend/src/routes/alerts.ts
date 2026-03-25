// Роуты тревоги
import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { requireRole } from '../middleware/auth';
import * as admin from 'firebase-admin';

const router = Router();

/**
 * Инициализация Firebase Admin SDK (один раз при первом использовании).
 * Ожидает переменную окружения GOOGLE_APPLICATION_CREDENTIALS (путь к service account JSON)
 * или FIREBASE_SERVICE_ACCOUNT_JSON (содержимое JSON в виде строки).
 */
function getFirebaseApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  let credential: admin.credential.Credential;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    credential = admin.credential.cert(serviceAccount);
  } else {
    // Использует GOOGLE_APPLICATION_CREDENTIALS или Application Default Credentials
    credential = admin.credential.applicationDefault();
  }

  return admin.initializeApp({ credential });
}

// POST /api/alerts — объявить тревогу (только commander)
router.post('/', requireRole('commander'), async (req: Request, res: Response): Promise<void> => {
  const created_by_user_id = req.user!.id;
  const unit_id = req.user!.unit_id;

  if (!unit_id) {
    res.status(400).json({ error: 'Подразделение пользователя не определено' });
    return;
  }

  const client = await pool.connect();
  try {
    // Создаём запись тревоги
    const alertResult = await client.query(
      `INSERT INTO alerts (created_by_user_id, unit_id)
       VALUES ($1, $2)
       RETURNING id, created_by_user_id, unit_id, created_at`,
      [created_by_user_id, unit_id]
    );
    const alert = alertResult.rows[0];

    // Получаем FCM-токены всех сотрудников подразделения
    const tokensResult = await client.query(
      `SELECT id, fcm_token FROM employees
       WHERE unit_id = $1 AND fcm_token IS NOT NULL AND fcm_token <> ''`,
      [unit_id]
    );

    // Отправляем push-уведомления асинхронно, не блокируя ответ
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
  } catch (err) {
    console.error('Ошибка при создании тревоги:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  } finally {
    client.release();
  }
});

// GET /api/alerts/:id/responses — список откликов сотрудников (только commander)
router.get('/:id/responses', requireRole('commander'), async (req: Request, res: Response): Promise<void> => {
  const alertId = parseInt(req.params.id, 10);
  const commanderUnitId = req.user!.unit_id;

  if (isNaN(alertId)) {
    res.status(400).json({ error: 'Некорректный идентификатор тревоги' });
    return;
  }

  try {
    // Проверяем существование тревоги
    const alertResult = await pool.query(
      'SELECT id, unit_id FROM alerts WHERE id = $1 LIMIT 1',
      [alertId]
    );

    if (alertResult.rowCount === 0) {
      res.status(404).json({ error: 'Тревога не найдена' });
      return;
    }

    const alert = alertResult.rows[0];

    // Проверяем, что тревога принадлежит подразделению commander'а
    if (alert.unit_id !== commanderUnitId) {
      res.status(403).json({ error: 'Нет доступа к данной тревоге' });
      return;
    }

    // Получаем всех сотрудников подразделения с информацией об отклике
    const result = await pool.query(
      `SELECT
         e.id          AS employee_id,
         e.last_name,
         e.first_name,
         e.middle_name,
         ar.responded_at
       FROM employees e
       LEFT JOIN alert_responses ar
         ON ar.employee_id = e.id AND ar.alert_id = $1
       WHERE e.unit_id = $2
       ORDER BY e.last_name, e.first_name`,
      [alertId, alert.unit_id]
    );

    res.json({ data: result.rows });
  } catch (err) {
    console.error('Ошибка при получении откликов на тревогу:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// POST /api/alerts/:id/respond — подтвердить получение тревоги (только user)
router.post('/:id/respond', requireRole('user'), async (req: Request, res: Response): Promise<void> => {
  const alertId = parseInt(req.params.id, 10);
  const userId = req.user!.id;

  if (isNaN(alertId)) {
    res.status(400).json({ error: 'Некорректный идентификатор тревоги' });
    return;
  }

  try {
    // Находим employee по user_id
    const empResult = await pool.query(
      'SELECT id FROM employees WHERE user_id = $1 LIMIT 1',
      [userId]
    );

    if (empResult.rowCount === 0) {
      res.status(404).json({ error: 'Сотрудник не найден для данного пользователя' });
      return;
    }

    const employeeId = empResult.rows[0].id as number;

    // Проверяем, что тревога существует
    const alertResult = await pool.query(
      'SELECT id FROM alerts WHERE id = $1 LIMIT 1',
      [alertId]
    );

    if (alertResult.rowCount === 0) {
      res.status(404).json({ error: 'Тревога не найдена' });
      return;
    }

    // Создаём запись отклика
    const responseResult = await pool.query(
      `INSERT INTO alert_responses (alert_id, employee_id, responded_at)
       VALUES ($1, $2, NOW())
       RETURNING id, alert_id, employee_id, responded_at`,
      [alertId, employeeId]
    );

    const record = responseResult.rows[0];
    res.status(201).json({
      data: {
        id: record.id,
        alert_id: record.alert_id,
        employee_id: record.employee_id,
        responded_at: record.responded_at,
      },
    });
  } catch (err: unknown) {
    // UNIQUE constraint violation (alert_id, employee_id)
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === '23505'
    ) {
      res.status(409).json({ error: 'Вы уже подтвердили получение этой тревоги' });
      return;
    }
    console.error('Ошибка при подтверждении тревоги:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * Отправляет FCM push-уведомления каждому устройству из списка.
 * Ошибки доставки для конкретного устройства логируются, но не прерывают отправку остальным.
 */
async function sendFcmNotifications(
  alertId: number,
  employees: Array<{ id: number; fcm_token: string }>
): Promise<void> {
  const app = getFirebaseApp();
  const messaging = app.messaging();

  const sends = employees.map(async (emp) => {
    try {
      await messaging.send({
        token: emp.fcm_token,
        notification: {
          title: 'ТРЕВОГА',
          body: 'Объявлена тревога. Немедленно подтвердите получение сигнала.',
        },
        data: {
          alert_id: String(alertId),
          type: 'alert',
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'alert_channel',
            sound: 'alarm',
          },
        },
      });
    } catch (err) {
      console.error(
        `FCM: ошибка доставки сотруднику id=${emp.id}, token=${emp.fcm_token}:`,
        err
      );
    }
  });

  await Promise.allSettled(sends);
}

export default router;
