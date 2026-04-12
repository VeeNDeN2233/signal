"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Роутер аутентификации: login, refresh, logout
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// ─── Вспомогательные функции ────────────────────────────────────────────────
/** Генерирует JWT access-токен */
function generateAccessToken(userId, role, unitId) {
    const secret = process.env.JWT_ACCESS_SECRET;
    const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
    return jsonwebtoken_1.default.sign({ sub: String(userId), role, unit_id: unitId }, secret, { expiresIn });
}
/** Генерирует JWT refresh-токен */
function generateRefreshToken(userId) {
    const secret = process.env.JWT_REFRESH_SECRET;
    const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    return jsonwebtoken_1.default.sign({ sub: String(userId) }, secret, { expiresIn });
}
/** Вычисляет дату истечения refresh-токена */
function refreshTokenExpiresAt() {
    const raw = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    const match = raw.match(/^(\d+)([smhd])$/);
    const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
    const seconds = match ? parseInt(match[1], 10) * (multipliers[match[2]] ?? 0) : 7 * 86400;
    return new Date(Date.now() + seconds * 1000);
}
// ─── POST /api/auth/login ────────────────────────────────────────────────────
/**
 * Вход в систему.
 * Принимает { login, password }, возвращает { accessToken, refreshToken }.
 * HTTP 401 при неверных учётных данных.
 */
