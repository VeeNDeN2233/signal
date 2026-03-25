// Роуты расхода личного состава (только commander)
import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

// POST /api/raskhod — создание расхода
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { raskhod_date, raskhod_time, entries } = req.body;
  const unit_id = req.user!.unit_id;
  const created_by_user_id = req.user!.id;

  // Валидация времени расхода
  if (raskhod_time !== '09:00' && raskhod_time !== '21:00') {
    res.status(400).json({ error: 'raskhod_time должен быть "09:00" или "21:00"' });
    return;
  }

  // Валидация обязательных полей
  if (!raskhod_date || !Array.isArray(entries) || entries.length === 0) {
    res.status(400).json({ error: 'Поля raskhod_date и entries обязательны' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Проверка уникальности (дата + время + подразделение)
    const dupCheck = await client.query(
      'SELECT id FROM raskhod WHERE raskhod_date = $1 AND raskhod_time = $2 AND unit_id = $3',
      [raskhod_date, raskhod_time, unit_id]
    );
    if (dupCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      res.status(409).json({ error: 'Расход на данную дату и время уже существует' });
      return;
    }

    // Вставка записи расхода
    const raskhodResult = await client.query(
      `INSERT INTO raskhod (raskhod_date, raskhod_time, created_by_user_id, unit_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, raskhod_date, raskhod_time, unit_id`,
      [raskhod_date, raskhod_time, created_by_user_id, unit_id]
    );
    const raskhod = raskhodResult.rows[0];

    // Вставка записей сотрудников
    for (const entry of entries) {
      await client.query(
        'INSERT INTO raskhod_entries (raskhod_id, employee_id, status_id) VALUES ($1, $2, $3)',
        [raskhod.id, entry.employee_id, entry.status_id]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      data: {
        id: raskhod.id,
        raskhod_date: raskhod.raskhod_date,
        raskhod_time: raskhod.raskhod_time,
        unit_id: raskhod.unit_id,
        entries_count: entries.length,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Ошибка при создании расхода:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  } finally {
    client.release();
  }
});

// GET /api/raskhod — история расходов подразделения с пагинацией
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const unit_id = req.user!.unit_id;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const page_size = Math.max(1, parseInt(req.query.page_size as string) || 20);
  const offset = (page - 1) * page_size;

  try {
    // Общее количество расходов подразделения
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM raskhod WHERE unit_id = $1',
      [unit_id]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Список расходов с количеством записей
    const result = await pool.query(
      `SELECT
         r.id, r.raskhod_date, r.raskhod_time, r.unit_id, r.created_by_user_id,
         COUNT(re.id)::int AS entries_count
       FROM raskhod r
       LEFT JOIN raskhod_entries re ON re.raskhod_id = r.id
       WHERE r.unit_id = $1
       GROUP BY r.id
       ORDER BY r.raskhod_date DESC, r.raskhod_time DESC
       LIMIT $2 OFFSET $3`,
      [unit_id, page_size, offset]
    );

    res.json({ data: result.rows, meta: { page, page_size, total } });
  } catch (err) {
    console.error('Ошибка при получении истории расходов:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// GET /api/raskhod/:id — детали расхода с полным списком записей
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const unit_id = req.user!.unit_id;

  try {
    // Получаем заголовок расхода
    const raskhodResult = await pool.query(
      'SELECT id, raskhod_date, raskhod_time, unit_id, created_by_user_id FROM raskhod WHERE id = $1',
      [id]
    );

    if (raskhodResult.rows.length === 0) {
      res.status(404).json({ error: 'Расход не найден' });
      return;
    }

    const raskhod = raskhodResult.rows[0];

    // Проверяем принадлежность расхода подразделению commander'а
    if (raskhod.unit_id !== unit_id) {
      res.status(403).json({ error: 'Нет доступа к данному расходу' });
      return;
    }

    // Получаем записи расхода с данными сотрудников и статусов
    const entriesResult = await pool.query(
      `SELECT
         re.employee_id,
         e.last_name, e.first_name, e.middle_name,
         re.status_id,
         us.name AS status_name
       FROM raskhod_entries re
       JOIN employees e ON e.id = re.employee_id
       JOIN user_statuses us ON us.id = re.status_id
       WHERE re.raskhod_id = $1
       ORDER BY e.last_name, e.first_name`,
      [id]
    );

    res.json({
      data: {
        id: raskhod.id,
        raskhod_date: raskhod.raskhod_date,
        raskhod_time: raskhod.raskhod_time,
        unit_id: raskhod.unit_id,
        created_by_user_id: raskhod.created_by_user_id,
        entries: entriesResult.rows,
      },
    });
  } catch (err) {
    console.error('Ошибка при получении деталей расхода:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
