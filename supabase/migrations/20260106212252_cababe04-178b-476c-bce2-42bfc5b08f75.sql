-- Inserir template de email para ferramentas de IA
INSERT INTO welcome_email_templates (platform, subject, sender_name, sender_email, content, is_active)
VALUES (
  'ferramentas_ia',
  '🤖 Bem-vindo! Sua Ferramenta de IA está pronta para uso!',
  'Ferramentas IA Arcanas',
  'contato@voxvisual.com.br',
  '{"heading": "Sua Ferramenta de IA está Ativada!", "intro": "Sua compra foi confirmada com sucesso! Agora você tem acesso ilimitado a esta poderosa ferramenta de Inteligência Artificial.", "button_text": "Acessar Minha Ferramenta", "footer": "Se tiver qualquer dúvida, responda este email que iremos te ajudar!"}',
  true
);