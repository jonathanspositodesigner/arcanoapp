CREATE TABLE public.cinema_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  cover_url text,
  scenes jsonb NOT NULL DEFAULT '[]'::jsonb,
  active_scene_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cinema_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_projects" ON public.cinema_projects
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_cinema_projects_user_id ON public.cinema_projects(user_id);