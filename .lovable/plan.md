
Objetivo imediato
- Corrigir o redirecionamento do botão **“Torne-se Premium”** no modal de foto premium para ir para **`/planos-2`**.
- Garantir que a regra de bloqueio/upsell de fotos premium esteja funcionando em **todas as IAs que usam a biblioteca de fotos**.

Diagnóstico confirmado no código
1. O bug está no componente compartilhado:
   - `src/components/arcano-cloner/PhotoLibraryModal.tsx`
   - Hoje o botão do modal premium está com:
     - `navigate('/planos-upscaler-creditos')`
   - Isso explica por que continua indo para a página errada.
2. As três IAs principais já usam esse modal compartilhado e já passam status premium:
   - `src/pages/PoseChangerTool.tsx` → `isPremiumUser={isPremium}`
   - `src/pages/ArcanoClonerTool.tsx` → `isPremiumUser={isPremium}`
   - `src/pages/VesteAITool.tsx` → `isPremiumUser={isPremium}`
3. Há mais um uso da mesma biblioteca em fluxo de teste:
   - `src/components/arcano-cloner/trial/ClonerTrialSection.tsx`
   - Usa `PhotoLibraryModal` sem `isPremiumUser` (fica `false` por padrão), o que é esperado para trial/gratuito.

Plano de implementação
1. Corrigir a rota no modal premium compartilhado
- Arquivo: `src/components/arcano-cloner/PhotoLibraryModal.tsx`
- Alterar o clique do botão “Torne-se Premium” no modal de upsell:
  - de `navigate('/planos-upscaler-creditos')`
  - para `navigate('/planos-2')`

2. Blindar contra regressão da rota errada
- No mesmo arquivo, substituir string literal solta por constante local (ex.: `const PREMIUM_UPSELL_ROUTE = '/planos-2'`) e reutilizar no botão.
- Isso reduz chance de voltar rota antiga em futuras edições.

3. Validar cobertura em todas as IAs com biblioteca de fotos
- Confirmar que todos os pontos que abrem `PhotoLibraryModal` continuam herdando o comportamento correto:
  - Pose Changer
  - Arcano Cloner
  - Veste AI
  - Cloner Trial (se aplicável ao escopo de “IAs com fotos”)

4. Checklist de comportamento esperado após correção
- Usuário gratuito:
  - vê fotos premium com cadeado roxo + badge premium discreta;
  - ao clicar em foto premium, abre modal de upsell;
  - ao clicar “Torne-se Premium”, navega para **`/planos-2`**.
- Usuário premium:
  - vê badge premium;
  - consegue selecionar foto premium normalmente (sem modal de bloqueio).
- Fotos não premium:
  - continuam selecionáveis para todos.

5. Validação manual end-to-end (obrigatória)
- Testar fluxo completo em cada IA:
  - abrir biblioteca de fotos;
  - clicar em foto premium com conta gratuita;
  - confirmar abertura do modal;
  - clicar “Torne-se Premium”;
  - confirmar URL final exatamente `.../planos-2`.
- Repetir em mobile e desktop para garantir consistência de navegação.

Risco/impacto
- Baixo risco técnico: alteração pontual em componente compartilhado.
- Alto impacto funcional: corrige o caminho de conversão de upgrade em todas as ferramentas que dependem desse modal.
