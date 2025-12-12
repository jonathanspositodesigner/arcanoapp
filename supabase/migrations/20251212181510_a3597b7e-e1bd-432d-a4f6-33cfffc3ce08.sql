-- Tabela para armazenar logs de emails de boas-vindas
CREATE TABLE public.welcome_email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  platform TEXT NOT NULL, -- 'promptverso' ou 'artes'
  template_used TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  tracking_id TEXT UNIQUE,
  product_info TEXT
);

-- Tabela para templates de email de boas-vindas
CREATE TABLE public.welcome_email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL UNIQUE, -- 'promptverso' ou 'artes'
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  sender_name TEXT NOT NULL DEFAULT 'ArcanoApp',
  sender_email TEXT NOT NULL DEFAULT 'contato@voxvisual.com.br',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir templates padrão
INSERT INTO public.welcome_email_templates (platform, subject, content, sender_name, sender_email) VALUES
('promptverso', '🎉 Bem-vindo ao ArcanoApp - Seu acesso está pronto!', '{"heading":"Bem-vindo ao ArcanoApp!","intro":"Sua compra foi confirmada com sucesso! Agora você tem acesso à nossa biblioteca completa de prompts de IA.","button_text":"Acessar Plataforma","footer":"Se tiver qualquer dúvida, responda este email que iremos te ajudar!"}', 'ArcanoApp', 'contato@voxvisual.com.br'),
('artes', '🎨 Bem-vindo à Biblioteca de Artes Arcanas - Seu acesso está pronto!', '{"heading":"Bem-vindo à Biblioteca de Artes Arcanas!","intro":"Sua compra foi confirmada com sucesso! Agora você tem acesso à nossa biblioteca completa de artes editáveis.","button_text":"Acessar Plataforma","footer":"Se tiver qualquer dúvida, responda este email que iremos te ajudar!"}', 'Biblioteca de Artes Arcanas', 'contato@voxvisual.com.br');

-- Índices para performance
CREATE INDEX idx_welcome_logs_email ON public.welcome_email_logs(email);
CREATE INDEX idx_welcome_logs_tracking_id ON public.welcome_email_logs(tracking_id);
CREATE INDEX idx_welcome_logs_platform ON public.welcome_email_logs(platform);
CREATE INDEX idx_welcome_logs_sent_at ON public.welcome_email_logs(sent_at DESC);

-- RLS policies
ALTER TABLE public.welcome_email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.welcome_email_templates ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver/editar logs e templates
CREATE POLICY "Admins can manage welcome_email_logs" ON public.welcome_email_logs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage welcome_email_templates" ON public.welcome_email_templates
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE TRIGGER update_welcome_email_templates_updated_at
BEFORE UPDATE ON public.welcome_email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();