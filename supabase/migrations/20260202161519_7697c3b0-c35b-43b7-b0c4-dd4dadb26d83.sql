-- Primeiro, remover a constraint UNIQUE em platform 
-- para permitir múltiplos templates por plataforma (com locales diferentes)
ALTER TABLE welcome_email_templates DROP CONSTRAINT IF EXISTS welcome_email_templates_platform_key;

-- Criar nova constraint UNIQUE em (platform, locale) para evitar duplicatas
ALTER TABLE welcome_email_templates ADD CONSTRAINT welcome_email_templates_platform_locale_key UNIQUE (platform, locale);

-- Inserir template ES para ferramentas_ia (Hotmart)
INSERT INTO welcome_email_templates (
  platform, 
  locale, 
  subject, 
  sender_name, 
  sender_email, 
  content, 
  is_active
) VALUES (
  'ferramentas_ia',
  'es', 
  '🤖 ¡Bienvenido! Tu Herramienta de IA está lista para usar',
  'Herramientas IA Arcanas',
  'contato@voxvisual.com.br',
  '{"heading":"¡Tu Herramienta de IA está Activada!","intro":"¡Tu compra fue confirmada con éxito! Ahora tienes acceso ilimitado a esta poderosa herramienta de Inteligencia Artificial.","button_text":"Acceder a Mi Herramienta","footer":"¡Si tienes alguna duda, responde este email y te ayudaremos!","heading_returning":"🎉 ¡Compra Confirmada!","intro_returning":"Tu compra fue confirmada exitosamente. Ya tienes acceso en tu cuenta.","access_note":"Usa tu email y contraseña actuales para ingresar.","forgot_password":"¿Olvidaste tu contraseña?"}',
  true
);