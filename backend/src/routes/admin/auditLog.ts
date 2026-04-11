// GET /api/audit-log — журнал входов пользователей (только admin)
import { Router, Request, Response } from 'express';
import { pool } from '../../db';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const page_size = Math.max(1, parseInt(req.query.page_size as string) || 50);
  const offset = (page - 1) * page_size;

  try {
    const countResult = await pool.query('SELECT COUNT(*) FROM audit_log');
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await pool.query(
      `SELECT
         al.id,
         al.user_id,
         u.login,
         r.name AS role,
         al.date_time_in,
         al.date_time_out
       FROM audit_log al
       JOIN users u ON u.id = al.user_id
       JOIN roles r ON r.id = u.role_id
       ORDER BY al.date_time_in DESC
       LIMIT $1 OFFSET $2`,
      [page_size, offset]
    );

    res.json({ data: result.rows, meta: { page, page_size, total } });
  } catch (err) {
    console.error('Ошибка при получении журнала:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
