# Учёт личного состава

Веб-приложение для администратора и руководителя подразделения, REST API на Node.js и PostgreSQL. Отдельно в репозитории лежит клиент под Android (см. [android/README.md](android/README.md)).

**Роли в системе**

| Роль | Где используется |
|------|------------------|
| Администратор | Веб: справочники, личный состав, учётные записи, журнал событий |
| Руководитель | Веб: расход, тревога, истории |
| Сотрудник (user) | В первую очередь под мобильное приложение и отклики на тревогу |

---

## Состав репозитория

| Каталог / файл | Назначение |
|----------------|------------|
| [backend/](backend/) | Express API, TypeScript → `dist`, SQL-миграции в `migrations/`, вспомогательные скрипты в `scripts/` |
| [web/](web/) | React (Vite), SPA; в продакшен-сборке запросы к API идут на тот же хост по пути `/api` |
| [android/](android/) | Нативный клиент (настройка и сборка — в своём README) |
| [docker-compose.yml](docker-compose.yml) | PostgreSQL, одноразовый контейнер миграций, API, nginx с фронтом |
| [env.example](env.example) | Шаблон переменных для Docker и для ручного копирования в `.env` |
| [scripts/bootstrap-env.js](scripts/bootstrap-env.js) | Создаёт корневой `.env` с случайными JWT, если файла ещё нет |
| [package.json](package.json) в корне | Скрипты `bootstrap:env`, `install:all`, `dev` (параллельно backend + web) |

---

## Требования к окружению

**Вариант A — только Docker**

- Docker Engine с поддержкой Compose V2 (например Docker Desktop под Windows/macOS).
- Свободные порты по умолчанию: **8080** (веб), **3000** (API), внутренний порт Postgres не наружу не пробрасывается.

**Вариант B — разработка без Docker**

- **Node.js** 20+ (как в [backend/Dockerfile](backend/Dockerfile)).
- **PostgreSQL** 16+ (версия образа в compose — 16-alpine).
- Два терминала или корневой `npm run dev` после `npm install` в корне.

---

## Запуск из репозитория в Docker

Ниже порядок «склонировал → открыл браузер». Предполагается, что команды выполняются **из корня клона** (там же, где лежит `docker-compose.yml`).

### Шаг 1. Переменные окружения

API **не стартует** без непустых `JWT_ACCESS_SECRET` и `JWT_REFRESH_SECRET`: это зашито в [docker-compose.yml](docker-compose.yml) через синтаксис `${VAR:?…}`.

**Удобный способ:** один раз выполнить:

```bash
node scripts/bootstrap-env.js
```

Скрипт создаёт файл **`.env`** в корне (если его ещё нет): копирует [env.example](env.example) и подставляет два случайных 64-символьных hex-секрета для JWT. Уже существующий `.env` **не трогает** — тогда правьте секреты вручную или временно переименуйте файл и запустите скрипт снова.

**Вручную:** скопировать `env.example` в `.env` и заменить строки `JWT_*` на длинные случайные значения (в Unix-оболочке: `openssl rand -hex 32`).

Файл `.env` в `.gitignore` — в Git он не попадает.

### Шаг 2. Поднять стек

```bash
docker compose up --build
```

Что происходит по цепочке:

1. **postgres** — база; healthcheck `pg_isready`.
2. **migrate** — один запуск `node` с вызовом `runMigrations()`: по очереди выполняются все файлы `backend/migrations/*.sql` в алфавитном порядке. Контейнер завершается с кодом 0 или падает с ошибкой (тогда API не стартует).
3. **api** — `node dist/index.js`, порт на хосте из `API_PORT` (по умолчанию 3000). Есть healthcheck на `GET /health`.
4. **web** — nginx раздаёт статику из сборки Vite и проксирует **`/api`** на сервис `api`. Старт **web** привязан к состоянию **healthy** у `api`, чтобы реже ловить 502 сразу после старта.

### Шаг 3. Открыть интерфейс

- Веб: **http://localhost:8080** (или порт из `WEB_PORT` в `.env`).
- API напрямую: **http://localhost:3000** — например `GET /health` должен вернуть JSON со статусом.

### Шаг 4. Вход в админку

После миграций в базе есть пользователь с логином **`admin`** и паролем **`admin`** (см. [backend/migrations/007_dev_admin.sql](backend/migrations/007_dev_admin.sql)). Это сделано для первого входа и демонстрации; на публичном сервере пароль нужно сменить или завести администратора иначе.

### Остановка и сброс данных

