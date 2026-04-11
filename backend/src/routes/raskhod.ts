// Роуты расхода личного состава (только commander)
import { Router, Request, Response } from 'express';
import { pool } from '../db';
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, AlignmentType, WidthType, BorderStyle,
} from 'docx';

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
    // Получаем заголовок расхода с именем подразделения
    const raskhodResult = await pool.query(
      `SELECT r.id, r.raskhod_date, r.raskhod_time, r.unit_id, r.created_by_user_id, u.name AS unit_name
       FROM raskhod r
       LEFT JOIN units u ON u.id = r.unit_id
       WHERE r.id = $1`,
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
        unit_name: raskhod.unit_name,
        created_by_user_id: raskhod.created_by_user_id,
        entries: entriesResult.rows,
      },
    });
  } catch (err) {
    console.error('Ошибка при получении деталей расхода:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// PUT /api/raskhod/:id — редактирование статусов записей расхода
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const unit_id = req.user!.unit_id;
  const { entries } = req.body as { entries: Array<{ employee_id: number; status_id: number }> };

  if (!Array.isArray(entries) || entries.length === 0) {
    res.status(400).json({ error: 'Поле entries обязательно' });
    return;
  }

  const client = await pool.connect();
  try {
    const raskhodResult = await client.query(
      'SELECT id, unit_id FROM raskhod WHERE id = $1',
      [id]
    );
    if (raskhodResult.rows.length === 0) {
      res.status(404).json({ error: 'Расход не найден' });
      return;
    }
    if (raskhodResult.rows[0].unit_id !== unit_id) {
      res.status(403).json({ error: 'Нет доступа к данному расходу' });
      return;
    }

    await client.query('BEGIN');
    await client.query('DELETE FROM raskhod_entries WHERE raskhod_id = $1', [id]);
    for (const entry of entries) {
      await client.query(
        'INSERT INTO raskhod_entries (raskhod_id, employee_id, status_id) VALUES ($1, $2, $3)',
        [id, entry.employee_id, entry.status_id]
      );
    }
    await client.query('COMMIT');
    res.json({ data: { updated: entries.length } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Ошибка при редактировании расхода:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  } finally {
    client.release();
  }
});

// DELETE /api/raskhod/:id — удаление расхода
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const unit_id = req.user!.unit_id;
  const client = await pool.connect();

  try {
    const raskhodResult = await client.query(
      'SELECT id, unit_id FROM raskhod WHERE id = $1',
      [id]
    );

    if (raskhodResult.rows.length === 0) {
      res.status(404).json({ error: 'Расход не найден' });
      return;
    }
    if (raskhodResult.rows[0].unit_id !== unit_id) {
      res.status(403).json({ error: 'Нет доступа к данному расходу' });
      return;
    }

    await client.query('BEGIN');
    await client.query('DELETE FROM raskhod_entries WHERE raskhod_id = $1', [id]);
    await client.query('DELETE FROM raskhod WHERE id = $1', [id]);
    await client.query('COMMIT');

    res.status(204).send();
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Ошибка при удалении расхода:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  } finally {
    client.release();
  }
});

// GET /api/raskhod/:id/download — скачать расход в формате DOCX
router.get('/:id/download', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const unit_id = req.user!.unit_id;

  try {
    const raskhodResult = await pool.query(
      `SELECT r.id, r.raskhod_date, r.raskhod_time, r.unit_id, u.name AS unit_name
       FROM raskhod r LEFT JOIN units u ON u.id = r.unit_id
       WHERE r.id = $1`,
      [id]
    );
    if (raskhodResult.rows.length === 0) {
      res.status(404).json({ error: 'Расход не найден' });
      return;
    }
    const raskhod = raskhodResult.rows[0];
    if (raskhod.unit_id !== unit_id) {
      res.status(403).json({ error: 'Нет доступа к данному расходу' });
      return;
    }

    const entriesResult = await pool.query(
      `SELECT e.last_name, e.first_name, e.middle_name, us.name AS status_name
       FROM raskhod_entries re
       JOIN employees e ON e.id = re.employee_id
       JOIN user_statuses us ON us.id = re.status_id
       WHERE re.raskhod_id = $1
       ORDER BY e.last_name, e.first_name`,
      [id]
    );

    // Форматируем дату (поддержка string и Date от драйвера pg)
    const rawDate = raskhod.raskhod_date as string | Date;
    let dateFormatted = '—';
    if (rawDate instanceof Date) {
      const yyyy = rawDate.getUTCFullYear();
      const mm = String(rawDate.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(rawDate.getUTCDate()).padStart(2, '0');
      dateFormatted = `${dd}.${mm}.${yyyy}`;
    } else if (typeof rawDate === 'string') {
      const [y, m, d] = rawDate.slice(0, 10).split('-');
      if (y && m && d) dateFormatted = `${d}.${m}.${y}`;
    }

    const cellBorder = {
      top: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' },
      left: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' },
      right: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' },
    };

    const headerRow = new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '№', bold: true, size: 22 })], alignment: AlignmentType.CENTER })], borders: cellBorder, width: { size: 8, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ФИО', bold: true, size: 22 })], alignment: AlignmentType.CENTER })], borders: cellBorder, width: { size: 62, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Статус', bold: true, size: 22 })], alignment: AlignmentType.CENTER })], borders: cellBorder, width: { size: 30, type: WidthType.PERCENTAGE } }),
      ],
    });

    const dataRows = entriesResult.rows.map((entry: { last_name: string; first_name: string; middle_name: string | null; status_name: string }, idx: number) => {
      const fio = [entry.last_name, entry.first_name, entry.middle_name].filter(Boolean).join(' ');
      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(idx + 1), size: 22 })], alignment: AlignmentType.CENTER })], borders: cellBorder }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fio, size: 22 })] })], borders: cellBorder }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: entry.status_name, size: 22 })], alignment: AlignmentType.CENTER })], borders: cellBorder }),
        ],
      });
    });

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'РАСХОД ЛИЧНОГО СОСТАВА', bold: true, size: 28 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `Подразделение: ${raskhod.unit_name ?? '—'}`, size: 24 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `Дата: ${dateFormatted}    Время: ${raskhod.raskhod_time}`, size: 24 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
          }),
          new Table({ rows: [headerRow, ...dataRows], width: { size: 100, type: WidthType.PERCENTAGE } }),
          new Paragraph({
            children: [new TextRun({ text: `Всего сотрудников: ${entriesResult.rows.length}`, size: 22 })],
            spacing: { before: 240 },
          }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = `raskhod_${dateFormatted}_${raskhod.raskhod_time.replace(':', '-')}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(buffer);
  } catch (err) {
    console.error('Ошибка при генерации DOCX:', err);
    res.status(500).json({ error: 'Ошибка при генерации файла' });
  }
});

export default router;
