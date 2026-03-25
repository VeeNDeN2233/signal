import express from 'express';
import * as dotenv from 'dotenv';
import { checkConnection } from './db';
import authRouter from './routes/auth';

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
