// CRUD для пользователей (только admin)
import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../../db';

const router = Router();

// GET /api/users — список пользователей с пагинацией (JOIN roles)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const page_size = Math.max(1, parseInt(req.query.page_size as string) || 20);
  const offset = (page - 1) * page_size;

  try {
    const countResult = await pool.query('SELECT COUNT(*) FROM users');
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await pool.query(
      `SELECT u.id, u.login, u.role_id, r.name AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       ORDER BY u.id
       LIMIT $1 OFFSET $2`,
      [page_size, offset]
    );

    res.json({ data: result.rows, meta: { page, page_size, total } });
  } catch (err) {
    console.error('Ошибка при получении списка пользователей:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// POST /api/users — создание пользователя
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { login, password, role_id } = req.body;

  if (!login || !password || !role_id) {
    res.status(400).json({ error: 'Поля login, password и role_id обязательны' });
    return;
  }

  try {
    // Проверяем уникальность логина
    const existing = await pool.query('SELECT id FROM users WHERE login = $1', [login]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Пользователь с таким логином уже существует' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (login, password_hash, role_id)
       VALUES ($1, $2, $3)
       RETURNING id, login, role_id`,
      [login, password_hash, role_id]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('Ошибка при создании пользователя:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// GET /api/users/:id — один пользователь
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT u.id, u.login, u.role_id, r.name AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Ошибка при получении пользователя:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// PUT /api/users/:id — обновление пользователя
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { login, password, role_id } = req.body;

  if (!login && !password && !role_id) {
    res.status(400).json({ error: 'Необходимо указать хотя бы одно поле для обновления' });
    return;
  }

  try {
    // Проверяем существование пользователя
    const existing = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    // Проверяем уникальность нового логина
    if (login) {
      const loginCheck = await pool.query(
        'SELECT id FROM users WHERE login = $1 AND id != $2',
        [login, id]
      );
      if (loginCheck.rows.length > 0) {
        res.status(409).json({ error: 'Пользователь с таким логином уже существует' });
        return;
      }
    }

    // Формируем динамический SET
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (login) { fields.push(`login = $${idx++}`); values.push(login); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      fields.push(`password_hash = $${idx++}`);
      values.push(hash);
    }
    if (role_id) { fields.push(`role_id = $${idx++}`); values.push(role_id); }

    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, login, role_id`,
      values
    );

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Ошибка при обновлении пользователя:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// DELETE /api/users/:id — удаление пользователя
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    res.status(204).send();
  } catch (err) {
    console.error('Ошибка при удалении пользователя:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
