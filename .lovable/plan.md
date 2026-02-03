

## Problema Identificado

O painel de Custos IA só está mostrando os jobs do **Pose Changer** porque os jobs do **Upscaler Arcano** estão sendo salvos sem o campo `user_id` preenchido.

### Causa Raiz

A função SQL `get_ai_tools_usage` filtra por `WHERE user_id IS NOT NULL`. Mas:

| Ferramenta | Jobs na Tabela | Com user_id | Aparecem no Painel |
|------------|---------------|-------------|-------------------|
| Upscaler   | 19 registros  | 0 (todos NULL) | Não |
| Pose Changer | 7 registros | 7 (todos ok) | Sim |
| Veste AI   | 0 registros   | - | - |

O código do Upscaler (linha 396-403 em `UpscalerArcanoTool.tsx`) cria o job assim:

```typescript
const { data: job } = await supabase
  .from('upscaler_jobs')
  .insert({
    session_id: sessionIdRef.current,
    status: 'queued',
    detail_denoise: detailDenoise,
    prompt: getFinalPrompt()
    // ❌ FALTA: user_id: user.id
  })
```

Enquanto o Pose Changer e Veste AI salvam corretamente o `user_id`.

---

## Plano de Correção

### 1. Corrigir o INSERT do Upscaler

Adicionar `user_id: user.id` no insert do job em `src/pages/UpscalerArcanoTool.tsx`:

```typescript
.insert({
  session_id: sessionIdRef.current,
  status: 'queued',
  detail_denoise: detailDenoise,
  prompt: getFinalPrompt(),
  user_id: user.id  // ✅ ADICIONAR
})
```

### 2. Corrigir Jobs Existentes (Opcional)

Os 19 jobs já existentes continuarão sem `user_id`. Posso rodar um UPDATE para tentar recuperar o user_id a partir da sessão, ou simplesmente deixar como está (os novos jobs vão aparecer corretamente).

---

## Resultado Esperado

Após a correção, todos os novos jobs do Upscaler aparecerão no painel de Custos IA junto com Pose Changer e Veste AI, com métricas de:
- Custo real em RH (calculado em 0.2 RH por segundo)
- Créditos cobrados do usuário
- Lucro por operação
- Tempo de processamento

