-- Adicionar colunas para Product IDs da Hotmart na tabela artes_packs
ALTER TABLE public.artes_packs 
ADD COLUMN IF NOT EXISTS hotmart_product_id_vitalicio TEXT;