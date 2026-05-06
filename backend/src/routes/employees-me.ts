import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { requireRole } from '../middleware/auth';
const router = Router();
router.get('/me', async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    try {
        const result = await pool.query(`SELECT e.id, e.last_name, e.first_name, e.middle_name,
              u.name AS unit_name, p.name AS position_name, r.name AS rank_name
       FROM employees e
       LEFT JOIN units u ON u.id = e.unit_id
       LEFT JOIN positions p ON p.id = e.position_id
       LEFT JOIN ranks r ON r.id = e.rank_id
       WHERE e.user_id = $1
       LIMIT 1`, [userId]);
        if (result.rows.length === 0) {
            res.json({ data: null });
            return;
        }
        res.json({ data: result.rows[0] });
    }
    catch (err) {
        console.error('Ошибка при получении данных сотрудника:', err);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.get('/unit', requireRole('commander'), async (req: Request, res: Response): Promise<void> => {
    const unit_id = req.user?.unit_id;
    const commander_user_id = req.user?.id;
    if (!unit_id) {
        res.status(400).json({ error: 'Подразделение пользователя не определено' });
        return;
    }
    try {
        const result = await pool.query(`SELECT id, last_name, first_name, middle_name
       FROM employees
       WHERE unit_id = $1
         AND (user_id IS NULL OR user_id != $2)
       ORDER BY last_name, first_name`, [unit_id, commander_user_id]);
        res.json({ data: result.rows });
    }
    catch (err) {
        console.error('Ошибка при получении сотрудников подразделения:', err);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.get('/statuses', requireRole('commander'), async (_req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query('SELECT id, name FROM user_statuses ORDER BY id');
        res.json({ data: result.rows });
    }
    catch (err) {
        console.error('Ошибка при получении статусов:', err);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.put('/me/fcm-token', requireRole('user'), async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { fcm_token } = req.body;
    if (!fcm_token) {
        res.status(400).json({ error: 'Поле fcm_token обязательно' });
        return;
    }
    try {
        const result = await pool.query('UPDATE employees SET fcm_token = $1 WHERE user_id = $2 RETURNING id, user_id, fcm_token', [fcm_token, userId]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Сотрудник не найден' });
            return;
        }
        res.json({ data: result.rows[0] });
    }
    catch (err) {
        console.error('Ошибка при обновлении FCM-токена:', err);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
export default router;
