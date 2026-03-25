// Роуты тревоги (только commander)
import { Router, Request, Response } from 'express';
import { pool } from '../db';
import * as admin from 'firebase-admin';

const router = Router();

/**
 * Инициализация Firebase Admin SDK (один раз при первом использовании).
 * Ожидает переменную окружения GOOGLE_APPLICATION_CREDENTIALS (путь к service account JSON)
 * или FIREBASE_SERVICE_ACCOUNT_JSON (содержимое JSON в виде строки).
 */
function getFirebaseApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  let credential: admin.credential.Credential;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    credential = admin.credential.cert(serviceAccount);
  } else {
    // Использует GOOGLE_APPLICATION_CREDENTIALS или Application Default Credentials
    credential = admin.credential.applicationDefault();
  }

  return admin.initializeApp({ credential });
}

// POST /api/alerts — объявить тревогу
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const created_by_user_id = req.user!.id;
  const unit_id = req.user!.unit_id;

  if (!unit_id) {
    res.status(400).json({ error: 'Подразделение пользователя не определено' });
    return;
  }

  const client = await pool.connect();
  try {
    // Создаём запись тревоги
    const alertResult = await client.query(
      `INSERT INTO alerts (created_by_user_id, unit_id)
       VALUES ($1, $2)
       RETURNING id, created_by_user_id, unit_id, created_at`,
      [created_by_user_id, unit_id]
    );
    const alert = alertResult.rows[0];

    // Получаем FCM-токены всех сотрудников подразделения
    const tokensResult = await client.query(
      `SELECT id, fcm_token FROM employees
       WHERE unit_id = $1 AND fcm_token IS NOT NULL AND fcm_token <> ''`,
      [unit_id]
    );

    // Отправляем push-уведомления асинхронно, не блокируя ответ
    if (tokensResult.rows.length > 0) {
      sendFcmNotifications(alert.id, tokensResult.rows).catch((err) => {
        console.error('Критическая ошибка при отправке FCM-уведомлений:', err);
      });
    }

    res.status(201).json({
      data: {
        id: alert.id,
        created_by_user_id: alert.created_by_user_id,
        unit_id: alert.unit_id,
        created_at: alert.created_at,
      },
    });
  } catch (err) {
    console.error('Ошибка при создании тревоги:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  } finally {
    client.release();
  }
});

/**
 * Отправляет FCM push-уведомления каждому устройству из списка.
 * Ошибки доставки для конкретного устройства логируются, но не прерывают отправку остальным.
 */
async function sendFcmNotifications(
  alertId: number,
  employees: Array<{ id: number; fcm_token: string }>
): Promise<void> {
  const app = getFirebaseApp();
  const messaging = app.messaging();

  const sends = employees.map(async (emp) => {
    try {
      await messaging.send({
        token: emp.fcm_token,
        notification: {
          title: 'ТРЕВОГА',
          body: 'Объявлена тревога. Немедленно подтвердите получение сигнала.',
        },
        data: {
          alert_id: String(alertId),
          type: 'alert',
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'alert_channel',
            sound: 'alarm',
          },
        },
      });
    } catch (err) {
      console.error(
        `FCM: ошибка доставки сотруднику id=${emp.id}, token=${emp.fcm_token}:`,
        err
      );
    }
  });

  await Promise.allSettled(sends);
}

export default router;
