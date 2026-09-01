UPDATE app_user
SET role = 'admin', updated_at = now()
WHERE lower(email) = 'ajgarciarias@gmail.com';
