# Учёт личного состава (Signal)

Веб‑приложение для администратора и руководителя подразделения + REST API на Node.js + PostgreSQL.  
Эта инструкция описывает **только** развёртывание через **Docker** (рекомендуемый и самый воспроизводимый способ).

---

## Что получится в итоге

- **Веб**: `http://localhost:8080`
- **API**: `http://localhost:3000/health`
- **Вход в админку**: **`admin` / `admin`** (создаётся миграцией)

---

## Развёртывание на Windows 10 “с нуля” (PowerShell)

Инструкция рассчитана на “неподготовленный” ПК. Делайте шаги по порядку.

### Шаг 0. Требования

- Windows 10 x64
- Доступ администратора (нужен для WSL2 и Docker Desktop)
- Свободные порты: **8080** и **3000**

### Шаг 1. Включить виртуализацию и WSL2

1) Если Docker Desktop ругается на Virtualization — включите виртуализацию в BIOS/UEFI.

2) Откройте PowerShell **от имени администратора** и выполните:

```powershell
wsl --install
```

Перезагрузите ПК.

### Шаг 2. Установить Docker Desktop

Установите Docker Desktop по официальной инструкции:  
[Install Docker Desktop on Windows](https://docs.docker.com/desktop/setup/install/windows-install/)

Запустите Docker Desktop и дождитесь, пока он будет в состоянии “running”.

Проверка в PowerShell:

```powershell
docker --version
docker compose version
```

### Шаг 3. Установить Git

Установите Git для Windows. Проверка:

```powershell
git --version
```

### Шаг 4. Склонировать репозиторий

```powershell
git clone <URL_репозитория>
cd signal
```

### Шаг 5. Создать `.env` (обязательно для JWT)

API **не стартует** без непустых `JWT_ACCESS_SECRET` и `JWT_REFRESH_SECRET` (это проверяется прямо в `docker-compose.yml`).

#### Вариант A (проще): с Node.js

Установите Node.js (LTS) и проверьте:

```powershell
node -v
```

Затем в корне проекта:

```powershell
node scripts/bootstrap-env.js
```

Скрипт создаст `.env` в корне (если файла ещё нет) и подставит случайные JWT‑секреты.

#### Вариант B (без Node.js): вручную

Скопируйте `env.example` → `.env` и замените `JWT_*` на длинные случайные строки (минимум 32 символа):

```powershell
Copy-Item env.example .env
```

Откройте `.env` и задайте `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`.

### Шаг 6. Поднять приложение в Docker

```powershell
docker compose up --build -d
```

Проверить статус:

```powershell
docker compose ps
```

Логи (если что‑то не стартовало):

```powershell
docker compose logs --tail 200
```

### Шаг 7. Проверить работоспособность

API healthcheck:

```powershell
(Invoke-WebRequest -UseBasicParsing http://localhost:3000/health).Content
```

Веб:

- откройте `http://localhost:8080`
- войдите **`admin` / `admin`**

### Шаг 8 (опционально). Заполнить демо‑данными

Скрипт создаёт 5 курсов (`1 курс`…`5 курс`), у каждого начальник курса + командир взвода + курсанты. Пароль каждого созданного пользователя = его логин.

```powershell
docker compose exec -T api node scripts/seed_populate.js
```

---

## Остановка / запуск / полный сброс данных

Остановить:

```powershell
docker compose down
```

Запустить снова:

```powershell
docker compose up -d
```

Полностью сбросить базу (удалить том Postgres) и поднять “с нуля”:

```powershell
docker compose down -v
docker compose up --build -d
```

---

## Обновление проекта (после `git pull`)

```powershell
git pull
docker compose up --build -d
```

Если менялись миграции и вы хотите пересоздать БД — используйте `docker compose down -v`.

---

## Типичные проблемы (Docker)

| Симптом | Что делать |
|---------|------------|
| `missing_JWT_*` при `docker compose up` | Создайте `.env` и задайте `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` (шаг 5) |
| `Error response from daemon: No such image: postgres:16-alpine` | `docker pull postgres:16-alpine`, затем `docker compose up --build -d` |
| `502` на `/api` сразу после старта | Подождите 10–20 секунд: `api` должен стать `healthy` |
| В логах Postgres `locale: not found` / `no usable system locales` | Для `postgres:alpine` это обычное предупреждение и на работу приложения не влияет |

---

## Push-уведомления при тревоге

Отправка push через Firebase Cloud Messaging включается, если задана переменная **`FIREBASE_SERVICE_ACCOUNT_JSON`** — строка с JSON сервисного аккаунта Google (как одна строка). Код читает её в [backend/src/routes/alerts.ts](backend/src/routes/alerts.ts). В [docker-compose.yml](docker-compose.yml) эта переменная не прописана: добавьте её в `environment` сервиса `api` или подайте через механизм секретов вашей платформы.

Если на **дату объявления тревоги** (календарный день по времени сервера) для взвода уже есть **расход**, push не уходит на телефоны сотрудников, у которых в **последнем за этот день** расходе (09:00 или 21:00) статус **не** «налицо». При отсутствии расхода на эту дату рассылка по-прежнему всем с заполненным FCM-токеном.

---

## Миграции

Файлы лежат в [backend/migrations/](backend/migrations/). При каждом `docker compose up` контейнер **migrate** заново прогоняет **весь** набор файлов по порядку имени. Схема и сиды рассчитаны на идемпотентность там, где это критично (например `CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, проверки ограничений в `005`).

Локально после изменения SQL или на новой машине:

```bash
cd backend
npm run build
npm run migrate
```

Скрипт `migrate` в [backend/package.json](backend/package.json) завершает процесс с ненулевым кодом при ошибке SQL.

---

## End-to-end тесты веба

В каталоге `web` при установленных зависимостях:

```bash
cd web
npm run test:e2e
```

Тесты используют Playwright и подмену ответов API; живой Postgres для них не обязателен. Подробности — в [web/package.json](web/package.json) и конфигурации Playwright в `web/`.

---

## Типичные проблемы

| Симптом | Что проверить |
|---------|----------------|
| Compose ругается на `missing_JWT_*` | Есть ли `.env` в корне с непустыми `JWT_ACCESS_SECRET` и `JWT_REFRESH_SECRET` |
| Backend в dev не видит переменные | Откуда запущен `npm run dev` и где лежит `.env` (см. раздел про рабочий каталог) |
| Пустая админка / нет входа | Прошли ли миграции; есть ли пользователь `admin` (миграция `007`) |
| 502 на `/api` сразу после старта | Подождать несколько секунд; healthcheck `api` должен стать healthy до старта `web` |
| Сид в Docker падает с «cannot find module» | Пересобрать образ `api`: в runtime-образе должен быть каталог `/app/scripts` ([backend/Dockerfile](backend/Dockerfile)) |

---

## Android

Каталог [android/](android/). Сборка APK (Android Studio или командная строка с установленным JDK 17 и Android SDK).

### Телефон и ваш Wi‑Fi (API на ПК или в локальной сети)

1. Поднимите backend так, чтобы порт **3000** был доступен в LAN (например `docker compose` с пробросом `3000`, или `npm run dev` в `backend`).
2. В каталоге `android` в файле **`local.properties`** (создаётся Android Studio или вручную; в `.gitignore`) добавьте строку с **обязательным** слэшем в конце. Пример для API на ПК с адресом **192.168.1.186**:

   ```properties
   API_BASE_URL=http://192.168.1.186:3000/
   ```

   Если IP другой — замените только хост; порт меняйте только если API слушает не `3000`.

4. Соберите APK из корня `android`:

   ```powershell
   cd android
   .\gradlew.bat assembleDebug
   ```

   Готовый файл: `android/app/build/outputs/apk/debug/app-debug.apk` — скопируйте на телефон и откройте для установки (разрешите установку из неизвестных источников для этого приложения).

Эмулятор без `API_BASE_URL` использует по умолчанию `http://10.0.2.2:3000/` (localhost хоста).

**Брандмауэр Windows:** разрешите входящие подключения на порт 3000 для `java.exe` / Docker, иначе телефон не достучится до API.

---

## Краткий чеклист перед показом диплома с нуля

1. `git clone …`
2. `node scripts/bootstrap-env.js` (или свой `.env`)
3. `docker compose up --build`
4. Браузер: `http://localhost:8080` → `admin` / `admin`
5. По желанию: `docker compose exec api node scripts/seed_populate.js` и вход под логином руководителя из вывода скрипта

Условия использования см. [LICENSE](LICENSE).
