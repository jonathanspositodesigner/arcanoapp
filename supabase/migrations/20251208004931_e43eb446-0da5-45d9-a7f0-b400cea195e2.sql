-- Add password_changed flag to profiles table to track first login
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS password_changed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS bio text;

-- Create policy for users to update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);