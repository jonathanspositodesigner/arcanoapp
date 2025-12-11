-- Tabela de templates de notificações push
CREATE TABLE public.push_notification_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de agendamentos de notificações
CREATE TABLE public.push_scheduled_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT,
  schedule_type TEXT NOT NULL DEFAULT 'once', -- 'once', 'daily', 'weekly', 'monthly'
  scheduled_at TIMESTAMP WITH TIME ZONE, -- Para envio único
  scheduled_time TIME, -- Hora do dia para recorrentes
  scheduled_day_of_week INTEGER, -- 0-6 (domingo a sábado) para weekly
  scheduled_day_of_month INTEGER, -- 1-31 para monthly
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  next_send_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.push_notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for templates
CREATE POLICY "Admins can manage push notification templates"
ON public.push_notification_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for scheduled notifications
CREATE POLICY "Admins can manage push scheduled notifications"
ON public.push_scheduled_notifications
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at on templates
CREATE TRIGGER update_push_notification_templates_updated_at
BEFORE UPDATE ON public.push_notification_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();