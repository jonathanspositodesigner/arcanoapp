-- 1. Criar tabela de logs de webhook (auditoria)
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB NOT NULL,
  status TEXT,
  product_id INTEGER,
  email TEXT,
  result TEXT, -- 'success', 'error', 'skipped', 'blacklisted'
  error_message TEXT,
  mapping_type TEXT -- 'promotion', 'pack', 'legacy', 'name_detection', 'unknown'
);

-- RLS: apenas admins podem ver
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage webhook logs" ON public.webhook_logs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Índices para performance
CREATE INDEX idx_webhook_logs_received_at ON public.webhook_logs(received_at DESC);
CREATE INDEX idx_webhook_logs_email ON public.webhook_logs(email);
CREATE INDEX idx_webhook_logs_result ON public.webhook_logs(result);

-- 2. Criar tabela de lista negra (fraudes)
CREATE TABLE public.blacklisted_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  reason TEXT, -- 'chargeback', 'fraud', 'abuse', 'manual'
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  auto_blocked BOOLEAN DEFAULT false
);

-- RLS: apenas admins podem gerenciar
ALTER TABLE public.blacklisted_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage blacklist" ON public.blacklisted_emails
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Índice para busca rápida
CREATE INDEX idx_blacklisted_emails_email ON public.blacklisted_emails(email);

-- 3. Atualizar Product IDs dos packs no banco
UPDATE public.artes_packs SET 
  greenn_product_id_6_meses = 89608,
  greenn_product_id_1_ano = 89595,
  greenn_product_id_vitalicio = 92417,
  greenn_product_id_order_bump = 149334
WHERE slug = 'pack-arcano-vol-1';

UPDATE public.artes_packs SET 
  greenn_product_id_6_meses = 115168,
  greenn_product_id_1_ano = 115163,
  greenn_product_id_vitalicio = 115171,
  greenn_product_id_order_bump = 149342
WHERE slug = 'pack-arcano-vol-2';