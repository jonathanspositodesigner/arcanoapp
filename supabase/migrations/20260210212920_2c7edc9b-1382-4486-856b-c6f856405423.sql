-- Add recovery_email column to profiles table for admin 2FA code delivery
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS recovery_email text;

-- Set recovery emails for existing admins
UPDATE public.profiles 
SET recovery_email = 'jonathan.lifecazy@gmail.com' 
WHERE email = 'jonathan@admin.com';

UPDATE public.profiles 
SET recovery_email = 'davidsposito64@gmail.com' 
WHERE email = 'david@admin.com';

UPDATE public.profiles 
SET recovery_email = 'hericanagila53@gmail.com' 
WHERE email = 'herica@admin.com';