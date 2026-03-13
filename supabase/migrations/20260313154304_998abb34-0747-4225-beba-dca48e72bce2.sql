
CREATE TABLE public.renewal_email_templates (
  id SERIAL PRIMARY KEY,
  day_offset INTEGER NOT NULL UNIQUE CHECK (day_offset >= 0 AND day_offset <= 5),
  subject TEXT NOT NULL,
  preheader TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.renewal_email_templates ENABLE ROW LEVEL SECURITY;

-- Insert default templates (subjects only, body will be managed in edge function)
INSERT INTO renewal_email_templates (day_offset, subject, preheader, body_html) VALUES
(0, 'Seu acesso ao plano {{PLAN_NAME}} vence hoje', 'Faça o pagamento por Pix e continue com seu acesso normalmente.', ''),
(1, 'Seu pagamento do plano {{PLAN_NAME}} ainda está pendente', 'Ainda dá tempo de regularizar e continuar com seu acesso normalmente.', ''),
(2, 'Você pode perder o acesso ao que já usa no seu plano', 'Seu pagamento segue pendente e seu acesso pode ser impactado.', ''),
(3, 'Ficar sem seu plano pode custar mais do que a renovação', 'O prejuízo de interromper seu acesso pode ser maior do que parece.', ''),
(4, 'Enquanto outros continuam com acesso, seu plano segue pendente', 'Não fique de fora dos recursos do seu plano por falta de renovação.', ''),
(5, 'Último aviso: regularize hoje seu plano {{PLAN_NAME}}', 'Este é o último lembrete para manter sua assinatura ativa.', '');
