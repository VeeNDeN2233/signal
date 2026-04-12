// GET /api/audit-log — полный журнал событий системы (только admin)
import { Router, Request, Response } from 'express';
import { pool } from '../../db';

const router = Router();

/** Шаблон для ILIKE: экранируем только % и _ в вводе. */
function searchPattern(raw: string): string {
  const t = String(raw).trim();
  if (!t) return '';
  const escaped = t.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  return `%${escaped}%`;
}

const EVENTS_CTE = `
  WITH events AS (
    SELECT
      al.id AS event_id,
      'login' AS event_type,
      al.date_time_in AS event_time,
      u.login AS actor_login,
      r.name AS actor_role,
      NULL::text AS unit_name,
      NULL::text AS detail
    FROM audit_log al
    JOIN users u ON u.id = al.user_id
    JOIN roles r ON r.id = u.role_id

    UNION ALL

    SELECT
      al.id + 100000000 AS event_id,
      'logout' AS event_type,
      al.date_time_out AS event_time,
      u.login AS actor_login,
      r.name AS actor_role,
      NULL::text AS unit_name,
      NULL::text AS detail
    FROM audit_log al
    JOIN users u ON u.id = al.user_id
    JOIN roles r ON r.id = u.role_id
    WHERE al.date_time_out IS NOT NULL

    UNION ALL

    SELECT
      a.id + 200000000 AS event_id,
      'alert_declared' AS event_type,
      a.created_at AS event_time,
      u.login AS actor_login,
      r.name AS actor_role,
      un.name AS unit_name,
      'Тревога #' || a.id AS detail
    FROM alerts a
    JOIN users u ON u.id = a.created_by_user_id
    JOIN roles r ON r.id = u.role_id
    JOIN units un ON un.id = a.unit_id

    UNION ALL

    SELECT
      ar.id + 300000000 AS event_id,
      'alert_response' AS event_type,
      ar.responded_at AS event_time,
      COALESCE(e.last_name || ' ' || e.first_name, u.login) AS actor_login,
      'user' AS actor_role,
      un.name AS unit_name,
      'Отклик на тревогу #' || ar.alert_id AS detail
    FROM alert_responses ar
    JOIN employees e ON e.id = ar.employee_id
    LEFT JOIN users u ON u.id = e.user_id
    JOIN alerts a ON a.id = ar.alert_id
    JOIN units un ON un.id = a.unit_id

    UNION ALL

    SELECT
      rk.id + 400000000 AS event_id,
      'raskhod_created' AS event_type,
      (rk.raskhod_date + rk.raskhod_time)::timestamptz AS event_time,
      u.login AS actor_login,
      r.name AS actor_role,
      un.name AS unit_name,
      'Расход на ' || TO_CHAR(rk.raskhod_date, 'DD.MM.YYYY') || ' ' || TO_CHAR(rk.raskhod_time, 'HH24:MI') AS detail
    FROM raskhod rk
    JOIN users u ON u.id = rk.created_by_user_id
    JOIN roles r ON r.id = u.role_id
    JOIN units un ON un.id = rk.unit_id
  )
`;

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const page_size = Math.max(1, Math.min(100, parseInt(req.query.page_size as string) || 50));
  const offset = (page - 1) * page_size;
  const filter = (req.query.filter as string) || 'all';
  const qRaw = typeof req.query.q === 'string' ? req.query.q : '';
  const searchPat = searchPattern(qRaw);
  const hasSearch = searchPat.length > 0;

  try {
    const filterClauses: string[] = [];
    if (filter === 'auth') filterClauses.push("event_type IN ('login','logout')");
    else if (filter === 'alerts') filterClauses.push("event_type IN ('alert_declared','alert_response')");
    else if (filter === 'raskhod') filterClauses.push("event_type = 'raskhod_created'");

    const searchClause = hasSearch
      ? `(
          actor_login ILIKE $1 ESCAPE '\\' OR
          COALESCE(detail, '') ILIKE $1 ESCAPE '\\' OR
          COALESCE(unit_name, '') ILIKE $1 ESCAPE '\\' OR
          event_type ILIKE $1 ESCAPE '\\' OR
          actor_role ILIKE $1 ESCAPE '\\'
        )`
      : '';

    const whereParts = [...filterClauses];
    if (searchClause) whereParts.push(searchClause);

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

    const countSql = `${EVENTS_CTE}
      SELECT COUNT(*)::int AS count FROM events
      ${whereClause}
    `;

    const limitPlaceholder = hasSearch ? '$2' : '$1';
    const offsetPlaceholder = hasSearch ? '$3' : '$2';

    const dataSql = `${EVENTS_CTE}
      SELECT * FROM events
      ${whereClause}
      ORDER BY event_time DESC
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `;

    const countParams = hasSearch ? [searchPat] : [];
    const dataParams = hasSearch ? [searchPat, page_size, offset] : [page_size, offset];

    const [countRes, dataRes] = await Promise.all([
      pool.query(countSql, countParams),
      pool.query(dataSql, dataParams),
    ]);

    const total = parseInt(String(countRes.rows[0].count), 10);

    res.json({ data: dataRes.rows, meta: { page, page_size, total } });
  } catch (err) {
    console.error('Ошибка при получении журнала событий:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
