import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Загружаем переменные окружения из .env файла
dotenv.config();

// Пул соединений с PostgreSQL
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'signal_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

// Проверка подключения к БД
export async function checkConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('Подключение к PostgreSQL установлено успешно');
  } finally {
    client.release();
  }
}

// Выполнение SQL-миграций из директории migrations/
export async function runMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (!file.endsWith('.sql')) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    console.log(`Применяем миграцию: ${file}`);
    await pool.query(sql);
    console.log(`Миграция ${file} применена`);
  }
}
