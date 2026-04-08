-- Миграция 004: Добавление unit_id и user_status_id в таблицу users
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES units(id),
    ADD COLUMN IF NOT EXISTS user_status_id INTEGER REFERENCES user_statuses(id);

-- Исправление внешнего ключа employees.user_id: при удалении пользователя
-- запись сотрудника остаётся, но поле user_id обнуляется (SET NULL)
ALTER TABLE employees
    DROP CONSTRAINT IF EXISTS employees_user_id_fkey,
    ADD CONSTRAINT employees_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
