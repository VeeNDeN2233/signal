"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Токен не предоставлен' });
        return;
    }
    const token = authHeader.slice(7);
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
        res.status(500).json({ error: 'Ошибка конфигурации сервера' });
        return;
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, secret);
        req.user = {
            id: parseInt(payload.sub, 10),
            role: payload.role,
            unit_id: payload.unit_id,
        };
        next();
    }
    catch {
        res.status(401).json({ error: 'Токен недействителен или истёк' });
    }
}
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Не аутентифицирован' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Недостаточно прав' });
            return;
        }
        next();
    };
}
