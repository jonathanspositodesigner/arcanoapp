UPDATE auth.users 
SET encrypted_password = crypt('fidelisibb@gmail.com', gen_salt('bf')),
    updated_at = now(),
    email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE id = 'b8d2000e-89dd-4342-ab6d-17c9ab5a2ad0';

UPDATE public.profiles SET password_changed = false WHERE id = 'b8d2000e-89dd-4342-ab6d-17c9ab5a2ad0';