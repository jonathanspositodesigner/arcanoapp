
# Plano: Histórico de Créditos + Consumo no Backend

## ✅ IMPLEMENTADO

---

## Mudanças Realizadas

### 1. Histórico de Transações (ProfileSettings.tsx)
- ✅ Criado componente `CreditsCard` em `src/components/upscaler/CreditsCard.tsx`
- ✅ Mostra as últimas 10 transações do usuário
- ✅ Exibe data/hora, valor (+/-) e descrição
- ✅ RLS protege os dados - cada usuário só vê suas próprias transações

### 2. Consumo no Backend (Edge Function)
- ✅ Modificado `supabase/functions/runninghub-upscaler/index.ts`
- ✅ Recebe `userId` e `creditCost` do frontend
- ✅ Consome créditos via RPC `consume_upscaler_credits` ANTES de iniciar o job
- ✅ Se créditos insuficientes, retorna erro sem processar

### 3. Frontend Atualizado (UpscalerArcanoTool.tsx)
- ✅ Removida chamada `consumeCredits()` antes do processamento
- ✅ Passa `userId` e `creditCost` para a edge function
- ✅ Verificação local de saldo apenas para UX (backend valida de verdade)
- ✅ Atualiza saldo local via `refetchCredits()` após resposta de sucesso

---

## Fluxo Atualizado

```text
ANTES (problemático):
Frontend → consumeCredits() → Se OK → createJob → upload → run
   ❌ Se upload falhar, créditos já foram cobrados!

DEPOIS (seguro):
Frontend → createJob → upload → run(userId, creditCost)
   └→ Backend: consumeCredits → Se OK → processar
       ❌ Se falhar upload ou run, créditos NÃO são cobrados
       ✅ Só cobra quando o job efetivamente inicia
```

---

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/components/upscaler/CreditsCard.tsx` | **NOVO** - Componente de histórico |
| `src/pages/ProfileSettings.tsx` | Usa CreditsCard |
| `src/pages/UpscalerArcanoTool.tsx` | Remove consumo local, passa params |
| `supabase/functions/runninghub-upscaler/index.ts` | Consome créditos no backend |
