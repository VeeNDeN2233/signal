




INSERT INTO units (name) VALUES
  ('1 курс'),
  ('2 курс'),
  ('3 курс'),
  ('4 курс'),
  ('5 курс')
ON CONFLICT (name) DO NOTHING;


DELETE FROM units
WHERE name NOT IN ('1 курс', '2 курс', '3 курс', '4 курс', '5 курс');
