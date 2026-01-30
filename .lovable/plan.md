
# Plano: Ativar Todas as Features nos Planos Starter e Pro

## Resumo
Mudar todas as features que estão com `included: false` para `included: true` nos planos **Starter** e **Pro**, tanto na versão mensal quanto na anual.

## Mudanças a Fazer

### 1. Plano Starter (Mensal) - Linhas 82-85
Ativar as 4 features:
- `changeClothesAI`: false → true
- `changePoseAI`: false → true  
- `upscaleArcano`: false → true
- `forja3D`: false → true

### 2. Plano Pro (Mensal) - Linhas 104-105
Ativar as 2 features:
- `upscaleArcano`: false → true
- `forja3D`: false → true

### 3. Plano Starter (Anual) - Linhas 168-171
Ativar as 4 features:
- `changeClothesAI`: false → true
- `changePoseAI`: false → true
- `upscaleArcano`: false → true
- `forja3D`: false → true

### 4. Plano Pro (Anual) - Linhas 192-193
Ativar as 2 features:
- `upscaleArcano`: false → true
- `forja3D`: false → true

## Arquivo a Editar
- `src/pages/Planos2.tsx`

## Resultado Visual
Após a mudança, todos os itens da lista de features nos planos Starter e Pro vão aparecer com o check verde ao invés do X vermelho.
