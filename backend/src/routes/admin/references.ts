import { Router, Request, Response } from 'express';
import { pool } from '../../db';
const DEPENDENCIES: Record<string, Array<{
    table: string;
    column: string;
}>> = {
    positions: [{ table: 'employees', column: 'position_id' }],
    ranks: [{ table: 'employees', column: 'rank_id' }],
    units: [
        { table: 'employees', column: 'unit_id' },
        { table: 'raskhod', column: 'unit_id' },
        { table: 'alerts', column: 'unit_id' },
    ],
    user_statuses: [{ table: 'raskhod_entries', column: 'status_id' }],
};
function createReferenceRouter(tableName: string): Router {
    const router = Router();
    const deps = DEPENDENCIES[tableName] ?? [];
    router.get('/', async (req: Request, res: Response): Promise<void> => {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const page_size = Math.max(1, parseInt(req.query.page_size as string) || 20);
        const offset = (page - 1) * page_size;
        try {
            const countResult = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
            const total = parseInt(countResult.rows[0].count, 10);
            const result = await pool.query(`SELECT id, name FROM ${tableName} ORDER BY id LIMIT $1 OFFSET $2`, [page_size, offset]);
            res.json({ data: result.rows, meta: { page, page_size, total } });
        }
        catch (err) {
            console.error(`Ошибка при получении списка ${tableName}:`, err);
            res.status(500).json({ error: 'Внутренняя ошибка сервера' });
        }
    });
    router.post('/', async (req: Request, res: Response): Promise<void> => {
        const { name } = req.body;
        if (!name) {
            res.status(400).json({ error: 'Поле name обязательно' });
            return;
        }
        try {
            const result = await pool.query(`INSERT INTO ${tableName} (name) VALUES ($1) RETURNING id, name`, [name]);
            res.status(201).json({ data: result.rows[0] });
        }
        catch (err: unknown) {
            if ((err as {
                code?: string;
            }).code === '23505') {
                res.status(409).json({ error: 'Запись с таким именем уже существует' });
                return;
            }
            console.error(`Ошибка при создании записи в ${tableName}:`, err);
            res.status(500).json({ error: 'Внутренняя ошибка сервера' });
        }
    });
    router.get('/:id', async (req: Request, res: Response): Promise<void> => {
        const { id } = req.params;
        try {
            const result = await pool.query(`SELECT id, name FROM ${tableName} WHERE id = $1`, [id]);
            if (result.rows.length === 0) {
                res.status(404).json({ error: 'Запись не найдена' });
                return;
            }
            res.json({ data: result.rows[0] });
        }
        catch (err) {
            console.error(`Ошибка при получении записи из ${tableName}:`, err);
            res.status(500).json({ error: 'Внутренняя ошибка сервера' });
        }
    });
    router.put('/:id', async (req: Request, res: Response): Promise<void> => {
        const { id } = req.params;
        const { name } = req.body;
        if (!name) {
            res.status(400).json({ error: 'Поле name обязательно' });
            return;
        }
        try {
            const result = await pool.query(`UPDATE ${tableName} SET name = $1 WHERE id = $2 RETURNING id, name`, [name, id]);
            if (result.rows.length === 0) {
                res.status(404).json({ error: 'Запись не найдена' });
                return;
            }
            res.json({ data: result.rows[0] });
        }
        catch (err: unknown) {
            if ((err as {
                code?: string;
            }).code === '23505') {
                res.status(409).json({ error: 'Запись с таким именем уже существует' });
                return;
            }
            console.error(`Ошибка при обновлении записи в ${tableName}:`, err);
            res.status(500).json({ error: 'Внутренняя ошибка сервера' });
        }
    });
    router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
        const { id } = req.params;
        try {
            for (const dep of deps) {
                const refCheck = await pool.query(`SELECT 1 FROM ${dep.table} WHERE ${dep.column} = $1 LIMIT 1`, [id]);
                if (refCheck.rows.length > 0) {
                    res.status(409).json({ error: 'Запись используется и не может быть удалена' });
                    return;
                }
            }
            const result = await pool.query(`DELETE FROM ${tableName} WHERE id = $1 RETURNING id`, [id]);
            if (result.rows.length === 0) {
                res.status(404).json({ error: 'Запись не найдена' });
                return;
            }
            res.status(204).send();
        }
        catch (err) {
            console.error(`Ошибка при удалении записи из ${tableName}:`, err);
            res.status(500).json({ error: 'Внутренняя ошибка сервера' });
        }
    });
    return router;
}
export const positions = createReferenceRouter('positions');
export const ranks = createReferenceRouter('ranks');
export const units = createReferenceRouter('units');
export const userStatuses = createReferenceRouter('user_statuses');
import { Router as RolesRouter } from 'express';
const rolesRouter = RolesRouter();
rolesRouter.get('/', async (_req, res) => {
    try {
        const result = await pool.query('SELECT id, name FROM roles ORDER BY id');
        res.json({ data: result.rows });
    }
    catch {
        res.status(500).json({ error: 'Ошибка при получении ролей' });
    }
});
export const roles = rolesRouter;
