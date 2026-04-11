// CRUD для пользователей (только admin)
import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../../db';

const router = Router();

// GET /api/users — список пользователей с пагинацией (включая ФИО из employees)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const page_size = Math.max(1, parseInt(req.query.page_size as string) || 20);
  const offset = (page - 1) * page_size;

  try {
    const countResult = await pool.query('SELECT COUNT(*) FROM users');
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await pool.query(
      `SELECT u.id, u.login, u.role_id, r.name AS role_name, u.unit_id, u.user_status_id,
              e.last_name, e.first_name, e.middle_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN employees e ON e.user_id = u.id
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

// POST /api/users — создание пользователя (опционально с ФИО → запись в employees)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { login, password, role_id, unit_id, user_status_id, last_name, first_name, middle_name } = req.body;

  if (!login || !password || !role_id) {
    res.status(400).json({ error: 'Поля login, password и role_id обязательны' });
    return;
  }

  const hasFio = last_name?.trim() && first_name?.trim();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM users WHERE login = $1', [login]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      res.status(409).json({ error: 'Пользователь с таким логином уже существует' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);

    const userResult = await client.query(
      `INSERT INTO users (login, password_hash, role_id, unit_id, user_status_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, login, role_id, unit_id, user_status_id`,
      [login, password_hash, role_id, unit_id || null, user_status_id || null]
    );
    const user = userResult.rows[0];

    // Создаём запись сотрудника если указано ФИО
    if (hasFio && unit_id) {
      await client.query(
        `INSERT INTO employees (user_id, last_name, first_name, middle_name, unit_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, last_name.trim(), first_name.trim(), middle_name?.trim() || null, unit_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ data: { ...user, last_name: last_name?.trim() || null, first_name: first_name?.trim() || null, middle_name: middle_name?.trim() || null } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Ошибка при создании пользователя:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  } finally {
    client.release();
  }
});

// GET /api/users/:id — один пользователь (включая ФИО из employees)
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT u.id, u.login, u.role_id, r.name AS role_name, u.unit_id, u.user_status_id,
              e.last_name, e.first_name, e.middle_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN employees e ON e.user_id = u.id
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

// PUT /api/users/:id — обновление пользователя (включая ФИО в employees)
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { login, password, role_id, unit_id, user_status_id, last_name, first_name, middle_name } = req.body;

  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT id FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    if (login) {
      const loginCheck = await client.query(
        'SELECT id FROM users WHERE login = $1 AND id != $2', [login, id]
      );
      if (loginCheck.rows.length > 0) {
        res.status(409).json({ error: 'Пользователь с таким логином уже существует' });
        return;
      }
    }

    await client.query('BEGIN');

    // Обновляем поля пользователя
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (login) { fields.push(`login = $${paramIdx++}`); values.push(login); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      fields.push(`password_hash = $${paramIdx++}`);
      values.push(hash);
    }
    if (role_id) { fields.push(`role_id = $${paramIdx++}`); values.push(role_id); }
    if (unit_id !== undefined) { fields.push(`unit_id = $${paramIdx++}`); values.push(unit_id || null); }
    if (user_status_id !== undefined) { fields.push(`user_status_id = $${paramIdx++}`); values.push(user_status_id || null); }

    let userRow: Record<string, unknown> = existing.rows[0];
    if (fields.length > 0) {
      values.push(id);
      const result = await client.query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIdx}
         RETURNING id, login, role_id, unit_id, user_status_id`,
        values
      );
      userRow = result.rows[0];
    }

    // Обновляем ФИО в employees
    if (last_name !== undefined || first_name !== undefined || middle_name !== undefined) {
      const empCheck = await client.query(
        'SELECT id FROM employees WHERE user_id = $1 LIMIT 1', [id]
      );

      if (empCheck.rows.length > 0) {
        // Обновляем существующую запись
        const empFields: string[] = [];
        const empValues: unknown[] = [];
        let ei = 1;
        if (last_name !== undefined) { empFields.push(`last_name = $${ei++}`); empValues.push(last_name?.trim() || null); }
        if (first_name !== undefined) { empFields.push(`first_name = $${ei++}`); empValues.push(first_name?.trim() || null); }
        if (middle_name !== undefined) { empFields.push(`middle_name = $${ei++}`); empValues.push(middle_name?.trim() || null); }
        if (empFields.length > 0) {
          empValues.push(id);
          await client.query(
            `UPDATE employees SET ${empFields.join(', ')} WHERE user_id = $${ei}`, empValues
          );
        }
      } else if (last_name?.trim() && first_name?.trim()) {
        // Создаём новую запись сотрудника
        const unitForEmp = unit_id ?? (userRow.unit_id as number | null);
        if (unitForEmp) {
          await client.query(
            `INSERT INTO employees (user_id, last_name, first_name, middle_name, unit_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, last_name.trim(), first_name.trim(), middle_name?.trim() || null, unitForEmp]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json({ data: userRow });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Ошибка при обновлении пользователя:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  } finally {
    client.release();
  }
});

// DELETE /api/users/:id — удаление пользователя
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    const existing = await client.query('SELECT id FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    // Нельзя удалить пользователя у которого есть расходы или тревоги
    const raskhodCheck = await client.query(
      'SELECT id FROM raskhod WHERE created_by_user_id = $1 LIMIT 1', [id]
    );
    if (raskhodCheck.rows.length > 0) {
      res.status(409).json({ error: 'Нельзя удалить: у пользователя есть записи расхода личного состава.' });
      return;
    }

    const alertsCheck = await client.query(
      'SELECT id FROM alerts WHERE created_by_user_id = $1 LIMIT 1', [id]
    );
    if (alertsCheck.rows.length > 0) {
      res.status(409).json({ error: 'Нельзя удалить: у пользователя есть объявленные тревоги.' });
      return;
    }

    await client.query('BEGIN');

    // Отвязываем сотрудника от учётной записи (запись сотрудника остаётся)
    await client.query('UPDATE employees SET user_id = NULL WHERE user_id = $1', [id]);

    // Удаляем журнал входов (audit_log)
    await client.query('DELETE FROM audit_log WHERE user_id = $1', [id]);

    // refresh_tokens удаляются каскадно (ON DELETE CASCADE в схеме БД)
    await client.query('DELETE FROM users WHERE id = $1', [id]);

    await client.query('COMMIT');

    res.status(204).send();
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Ошибка при удалении пользователя:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  } finally {
    client.release();
  }
});

export default router;
