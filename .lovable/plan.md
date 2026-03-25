
Objetivo: corrigir o fluxo para que o **Upscaler App (com créditos)** seja público para todas as contas, e manter **V2/V3 (videoaulas)** com acesso por compra.

1) Corrigir o destino do “Upscaler Arcano V3” para ir direto ao app
- Arquivo: `src/pages/FerramentasIAAplicativo.tsx`
  - Em `getAccessRoute`, trocar o slug `upscaller-arcano` para `"/upscaler-arcano-tool"` (não mais `"/ferramenta-ia-artes/upscaller-arcano"`).
- Arquivo: `src/components/layout/AppSidebar.tsx`
  - Em `aiToolLinks`, trocar path de `"Upscaler Arcano V3"` para `"/upscaler-arcano-tool"`.
- Arquivo: `src/pages/BibliotecaPrompts.tsx`
  - CTA do banner de Upscaler deve navegar para `"/upscaler-arcano-tool"` para manter o mesmo comportamento em todos os pontos de entrada.

2) Ajustar o gate das versões com videoaula (V2/V3)
- Arquivo: `src/pages/UpscalerArcanoVersionSelect.tsx`
  - Corrigir regra atual (hoje V2 está liberado para todos por `hasVersionAccess = isV3 ? hasV3Pack : true`).
  - Nova regra:
    - `hasV2Access = hasUpscalerPack || hasV3Pack || hasUnlimitedAccess`
    - `hasV3Access = hasV3Pack || hasUnlimitedAccess`
  - Aplicar isso em clique, estado do botão e badge de status dos cards.

3) Ajustar proteção da página de aulas por versão
- Arquivo: `src/pages/ToolVersionLessons.tsx`
  - Hoje o acesso usa apenas `hasAccessToPack(toolSlug)` (insuficiente para distinguir V2 vs V3).
  - Implementar verificação por `versionSlug`:
    - `v3` exige `upscaller-arcano-v3` (ou unlimited, se mantido como bypass atual).
    - `v1/v2` exigem `upscaller-arcano` **ou** `upscaller-arcano-v3` (V3 herda V2).
  - Manter redirecionamento para login/plano quando não autorizado.

4) Compatibilidade de rota legada
- Arquivo: `src/pages/UpscalerSelectionPage.tsx`
  - Remover o redirecionamento forçado para a seleção vitalícia quando não há pack V3.
  - Deixar a rota legada sem quebrar usuários antigos (sem bloquear acesso indevidamente ao app).

5) Validação end-to-end (obrigatória)
- Conta free:
  - Clicar em “Upscaler Arcano V3” (Ferramentas IA / Sidebar / Banner) deve abrir `"/upscaler-arcano-tool"`.
  - Processar sem pack deve depender só de login + créditos (sem bloqueio por pack).
- Conta com pack V2:
  - Acessa videoaulas V2.
  - Não acessa V3.
- Conta com pack V3:
  - Acessa V2 e V3.
- Confirmar que nenhuma rota de “Upscaler Arcano V3” volta a cair na seleção vitalícia por engano.

Arquivos que serão alterados:
- `src/pages/FerramentasIAAplicativo.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/pages/BibliotecaPrompts.tsx`
- `src/pages/UpscalerArcanoVersionSelect.tsx`
- `src/pages/ToolVersionLessons.tsx`
- `src/pages/UpscalerSelectionPage.tsx`