router.post('/login', async (req, res) => {
    const { login, password } = req.body;
    if (!login || !password) {
        res.status(400).json({ error: 'Необходимо указать login и password' });
        return;
    }
    try {
        // Ищем пользователя, unit_id берём из employees (приоритет) или из users.unit_id
        const userResult = await db_1.pool.query(`SELECT u.id, u.password_hash, r.name AS role,
              COALESCE(e.unit_id, u.unit_id) AS unit_id
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN employees e ON e.user_id = u.id
       WHERE u.login = $1
       LIMIT 1`, [login]);
        if (userResult.rowCount === 0) {
            res.status(401).json({ error: 'Неверный логин или пароль' });
            return;
        }
        const user = userResult.rows[0];
        // Проверяем пароль через bcrypt
        const passwordValid = await bcrypt_1.default.compare(password, user.password_hash);
        if (!passwordValid) {
            res.status(401).json({ error: 'Неверный логин или пароль' });
            return;
        }
        // Генерируем токены
        const accessToken = generateAccessToken(user.id, user.role, user.unit_id);
        const refreshToken = generateRefreshToken(user.id);
        const expiresAt = refreshTokenExpiresAt();
        // Сохраняем refresh-токен в БД
        await db_1.pool.query(`INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`, [user.id, refreshToken, expiresAt]);
        // Записываем время входа в audit_log
        await db_1.pool.query(`INSERT INTO audit_log (user_id, date_time_in)
       VALUES ($1, NOW())`, [user.id]);
        res.json({ data: { accessToken, refreshToken, role: user.role } });
    }
    catch (err) {
        console.error('Ошибка при входе:', err);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
// ─── POST /api/auth/refresh ──────────────────────────────────────────────────
/**
 * Обновление пары токенов.
 * Принимает { refreshToken }, возвращает новую пару { accessToken, refreshToken }.
 * Старый refresh-токен удаляется из БД.
 */
router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        res.status(400).json({ error: 'Необходимо указать refreshToken' });
        return;
    }
    try {
        // Проверяем наличие токена в БД
        const tokenResult = await db_1.pool.query(`SELECT rt.id, rt.user_id, rt.expires_at, u.role_id, r.name AS role,
              COALESCE(e.unit_id, u.unit_id) AS unit_id
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN employees e ON e.user_id = u.id
       WHERE rt.token = $1
       LIMIT 1`, [refreshToken]);
        if (tokenResult.rowCount === 0) {
            res.status(401).json({ error: 'Refresh-токен не найден' });
            return;
        }
        const row = tokenResult.rows[0];
        // Проверяем срок действия в БД
        if (new Date(row.expires_at) < new Date()) {
            await db_1.pool.query('DELETE FROM refresh_tokens WHERE id = $1', [row.id]);
            res.status(401).json({ error: 'Refresh-токен истёк' });
            return;
        }
        // Верифицируем подпись через jwt.verify
        const secret = process.env.JWT_REFRESH_SECRET;
        try {
            jsonwebtoken_1.default.verify(refreshToken, secret);
        }
        catch {
            await db_1.pool.query('DELETE FROM refresh_tokens WHERE id = $1', [row.id]);
            res.status(401).json({ error: 'Refresh-токен недействителен' });
            return;
        }
        // Удаляем старый refresh-токен (rotation)
        await db_1.pool.query('DELETE FROM refresh_tokens WHERE id = $1', [row.id]);
        // Генерируем новую пару токенов
        const newAccessToken = generateAccessToken(row.user_id, row.role, row.unit_id);
        const newRefreshToken = generateRefreshToken(row.user_id);
        const expiresAt = refreshTokenExpiresAt();
        await db_1.pool.query(`INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`, [row.user_id, newRefreshToken, expiresAt]);
        res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    }
    catch (err) {
        console.error('Ошибка при обновлении токена:', err);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
// ─── POST /api/auth/logout ───────────────────────────────────────────────────
/**
 * Выход из системы.
 * Принимает { refreshToken }, удаляет его из БД.
 * Записывает date_time_out в последнюю запись audit_log для данного пользователя.
 */
router.post('/logout', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        res.status(400).json({ error: 'Необходимо указать refreshToken' });
        return;
    }
    try {
        // Находим токен в БД, чтобы получить user_id
        const tokenResult = await db_1.pool.query('SELECT id, user_id FROM refresh_tokens WHERE token = $1 LIMIT 1', [refreshToken]);
        if (tokenResult.rowCount === 0) {
            res.status(401).json({ error: 'Refresh-токен не найден' });
            return;
        }
        const { id: tokenId, user_id: userId } = tokenResult.rows[0];
        // Удаляем refresh-токен
        await db_1.pool.query('DELETE FROM refresh_tokens WHERE id = $1', [tokenId]);
        // Обновляем последнюю запись audit_log (где date_time_out IS NULL)
        await db_1.pool.query(`UPDATE audit_log
       SET date_time_out = NOW()
       WHERE id = (
         SELECT id FROM audit_log
         WHERE user_id = $1 AND date_time_out IS NULL
         ORDER BY date_time_in DESC
         LIMIT 1
       )`, [userId]);
        res.json({ message: 'Выход выполнен успешно' });
    }
    catch (err) {
        console.error('Ошибка при выходе:', err);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
// ─── GET /api/auth/me — текущий пользователь (по access-токену) ─────────────
router.get('/me', auth_1.authenticate, async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ error: 'Не аутентифицирован' });
        return;
    }
    try {
        const result = await db_1.pool.query(`SELECT u.login, r.name AS role,
              un.name AS unit_name,
              e.last_name, e.first_name, e.middle_name,
              p.name AS position_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN employees e ON e.user_id = u.id
       LEFT JOIN units un ON un.id = COALESCE(e.unit_id, u.unit_id)
       LEFT JOIN positions p ON p.id = e.position_id
       WHERE u.id = $1`, [userId]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Пользователь не найден' });
            return;
        }
        const row = result.rows[0];
        const fioParts = [row.last_name, row.first_name, row.middle_name].filter(Boolean);
        const fio = fioParts.length > 0 ? fioParts.join(' ') : null;
        res.json({
            data: {
                login: row.login,
                role: row.role,
                unit_name: row.unit_name,
                position_name: row.position_name,
                fio,
            },
        });
    }
    catch (err) {
        console.error('Ошибка при получении профиля:', err);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
exports.default = router;
