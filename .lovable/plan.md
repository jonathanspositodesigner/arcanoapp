
Objetivo
- Restaurar a página /prevenda-pack4 para o comportamento anterior, sem alterar /combo-artes-arcanas.
- Garantir independência real entre as duas páginas para evitar novos “efeitos colaterais”.

Diagnóstico atual
- /prevenda-pack4 e /combo-artes-arcanas compartilham componentes críticos (principalmente PricingCardsSection).
- Esse componente hoje está com oferta do combo (slugs combo-*), então qualquer ajuste nele impacta as duas páginas.

Plano de implementação
1) Desacoplamento estrutural da pré-venda
- Criar componentes próprios da pré-venda (ex.: pasta src/components/prevenda-pack4/).
- Migrar para essa pasta os blocos que têm conteúdo/regra diferente do combo (mínimo: seção de preços/checkout).

2) Restaurar pricing original da pré-venda Pack 4
- Implementar seção de preços exclusiva da pré-venda com 3 opções:
  - 6 meses: R$ 27,00
  - 1 ano: R$ 37,00
  - Vitalício: R$ 47,00 (destaque principal)
- No mobile, manter ordem visual priorizando Vitalício no topo.
- Reaplicar diferenciação de bônus nos planos inferiores (itens com riscado + indicador de indisponível), mantendo a lógica de upgrade.

3) Restaurar checkout dinâmico correto da pré-venda
- Botões específicos:
  - 6 meses -> slug pack4-6meses
  - 1 ano -> slug pack4-1ano
- CTA principal/default da página e CTAs não específicos -> slug pack4lancamento (vitalício de lançamento).
- Não reutilizar slugs combo-* dentro da pré-venda.

4) Blindar o Combo contra impacto
- Em /combo-artes-arcanas, manter importando os componentes atuais de combo (sem alteração de conteúdo/layout).
- Em /prevenda-pack4, trocar imports para os componentes exclusivos da pré-venda.
- Resultado: alterações futuras em uma página não afetam a outra.

5) Validação final (aceite)
- /prevenda-pack4: preços, ordem mobile e checkout condizem com a configuração antiga de pré-venda.
- /combo-artes-arcanas: permanece exatamente como está hoje.
- Verificação de regressão: nenhum componente compartilhado com copy/regra comercial entre as duas páginas.

Arquivos envolvidos (planejado)
- src/pages/PrevendaPack4.tsx (troca de imports para versão dedicada)
- Novo(s): src/components/prevenda-pack4/* (pricing e blocos específicos)
- Sem mudança funcional em src/pages/ComboArtesArcanas.tsx
