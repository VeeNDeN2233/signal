-- Миграция 005: Приведение к 3НФ
-- 1. user_status_id в users — транзитивная зависимость (статус принадлежит сотруднику, а не аккаунту)
-- 2. employees.user_id без UNIQUE — допускает привязку одного аккаунта к нескольким сотрудникам
-- 3. raskhod_entries без UNIQUE(raskhod_id, employee_id) — допускает дублирование записей

-- 1. Удалить user_status_id из users
ALTER TABLE users DROP COLUMN IF EXISTS user_status_id;

-- 2. UNIQUE на employees.user_id (1 аккаунт = максимум 1 сотрудник)
ALTER TABLE employees
  ADD CONSTRAINT employees_user_id_unique UNIQUE (user_id);

-- 3. UNIQUE на raskhod_entries(raskhod_id, employee_id)
ALTER TABLE raskhod_entries
  ADD CONSTRAINT raskhod_entries_raskhod_employee_unique
  UNIQUE (raskhod_id, employee_id);
