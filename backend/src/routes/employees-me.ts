// Маршруты для текущего сотрудника (роль 'user')
import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { requireRole } from '../middleware/auth';

const router = Router();

// GET /api/employees/unit — список сотрудников подразделения (для commander)
router.get('/unit', requireRole('commander'), async (req: Request, res: Response): Promise<void> => {
  const unit_id = req.user?.unit_id;

  if (!unit_id) {
    res.status(400).json({ error: 'Подразделение пользователя не определено' });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT id, last_name, first_name, middle_name
       FROM employees WHERE unit_id = $1
       ORDER BY last_name, first_name`,
      [unit_id]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('Ошибка при получении сотрудников подразделения:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// GET /api/employees/statuses — список статусов (для commander)
router.get('/statuses', requireRole('commander'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT id, name FROM user_statuses ORDER BY id');
    res.json({ data: result.rows });
  } catch (err) {
    console.error('Ошибка при получении статусов:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// PUT /api/employees/me/fcm-token — обновление FCM-токена текущего сотрудника
router.put('/me/fcm-token', requireRole('user'), async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { fcm_token } = req.body;

  if (!fcm_token) {
    res.status(400).json({ error: 'Поле fcm_token обязательно' });
    return;
  }

  try {
    const result = await pool.query(
      'UPDATE employees SET fcm_token = $1 WHERE user_id = $2 RETURNING id, user_id, fcm_token',
      [fcm_token, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Сотрудник не найден' });
      return;
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Ошибка при обновлении FCM-токена:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
