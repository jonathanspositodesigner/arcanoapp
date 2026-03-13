
-- Card 1: Pack Vol.1 sozinho por R$27,90 (1 ano)
INSERT INTO public.mp_products (slug, title, price, type, pack_slug, access_type, credits_amount, is_active)
VALUES ('combo-vol1-1ano', 'Combo Pack Arcano Vol.1 - 1 Ano', 27.90, 'pack', 'pack-arcano-vol-1', '1_ano', 0, true);

-- Card 2: Combo Packs 1 e 2 por R$49,90 (1 ano) - bundle que libera vol1 + vol2
INSERT INTO public.mp_products (slug, title, price, type, pack_slug, access_type, credits_amount, is_active)
VALUES ('combo-1e2-1ano', 'Combo Packs Arcano 1 e 2 - 1 Ano', 49.90, 'pack', 'pack-arcano-vol-1', '1_ano', 0, true);

-- Card 3: Combo Packs 1 ao 3 por R$59,90 (vitalício) - bundle que libera vol1 + vol2 + vol3
INSERT INTO public.mp_products (slug, title, price, type, pack_slug, access_type, credits_amount, is_active)
VALUES ('combo-1ao3-vitalicio', 'Combo Packs Arcano 1 ao 3 - Vitalício', 59.90, 'pack', 'pack-arcano-vol-1', 'vitalicio', 0, true);