```bash
docker compose down
```

Полностью удалить том с данными Postgres (чистая база при следующем `up`):

```bash
docker compose down -v
```

---

## Переменные в `.env`

Имеет смысл держать в `.env` то, что уже перечислено в [env.example](env.example):

| Переменная | Значение по умолчанию в шаблоне | Заметки |
|------------|----------------------------------|---------|
| `DB_USER`, `DB_PASSWORD`, `DB_NAME` | postgres / postgres / signal_db | Должны совпадать с тем, что ожидает сервис `postgres` в compose |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | в шаблоне заглушки; bootstrap подставляет случайные | Без них `api` не поднимется |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | 15m / 7d | Опционально менять |
| `API_PORT`, `WEB_PORT` | 3000 / 8080 | Проброс на хост |

Остальные переменные API (например Firebase) в `env.example` не перечислены — их добавляют при необходимости в `.env` и при желании в секцию `environment` сервиса `api` в compose.

---

## Демо-данные: курсы и люди

Скрипт [backend/scripts/seed_populate.js](backend/scripts/seed_populate.js) создаёт три «курса», у каждого — начальник курса и командир взвода (роль commander в БД) плюс курсанты. **Пароль каждого созданного пользователя совпадает с его логином**; логины печатаются в stdout.

Запуск **внутри уже поднятого** стека (из корня репозитория):

```bash
docker compose exec api node scripts/seed_populate.js
```

Перед запуском убедитесь, что контейнер `api` работает и миграции прошли.

Скрипт удаляет из БД подразделения **все, кроме** единицы с именем «Тестовое подразделение» (если такая строка есть), затем наполняет данные заново в рамках своей логики. Если вам нужны старые взводы из миграций — прочитайте начало скрипта перед прогоном на проде.

Проверка, что в образе API лежат скрипты:

```bash
docker compose run --rm api ls /app/scripts
```

Локально без Docker:

```bash
cd backend
node scripts/seed_populate.js
```

Пароль к Postgres по умолчанию в скрипте берётся из `DB_PASSWORD` или **`postgres`**, чтобы совпадать с шаблоном Docker.

---

## Локальная разработка без Docker

1. Создать БД в Postgres (имя как в `.env`, по умолчанию `signal_db`).
2. В каталоге `backend`: `npm install` → `npm run build` → **`npm run migrate`** → `npm run dev` (порт API из `PORT` в `.env`, по умолчанию 3000).
3. В каталоге `web`: `npm install` → `npm run dev` — Vite поднимает дев-сервер и проксирует `/api` на `http://localhost:3000` (см. [web/vite.config.ts](web/vite.config.ts)).

**Важно про `.env`:** `dotenv` в backend подгружает файл **из текущего рабочего каталога процесса Node**, а не автоматически из папки `backend/`.

- Запуск **`cd backend && npm run dev`** → кладите **`backend/.env`**.
- Запуск **`npm run dev` из корня** через [корневой `package.json`](package.json) (`--prefix backend`) → обычно рабочий каталог — **корень репозитория**, читается **корневой** `.env` (удобно, если тот же файл используется для Docker).

Из корня один раз поставить зависимости backend и web и гонять оба процесса:

```bash
npm install
npm run install:all
npm run dev
```

Перед этим в корне должен быть `.env` с `DB_*` и `JWT_*` (например после `node scripts/bootstrap-env.js` плюс ручное дописывание `DB_HOST=localhost` если нужно).

---

## Push-уведомления при тревоге

Отправка push через Firebase Cloud Messaging включается, если задана переменная **`FIREBASE_SERVICE_ACCOUNT_JSON`** — строка с JSON сервисного аккаунта Google (как одна строка). Код читает её в [backend/src/routes/alerts.ts](backend/src/routes/alerts.ts). В [docker-compose.yml](docker-compose.yml) эта переменная не прописана: добавьте её в `environment` сервиса `api` или подайте через механизм секретов вашей платформы.

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

Сборка, эмулятор и связь с API описаны в [android/README.md](android/README.md).

---

## Краткий чеклист перед показом диплома с нуля

1. `git clone …`
2. `node scripts/bootstrap-env.js` (или свой `.env`)
3. `docker compose up --build`
4. Браузер: `http://localhost:8080` → `admin` / `admin`
5. По желанию: `docker compose exec api node scripts/seed_populate.js` и вход под логином руководителя из вывода скрипта

Отдельного файла LICENSE в репозитории нет — условия распространения при необходимости добавьте сами.
