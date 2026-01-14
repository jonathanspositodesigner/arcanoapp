-- Add locale column to welcome_email_templates
ALTER TABLE welcome_email_templates ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'pt';

-- Add locale column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'pt';

-- Add locale column to welcome_email_logs
ALTER TABLE welcome_email_logs ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'pt';

-- Insert Spanish templates for each platform
INSERT INTO welcome_email_templates (platform, locale, subject, sender_name, sender_email, is_active, content)
VALUES 
  ('promptverso', 'es', '¡Bienvenido a ArcanoApp - Tu acceso está listo!', 'ArcanoApp', 'contato@arcanolab.com.br', true, '{"heading": "¡Bienvenido a ArcanoApp!", "intro": "Tu acceso a la Biblioteca de Prompts de IA está listo.", "button_text": "Acceder Ahora", "footer": "¡Explora miles de prompts profesionales!"}'),
  ('artes', 'es', '¡Bienvenido a la Biblioteca de Artes Arcanas!', 'Artes Arcanas', 'contato@arcanolab.com.br', true, '{"heading": "¡Bienvenido a Artes Arcanas!", "intro": "Tu acceso a la Biblioteca de Artes está listo.", "button_text": "Acceder Ahora", "footer": "¡Explora cientos de artes profesionales!"}'),
  ('ferramentas_ia', 'es', '¡Tu Herramienta de IA está Activada!', 'ArcanoApp', 'contato@arcanolab.com.br', true, '{"heading": "¡Herramienta Activada!", "intro": "Tu acceso a la herramienta de IA está listo.", "button_text": "Usar Ahora", "footer": "¡Disfruta de tu nueva herramienta!"}'),
  ('musicos', 'es', '¡Bienvenido a Artes para Músicos!', 'Artes para Músicos', 'contato@arcanolab.com.br', true, '{"heading": "¡Bienvenido!", "intro": "Tu acceso a la Biblioteca de Artes para Músicos está listo.", "button_text": "Acceder Ahora", "footer": "¡Explora artes exclusivas para músicos!"}')
ON CONFLICT DO NOTHING;