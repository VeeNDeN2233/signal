import express from 'express';
import * as dotenv from 'dotenv';
import { checkConnection } from './db';
import authRouter from './routes/auth';
import usersRouter from './routes/admin/users';
import employeesRouter from './routes/admin/employees';
import * as referencesRouter from './routes/admin/references';
import { authenticate, requireRole } from './middleware/auth';
import raskhodRouter from './routes/raskhod';
import alertsRouter from './routes/alerts';

// Загружаем переменные окружения
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware для парсинга JSON
app.use(express.json());

// Базовый маршрут для проверки работоспособности
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Сервер работает' });
});

// Маршруты аутентификации
app.use('/api/auth', authRouter);

// Административные маршруты (только admin)
app.use('/api/users', authenticate, requireRole('admin'), usersRouter);
app.use('/api/employees', authenticate, requireRole('admin'), employeesRouter);
app.use('/api/positions', authenticate, requireRole('admin'), referencesRouter.positions);
app.use('/api/ranks', authenticate, requireRole('admin'), referencesRouter.ranks);
app.use('/api/units', authenticate, requireRole('admin'), referencesRouter.units);
app.use('/api/user-statuses', authenticate, requireRole('admin'), referencesRouter.userStatuses);

// Маршруты расхода личного состава (только commander)
app.use('/api/raskhod', authenticate, requireRole('commander'), raskhodRouter);

// Маршруты тревоги (роли проверяются на уровне каждого маршрута)
app.use('/api/alerts', authenticate, alertsRouter);

// Запуск сервера
async function start(): Promise<void> {
  try {
    // Проверяем подключение к БД перед запуском
    await checkConnection();

    app.listen(PORT, () => {
      console.log(`Сервер запущен на порту ${PORT}`);
    });
  } catch (error) {
    console.error('Ошибка при запуске сервера:', error);
    process.exit(1);
  }
}

start();

export default app;
