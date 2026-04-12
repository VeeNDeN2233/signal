-- Миграция 007: учётная запись администратора для разработки / первого входа после развёртывания
-- Логин: admin  Пароль: admin  (только для dev/demo — в продакшене смените пароль или удалите пользователя)
-- Хеш bcrypt (cost 10) для строки "admin", совместим с backend (bcrypt.compare).

INSERT INTO users (login, password_hash, role_id, unit_id)
SELECT
  'admin',
  '$2b$10$Z8LFxZ/2V0rmpr9eS.2l6.o.GXMPt0sG.KUbu8hQCE2ISfipgRn56',
  r.id,
  NULL
FROM roles r
WHERE r.name = 'admin'
ON CONFLICT (login) DO NOTHING;
