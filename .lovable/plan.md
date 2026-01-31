
# Plano: Atualizar Preços de Créditos do Upscaler

## Resumo
Alterar os custos de créditos do upscaler:
- **Standard/Básico**: 40 → **60 créditos**
- **PRO**: 60 → **80 créditos**

---

## Arquivos a Modificar

### 1. `src/pages/UpscalerArcanoTool.tsx`

**Linha 370** - Cálculo do custo:
```typescript
// ANTES
const creditCost = version === 'pro' ? 60 : 40;

// DEPOIS
const creditCost = version === 'pro' ? 80 : 60;
```

**Linha 1365** - Exibição no botão:
```typescript
// ANTES
{version === 'pro' ? '60' : '40'}

// DEPOIS
{version === 'pro' ? '80' : '60'}
```

### 2. `supabase/functions/runninghub-upscaler/index.ts`

**Linha 164** - Comentário de documentação:
```typescript
// ANTES
creditCost   // NEW: credit cost (40 standard, 60 pro)

// DEPOIS
creditCost   // NEW: credit cost (60 standard, 80 pro)
```

---

## Impacto

- Nenhuma mudança de lógica, apenas valores
- O backend recebe o custo do frontend e debita corretamente
- A validação do backend usa o valor recebido, então não precisa de alteração na lógica

---

## Verificação Pós-Implementação

1. Abrir o Upscaler Arcano
2. Verificar se o botão Standard mostra "60" créditos
3. Verificar se o botão PRO mostra "80" créditos
4. Fazer um upscale teste e confirmar no histórico se debitou o valor correto
