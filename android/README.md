# Android-клиент: Система учёта личного состава

## Что реализовано

- Полноценный Gradle-проект в `android/` (Kotlin + Android App module `app`)
- **`LoginActivity`** — вход по логину и паролю через `POST /api/auth/login`, регистрация FCM-токена
- Хранение `access/refresh` токенов в `SharedPreferences` (`TokenStorage`)
- **`AuthHeaderInterceptor`** (OkHttp) — автоматическая подстановка `Authorization: Bearer ...`
- **`RefreshTokenAuthenticator`** (OkHttp) — автоматическое обновление access-токена через `POST /api/auth/refresh`
- **`HomeActivity`** — главный экран с профилем сотрудника: ФИО, звание, должность, подразделение (загружается с `GET /api/employees/me`). Кнопка выхода.
- **`MyFirebaseMessagingService`** — приём FCM data payload (`type=alert`, `alert_id=<id>`), запуск `AlarmPlayerService`, открытие `AlertActivity`
- **`AlarmPlayerService`** — foreground service, воспроизводит системный alarm tone по кругу
- **`AlertActivity`** — полноэкранный экран тревоги с кнопкой «Принял» → `POST /api/alerts/:id/respond`
- **Offline-очередь** (Room + WorkManager):
  - `AppDatabase`, `QueuedAlertResponse`, `QueuedAlertResponseDao` — локальная БД
  - `AlertResponseQueue` — сохранение ответа при отсутствии сети
  - `AlertSyncWorker` + `AlertSyncScheduler` — отправка при восстановлении соединения
- Зависимости: Retrofit, OkHttp, Moshi (KotlinJsonAdapterFactory), Firebase Messaging, Room (KSP), WorkManager

## Как запустить в Android Studio

1. Откройте Android Studio → **Open** → выберите папку `android`.
2. Дождитесь **Gradle Sync** (Studio скачает Gradle/JDK при необходимости).
3. Создайте/выберите Android Emulator (например Pixel + API 34/35).
4. Запустите backend на хосте:
   - в `backend/`: `npm run dev`
5. Нажмите **Run** в Android Studio.

## Настройка Firebase (обязательно для FCM)

1. Создайте Firebase project и Android app с package name:
   - `com.example.personnelaccounting`
2. Скачайте `google-services.json`.
3. Положите файл сюда:
   - `android/app/google-services.json`
4. Для серверной отправки push-уведомлений положите файл сервисного аккаунта Firebase Admin SDK (`*.json`) в `backend/` и укажите путь в переменной окружения `GOOGLE_APPLICATION_CREDENTIALS` (файл `.env`).
5. Нажмите **Sync Project with Gradle Files**.
6. Запустите приложение.

> `google-services.json` добавлен в `.gitignore`, чтобы не утекали ключи. Без этого файла приложение запускается, но реальный FCM push работать не будет.

## Настройка сети

В `ApiClient.kt` указан `BASE_URL`:

| Сценарий | Значение BASE_URL |
|----------|-------------------|
| Android Emulator → localhost хоста | `http://10.0.2.2:3000/` (текущее значение) |
| Реальный телефон в локальной сети | `http://192.168.1.XXX:3000/` (IP компьютера) |
| Удалённый сервер (VPS) | `https://your-domain.com/` |
| Ngrok-тоннель | `https://xxxx.ngrok-free.app/` |

Для реального устройства в локальной сети:
1. Измените `BASE_URL` в `ApiClient.kt` на IP вашего компьютера.
2. Убедитесь, что телефон и компьютер в одной сети.
3. Проверьте, что firewall на компьютере не блокирует порт 3000.

## Тест входа

- Логин/пароль должен существовать в БД (`users` + хэш пароля).
- После успешного входа откроется экран `HomeActivity` с профилем сотрудника.
- Кнопка «Выйти» удаляет токены и возвращает на логин.

## Тест тревоги

Через реальный FCM (рекомендуется):
1. Настройте Firebase (см. выше).
2. Войдите в приложение — FCM-токен автоматически зарегистрируется на сервере.
3. Объявите тревогу через Web App (кнопка «Объявить тревогу» на странице командира).
4. На телефоне сработает звуковой сигнал и откроется экран тревоги.
5. Нажмите «Принял» — ответ отправится на сервер.

При отсутствии сети ответ сохранится в локальной БД и будет отправлен автоматически при восстановлении соединения.

## Сборка APK для демонстрации

1. В Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
2. APK будет в `android/app/build/outputs/apk/debug/app-debug.apk`.
3. Перед установкой APK на устройстве включите «Установка из неизвестных источников».
4. Не забудьте изменить `BASE_URL` на адрес, доступный с реального устройства.
