
Objetivo
- Corrigir a /prevenda-pack4 para usar a galeria correta do Pack 4 em “Veja todas as artes”.
- Isolar de vez /prevenda-pack4 de /combo-artes-arcanas para impedir impacto cruzado.

Diagnóstico confirmado
- Hoje a /prevenda-pack4 ainda importa a galeria de `@/components/combo-artes/FlyersGallerySection`.
- Essa galeria usa imagens de `/images/combo/*`, por isso aparece conteúdo da página de combo.
- A página também continua compartilhando vários componentes com a pasta `combo-artes`, então qualquer ajuste futuro pode “vazar” entre páginas.

Plano de implementação
1) Restaurar galeria de artes do Pack 4 (fix principal)
- Criar `src/components/prevenda-pack4/FlyersGallerySectionPack4.tsx`.
- Manter o mesmo layout/UX atual (abas + grid) para não quebrar visual.
- Trocar dataset para imagens de `public/images/pack4/*` (apenas artes do Pack 4, sem `/images/combo/*`).
- Manter título “Veja todas as artes que você terá acesso”.

2) Conectar a página /prevenda-pack4 à nova galeria
- Editar `src/pages/PrevendaPack4.tsx`:
  - Substituir lazy import de `combo-artes/FlyersGallerySection` por `prevenda-pack4/FlyersGallerySectionPack4`.
- Não alterar `src/pages/ComboArtesArcanas.tsx`.

3) Separar estruturalmente as duas páginas (blindagem definitiva)
- Duplicar para `src/components/prevenda-pack4/` os blocos ainda compartilhados pela pré-venda (cópia 1:1 do estado atual para manter visual):
  - `FeaturesSection`, `MotionsGallerySection`, `BonusTelaoSection`, `BonusGridSection`,
    `TestimonialsSection`, `GuaranteeSectionCombo`, `AboutSection`, `FAQSectionCombo`,
    `WhatsAppSupportSection`, `FooterSection`, `HeroSectionPack4` (se ainda compartilhado).
- Reapontar imports da `PrevendaPack4.tsx` para essas versões próprias.
- Resultado: mudanças futuras em combo não afetam pré-venda, e vice-versa.

4) Critérios de aceite
- Em `/prevenda-pack4`, a seção “Veja todas as artes” mostra somente imagens do Pack 4 (`/images/pack4/*`).
- Em `/combo-artes-arcanas`, a galeria permanece exatamente como está hoje.
- Alterar um componente de pré-venda não muda combo (e o inverso também não).

Validação final
- Testar visualmente as duas rotas lado a lado:
  - `/prevenda-pack4` (galeria Pack 4 correta)
  - `/combo-artes-arcanas` (sem regressão)
- Confirmar que nenhum import da página de pré-venda aponta para `components/combo-artes/*` (exceto utilitários neutros, se necessário).

Detalhe técnico (resumo)
- Causa raiz: compartilhamento de componente de conteúdo comercial.
- Correção: componente dedicado + isolamento total de imports da página de pré-venda.
