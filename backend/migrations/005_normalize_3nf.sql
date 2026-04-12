-- Миграция 005: Приведение к 3НФ
-- 1. user_status_id в users — транзитивная зависимость (статус принадлежит сотруднику, а не аккаунту)
-- 2. employees.user_id — 1 аккаунт = максимум 1 сотрудник
-- 3. raskhod_entries — уникальная пара (расход, сотрудник)
-- Повторный запуск безопасен (Docker / локальные перезапуски).

ALTER TABLE users DROP COLUMN IF EXISTS user_status_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public' AND t.relname = 'employees' AND c.conname = 'employees_user_id_unique'
  ) THEN
    ALTER TABLE employees
      ADD CONSTRAINT employees_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public' AND t.relname = 'raskhod_entries' AND c.conname = 'raskhod_entries_raskhod_employee_unique'
  ) THEN
    ALTER TABLE raskhod_entries
      ADD CONSTRAINT raskhod_entries_raskhod_employee_unique
      UNIQUE (raskhod_id, employee_id);
  END IF;
END $$;
