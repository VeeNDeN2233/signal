// JWT middleware: проверка access-токена и разграничение доступа по ролям
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  sub: string;
  role: string;
  unit_id: number | null;
}

/**
 * Middleware аутентификации.
 * Извлекает Bearer-токен из заголовка Authorization,
 * верифицирует его и добавляет req.user.
 * Возвращает HTTP 401 при отсутствии или невалидном токене.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Токен не предоставлен' });
    return;
  }

  const token = authHeader.slice(7); // убираем "Bearer "
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    res.status(500).json({ error: 'Ошибка конфигурации сервера' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = {
      id: parseInt(payload.sub, 10),
      role: payload.role,
      unit_id: payload.unit_id,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Токен недействителен или истёк' });
  }
}

/**
 * Middleware проверки роли.
 * Возвращает HTTP 403, если роль пользователя не входит в список разрешённых.
 * Должен использоваться после authenticate.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
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
