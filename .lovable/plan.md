

## Adicionar Veo 3 e NanoBanana Pro nos planos + desconto 50% para IA Unlimited

### Resumo

Adicionar dois novos itens na lista de features da pagina `/planos-2`:
- "Geracao de Video com Veo 3"
- "Geracao de Imagem com NanoBanana Pro"

Com as seguintes regras:
- **Starter**: indisponivel (X vermelho)
- **Pro, Ultimate**: disponivel (check roxo)
- **IA Unlimited**: disponivel (check roxo) + badge "50% OFF"

E ajustar os custos de creditos:
- **IA Unlimited**: mantem os custos atuais do banco (40 NanoBanana Normal, 60 NanoBanana Pro, 700 Veo 3)
- **Todos os outros planos**: NanoBanana Normal = 80, NanoBanana Pro = 100, Veo 3 = 1500

### Mudancas tecnicas

#### 1. `src/pages/Planos2.tsx` - Adicionar features na lista de planos

Adicionar dois novos itens de feature em **todos os 8 arrays de features** (4 mensal + 4 anual), logo depois do item "Acesso as Ferramentas de IA":

Para **Starter** (mensal e anual):
```
{ text: 'Geração de Imagem com NanoBanana Pro', included: false }
{ text: 'Geração de Vídeo com Veo 3', included: false }
```

Para **Pro** e **Ultimate** (mensal e anual):
```
{ text: 'Geração de Imagem com NanoBanana Pro', included: true }
{ text: 'Geração de Vídeo com Veo 3', included: true }
```

Para **IA Unlimited** (mensal e anual):
```
{ text: 'Geração de Imagem com NanoBanana Pro', included: true, hasDiscount: true }
{ text: 'Geração de Vídeo com Veo 3', included: true, hasDiscount: true }
```

Na renderizacao da feature list (linhas ~411-444), adicionar logica para mostrar uma badge "50% OFF" ao lado do texto quando `hasDiscount === true`. Badge pequena com estilo gradiente roxo/rosa.

#### 2. Edge function `supabase/functions/generate-image/index.ts` - Custo diferenciado

Apos obter o `userId`, buscar o `plan_type` do usuario na tabela `premium_users`:

```typescript
const { data: premiumData } = await serviceClient
  .from("premium_users")
  .select("plan_type")
  .eq("user_id", userId)
  .eq("is_active", true)
  .maybeSingle();

const isUnlimited = premiumData?.plan_type === "arcano_unlimited";
```

Para o custo:
- Se `isUnlimited`: usar o valor do `ai_tool_settings` (codigo atual, sem mudanca)
- Se NAO `isUnlimited`: usar custos fixos (Normal = 80, Pro = 100)

```typescript
let creditCost: number;
if (isUnlimited) {
  creditCost = settingsData?.credit_cost ?? (isProModel ? 60 : 40);
} else {
  creditCost = isProModel ? 100 : 80;
}
```

#### 3. Edge function `supabase/functions/generate-video/index.ts` - Custo diferenciado

Mesma logica: buscar `plan_type` do usuario.

- Se `isUnlimited`: usar o valor do `ai_tool_settings` (700 atualmente)
- Se NAO `isUnlimited`: custo fixo de 1500

```typescript
let creditCost: number;
if (isUnlimited) {
  creditCost = settingsData?.credit_cost ?? 700;
} else {
  creditCost = 1500;
}
```

#### 4. Frontend `GerarImagemTool.tsx` e `GerarVideoTool.tsx` - Mostrar custo correto

Nesses componentes, o custo exibido ao usuario vem do `useAIToolSettings`. Precisamos ajustar para considerar o plano:

- Importar `usePremiumStatus` para obter `planType`
- Se `planType === "arcano_unlimited"`: manter o custo do `getCreditCost()` (valores do banco)
- Se nao: usar os custos fixos (80, 100, 1500)

Isso garante que o usuario veja o preco correto ANTES de gerar.

### Arquivos alterados

1. **`src/pages/Planos2.tsx`** - Features + badge 50% OFF
2. **`supabase/functions/generate-image/index.ts`** - Custo por plano
3. **`supabase/functions/generate-video/index.ts`** - Custo por plano
4. **`src/pages/GerarImagemTool.tsx`** - Exibir custo correto
5. **`src/pages/GerarVideoTool.tsx`** - Exibir custo correto

### O que NAO muda

- Tabela `ai_tool_settings` (os valores do banco continuam sendo o custo do IA Unlimited)
- Outras ferramentas de IA (Arcano Cloner, Pose, Veste AI, etc.)
- Nenhuma tabela nova, nenhuma migration
- Nenhuma rota nova

