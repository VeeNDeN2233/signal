# Схема базы данных PostgreSQL (проект diplom_signal)

Источник правды: миграции в `backend/migrations/` (`001` … `007`). Тип `SERIAL` в PostgreSQL эквивалентен `INTEGER NOT NULL` с автоинкрементом.

Диаграмма связей сущностей (Mermaid `erDiagram`): раздел **7** в [`project-diagrams.md`](project-diagrams.md) — рендер, например, через [Kroki](https://kroki.io).

Скопируйте этот файл целиком в ChatGPT для контекста по БД.

---

## Обзор таблиц

| Таблица | Назначение |
|---------|------------|
| `roles` | Роли учётной записи: `user`, `admin`, `commander` |
| `users` | Логины, хеш пароля, роль, привязка к подразделению |
| `user_statuses` | Справочник статусов присутствия (налицо, болен, …) |
| `positions` | Справочник должностей |
| `ranks` | Справочник званий |
| `units` | Справочник подразделений |
| `employees` | Карточка сотрудника; связь с `users` (не более одной записи на `user_id`) |
| `audit_log` | Журнал входов/выходов пользователей |
| `raskhod` | Шапка расхода (дата, время 09:00/21:00, взвод) |
| `raskhod_entries` | Строка расхода: сотрудник + статус в этом расходе |
| `alerts` | Объявленная тревога по подразделению |
| `alert_responses` | Отклик сотрудника на тревогу |
| `refresh_tokens` | Refresh-токены JWT |

---

## Таблица `roles`

| Поле | Тип | Ограничения |
|------|-----|-------------|
| `id` | `SERIAL` | `PRIMARY KEY` |
| `name` | `VARCHAR(50)` | `NOT NULL`, `UNIQUE` |

---

## Таблица `users`

| Поле | Тип | Ограничения |
|------|-----|-------------|
| `id` | `SERIAL` | `PRIMARY KEY` |
| `login` | `VARCHAR(100)` | `NOT NULL`, `UNIQUE` |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` |
| `role_id` | `INTEGER` | `NOT NULL`, `REFERENCES roles(id)` |
| `unit_id` | `INTEGER` | `NULL`, `REFERENCES units(id)` (миграция 004) |

Примечание: колонка `user_status_id` добавлялась в 004 и **удалена** в 005 (статус привязан к сотруднику через расход/записи, а не к аккаунту).

---

## Таблица `user_statuses`

| Поле | Тип | Ограничения |
|------|-----|-------------|
| `id` | `SERIAL` | `PRIMARY KEY` |
| `name` | `VARCHAR(100)` | `NOT NULL`, `UNIQUE` |

Типовые значения из сида: `налицо`, `болен`, `наряд`, `командировка`, `отпуск`, `незаконно отсутствует`.

---

## Таблица `positions`

| Поле | Тип | Ограничения |
|------|-----|-------------|
| `id` | `SERIAL` | `PRIMARY KEY` |
| `name` | `VARCHAR(200)` | `NOT NULL`, `UNIQUE` |

---

## Таблица `ranks`

| Поле | Тип | Ограничения |
|------|-----|-------------|
| `id` | `SERIAL` | `PRIMARY KEY` |
| `name` | `VARCHAR(200)` | `NOT NULL`, `UNIQUE` |

---

## Таблица `units`

| Поле | Тип | Ограничения |
|------|-----|-------------|
| `id` | `SERIAL` | `PRIMARY KEY` |
| `name` | `VARCHAR(200)` | `NOT NULL`, `UNIQUE` |

---

## Таблица `employees`

| Поле | Тип | Ограничения |
|------|-----|-------------|
| `id` | `SERIAL` | `PRIMARY KEY` |
| `user_id` | `INTEGER` | `NULL`, `REFERENCES users(id) ON DELETE SET NULL`, **`UNIQUE(user_id)`** (миграция 005: не более одного сотрудника на пользователя) |
| `last_name` | `VARCHAR(100)` | `NOT NULL` |
| `first_name` | `VARCHAR(100)` | `NOT NULL` |
| `middle_name` | `VARCHAR(100)` | `NULL` |
| `position_id` | `INTEGER` | `NULL`, `REFERENCES positions(id)` |
| `rank_id` | `INTEGER` | `NULL`, `REFERENCES ranks(id)` |
| `birth_date` | `DATE` | `NULL` |
| `unit_id` | `INTEGER` | `NOT NULL`, `REFERENCES units(id)` |
| `phone_number` | `VARCHAR(20)` | `NULL` |
| `fcm_token` | `VARCHAR(255)` | `NULL` (токен FCM для push) |

---

## Таблица `audit_log`

| Поле | Тип | Ограничения |
|------|-----|-------------|
| `id` | `SERIAL` | `PRIMARY KEY` |
| `user_id` | `INTEGER` | `NOT NULL`, `REFERENCES users(id)` |
| `date_time_in` | `TIMESTAMPTZ` | `NOT NULL` |
| `date_time_out` | `TIMESTAMPTZ` | `NULL` |

---

## Таблица `raskhod`

| Поле | Тип | Ограничения |
|------|-----|-------------|
| `id` | `SERIAL` | `PRIMARY KEY` |
| `raskhod_time` | `TIME` | `NOT NULL` (ожидаемо 09:00 или 21:00) |
| `raskhod_date` | `DATE` | `NOT NULL` |
| `created_by_user_id` | `INTEGER` | `NOT NULL`, `REFERENCES users(id)` |
| `unit_id` | `INTEGER` | `NOT NULL`, `REFERENCES units(id)` |
| — | — | **`UNIQUE (raskhod_date, raskhod_time, unit_id)`** |

---

## Таблица `raskhod_entries`

| Поле | Тип | Ограничения |
|------|-----|-------------|
| `id` | `SERIAL` | `PRIMARY KEY` |
| `raskhod_id` | `INTEGER` | `NOT NULL`, `REFERENCES raskhod(id)` |
| `employee_id` | `INTEGER` | `NOT NULL`, `REFERENCES employees(id)` |
| `status_id` | `INTEGER` | `NOT NULL`, `REFERENCES user_statuses(id)` |
| — | — | **`UNIQUE (raskhod_id, employee_id)`** (миграция 005) |

---

## Таблица `alerts`

| Поле | Тип | Ограничения |
|------|-----|-------------|
| `id` | `SERIAL` | `PRIMARY KEY` |
| `created_by_user_id` | `INTEGER` | `NOT NULL`, `REFERENCES users(id)` |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, по умолчанию `NOW()` |
| `unit_id` | `INTEGER` | `NOT NULL`, `REFERENCES units(id)` |

---

## Таблица `alert_responses`

| Поле | Тип | Ограничения |
|------|-----|-------------|
| `id` | `SERIAL` | `PRIMARY KEY` |
| `alert_id` | `INTEGER` | `NOT NULL`, `REFERENCES alerts(id)` |
| `employee_id` | `INTEGER` | `NOT NULL`, `REFERENCES employees(id)` |
| `responded_at` | `TIMESTAMPTZ` | `NOT NULL` |
| — | — | **`UNIQUE (alert_id, employee_id)`** |

---

## Таблица `refresh_tokens`

| Поле | Тип | Ограничения |
|------|-----|-------------|
| `id` | `SERIAL` | `PRIMARY KEY` |
| `user_id` | `INTEGER` | `NOT NULL`, `REFERENCES users(id) ON DELETE CASCADE` |
| `token` | `VARCHAR(512)` | `NOT NULL`, `UNIQUE` |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, по умолчанию `NOW()` |

---

## Диаграмма связей (текстом)

- `users.role_id` → `roles.id`
- `users.unit_id` → `units.id` (nullable)
- `employees.user_id` → `users.id` (ON DELETE SET NULL, UNIQUE)
- `employees.position_id` → `positions.id`
- `employees.rank_id` → `ranks.id`
- `employees.unit_id` → `units.id`
- `audit_log.user_id` → `users.id`
- `raskhod.created_by_user_id` → `users.id`
- `raskhod.unit_id` → `units.id`
- `raskhod_entries.raskhod_id` → `raskhod.id`
- `raskhod_entries.employee_id` → `employees.id`
- `raskhod_entries.status_id` → `user_statuses.id`
- `alerts.created_by_user_id` → `users.id`
- `alerts.unit_id` → `units.id`
- `alert_responses.alert_id` → `alerts.id`
- `alert_responses.employee_id` → `employees.id`
- `refresh_tokens.user_id` → `users.id` (ON DELETE CASCADE)

---

## Сиды (справочно, не структура)

- `002_seed.sql`: роли `user`, `admin`, `commander`; статусы присутствия.
- `006_seed_units_employees.sql`: пример подразделений (взводы курса).
- `007_dev_admin.sql`: пользователь `admin` / пароль для dev (см. README).

Для полного дампа данных на своей машине можно выполнить:  
`pg_dump --schema-only` и отдельно `pg_dump --data-only` (без паролей в чат).
