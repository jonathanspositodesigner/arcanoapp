ALTER TABLE public.admin_verification_codes 
ADD COLUMN ip_address TEXT,
ADD COLUMN user_agent TEXT;