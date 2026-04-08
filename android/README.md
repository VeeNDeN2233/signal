# Android client (testable in Android Studio)

## Что уже сделано

- Полноценный Gradle-проект в `android/` (Kotlin + Android App module `app`)
- `LoginActivity` с вызовом `POST /api/auth/login`
- Хранение `access/refresh` токенов в `SharedPreferences`
- `OkHttp` interceptor + authenticator для автоматического refresh через `POST /api/auth/refresh`
- Простая `HomeActivity` после успешного входа
- Зависимости по чеклисту: Retrofit, OkHttp, Firebase Messaging, Room, WorkManager

## Как запустить в Android Studio

1. Открой Android Studio → **Open** → выбери папку `android`.
2. Дождись **Gradle Sync** (Studio скачает Gradle/JDK при необходимости).
3. Создай/выбери Android Emulator (например Pixel + API 34/35).
4. Запусти backend на хосте (Windows):
   - в `backend/`: `npm run dev`
5. Нажми **Run** в Android Studio.

## Настройка Firebase (для реального FCM)

1. Создай Firebase project и Android app с package name:
   - `com.example.personnelaccounting`
2. Скачай `google-services.json`.
3. Положи файл сюда:
   - `android/app/google-services.json`
4. Нажми **Sync Project with Gradle Files**.
5. Запусти приложение.

Примечание:
- `google-services.json` добавлен в `.gitignore`, чтобы не утекали ключи.
- Без этого файла приложение тоже запускается, но реальный FCM push работать не будет.

## Важно для сети

В `ApiClient.kt` уже указан base URL:

- `http://10.0.2.2:3000/`

Это правильный адрес для обращения **из Android Emulator к localhost хоста**.

## Тест входа

- Логин/пароль должен существовать в твоей БД (`users` + хэш пароля).
- После успешного входа откроется экран `HomeActivity`.
- Кнопка «Выйти» удаляет токены и возвращает на логин.

## Тест “будильника” (тревоги)

Реализовано:

- `MyFirebaseMessagingService` принимает FCM data payload с полями `type=alert`, `alert_id=<id>`
- запускается `AlarmPlayerService` как foreground service и начинает играть **системный alarm tone по кругу**
- открывается `AlertActivity` поверх экрана (full-screen)

Чтобы проверить вживую через FCM, нужен настроенный Firebase project и `google-services.json` (см. раздел выше).

Проверка без Firebase:

- После логина на экране `HomeActivity` есть кнопка **«Симулировать тревогу»**.
- Она запускает тот же сценарий: foreground alarm service + `AlertActivity`.
- Так можно проверить громкость/цикличность будильника и отправку/оффлайн-очередь без FCM.

