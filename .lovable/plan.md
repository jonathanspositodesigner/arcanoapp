
## Plano: Remover tags "50% OFF" do Unlimited + Corrigir exibicao de Ferramentas de IA na Home

### Problema 1: Tags "50% OFF" no NanoBanana Pro e Veo 3 do plano Unlimited

Na pagina `/planos-2`, os features "Geracao de Imagem com NanoBanana Pro" e "Geracao de Video com Veo 3" do plano IA Unlimited possuem `hasDiscount: true`, exibindo badges "50% OFF" desnecessarios. O desconto de 50% ja esta embutido no custo das ferramentas (cost_multiplier 0.5) e nao precisa de tag visual.

**Correcao**: Remover `hasDiscount: true` dessas duas features no plano Unlimited, tanto na configuracao mensal (linhas 181-182) quanto na anual (linhas 298-299) do arquivo `Planos2.tsx`.

---

### Problema 2: Ferramentas de IA nao aparecem como "Suas Compras" na Home

A logica atual em `Index.tsx` (linha 103-107) verifica tres condicoes para `hasToolAccess`:
1. Pacotes legados (TOOL_SLUGS)
2. Planos2 pago com geracao de imagem
3. Creditos > 0

O problema e que a condicao `isPlanos2Paid && hasImageGeneration` depende do hook `usePlanos2Access`, que por padrao retorna `hasImageGeneration: true` quando NAO encontra subscription (fallback para legado). Porem o `isPlanos2User` retorna `false` se nao encontrar registro, entao `isPlanos2Paid` seria `false`.

Para usuarios Unlimited que TEM registro na tabela, tudo deveria funcionar. Mas para tornar a logica mais robusta e garantir que QUALQUER usuario com creditos veja as ferramentas, vou simplificar a verificacao:

**Correcao**: Garantir que `hasToolAccess` funcione de forma mais direta - se o usuario tem creditos OU e planos2 pago, as ferramentas aparecem. Tambem adicionar um log de debug temporario para diagnosticar se ha algum problema de timing.

---

### Detalhes tecnicos

**Arquivos modificados:**

1. **`src/pages/Planos2.tsx`**
   - Linha 181: Remover `hasDiscount: true` do feature "Geracao de Imagem com NanoBanana Pro" no plano Unlimited (mensal)
   - Linha 182: Remover `hasDiscount: true` do feature "Geracao de Video com Veo 3" no plano Unlimited (mensal)
   - Linha 298: Remover `hasDiscount: true` do feature "Geracao de Imagem com NanoBanana Pro" no plano Unlimited (anual)
   - Linha 299: Remover `hasDiscount: true` do feature "Geracao de Video com Veo 3" no plano Unlimited (anual)

2. **`src/pages/Index.tsx`**
   - Simplificar `hasToolAccess` para ser mais explicito: qualquer usuario planos2 pago (independente de `hasImageGeneration`) OU com creditos > 0 tem acesso
   - A condicao `hasImageGeneration` deve controlar quais ferramentas especificas aparecem dentro da pagina de ferramentas, nao o acesso ao card na home

### Resumo

- 2 arquivos editados
- 4 linhas com `hasDiscount: true` removidas no Planos2.tsx
- Logica de `hasToolAccess` simplificada no Index.tsx
