



INSERT INTO users (login, password_hash, role_id, unit_id)
SELECT
  'admin',
  '$2b$10$Z8LFxZ/2V0rmpr9eS.2l6.o.GXMPt0sG.KUbu8hQCE2ISfipgRn56',
  r.id,
  NULL
FROM roles r
WHERE r.name = 'admin'
ON CONFLICT (login) DO NOTHING;
