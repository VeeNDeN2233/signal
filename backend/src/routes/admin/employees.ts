// CRUD для сотрудников (только admin)
import { Router, Request, Response } from 'express';
import { pool } from '../../db';

const router = Router();

// GET /api/employees — список сотрудников с пагинацией (поддержка фильтра ?unit_id=)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const page_size = Math.max(1, parseInt(req.query.page_size as string) || 200);
  const offset = (page - 1) * page_size;
  const unit_id = req.query.unit_id ? parseInt(req.query.unit_id as string) : null;

  try {
    const whereClause = unit_id ? 'WHERE e.unit_id = $3' : '';
    const countParams: unknown[] = unit_id ? [unit_id] : [];
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM employees e ${unit_id ? 'WHERE e.unit_id = $1' : ''}`,
      countParams
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const queryParams: unknown[] = unit_id ? [page_size, offset, unit_id] : [page_size, offset];
    const result = await pool.query(
      `SELECT
         e.id, e.user_id, e.last_name, e.first_name, e.middle_name,
         e.position_id, p.name AS position_name,
         e.rank_id, r.name AS rank_name,
         e.unit_id, u.name AS unit_name,
         e.phone_number,
         ul.login AS user_login, ul.role_id AS user_role_id
       FROM employees e
       LEFT JOIN positions p ON p.id = e.position_id
       LEFT JOIN ranks r ON r.id = e.rank_id
       JOIN units u ON u.id = e.unit_id
       LEFT JOIN users ul ON ul.id = e.user_id
       ${whereClause}
       ORDER BY e.last_name, e.first_name
       LIMIT $1 OFFSET $2`,
      queryParams
    );

    res.json({ data: result.rows, meta: { page, page_size, total } });
  } catch (err) {
    console.error('Ошибка при получении списка сотрудников:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// POST /api/employees — создание сотрудника
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const {
    user_id, last_name, first_name, middle_name,
    position_id, rank_id, birth_date, unit_id, phone_number,
  } = req.body;

  if (!last_name || !first_name || !unit_id) {
    res.status(400).json({ error: 'Поля last_name, first_name и unit_id обязательны' });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO employees
         (user_id, last_name, first_name, middle_name, position_id, rank_id, birth_date, unit_id, phone_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, user_id, last_name, first_name, middle_name,
                 position_id, rank_id, birth_date, unit_id, phone_number`,
      [user_id ?? null, last_name, first_name, middle_name ?? null,
       position_id ?? null, rank_id ?? null, birth_date ?? null,
       unit_id, phone_number ?? null]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('Ошибка при создании сотрудника:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// GET /api/employees/:id — один сотрудник
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT
         e.id, e.user_id, e.last_name, e.first_name, e.middle_name,
         e.position_id, p.name AS position_name,
         e.rank_id, r.name AS rank_name,
         e.birth_date,
         e.unit_id, u.name AS unit_name,
         e.phone_number
       FROM employees e
       LEFT JOIN positions p ON p.id = e.position_id
       LEFT JOIN ranks r ON r.id = e.rank_id
       JOIN units u ON u.id = e.unit_id
       WHERE e.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Сотрудник не найден' });
      return;
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Ошибка при получении сотрудника:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// PUT /api/employees/:id — обновление сотрудника
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const {
    user_id, last_name, first_name, middle_name,
    position_id, rank_id, birth_date, unit_id, phone_number,
  } = req.body;

  const allowedFields: Record<string, unknown> = {
    user_id, last_name, first_name, middle_name,
    position_id, rank_id, birth_date, unit_id, phone_number,
  };

  // Оставляем только переданные поля (не undefined)
  const entries = Object.entries(allowedFields).filter(([, v]) => v !== undefined);

  if (entries.length === 0) {
    res.status(400).json({ error: 'Необходимо указать хотя бы одно поле для обновления' });
    return;
  }

  try {
    // Проверяем существование сотрудника
    const existing = await pool.query('SELECT id FROM employees WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Сотрудник не найден' });
      return;
    }

    const fields = entries.map(([col], i) => `${col} = $${i + 1}`);
    const values = entries.map(([, v]) => v);
    values.push(id);

    const result = await pool.query(
      `UPDATE employees SET ${fields.join(', ')} WHERE id = $${values.length}
       RETURNING id, user_id, last_name, first_name, middle_name,
                 position_id, rank_id, birth_date, unit_id, phone_number`,
      values
    );

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Ошибка при обновлении сотрудника:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// DELETE /api/employees/:id — удаление сотрудника
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM employees WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Сотрудник не найден' });
      return;
    }

    res.status(204).send();
  } catch (err) {
    console.error('Ошибка при удалении сотрудника:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
