
# Problemas Encontrados no Trial do Arcano Cloner

Apos vasculhar toda a implementacao, encontrei **4 problemas criticos** que impedem o funcionamento e **1 problema menor**. Nada vai funcionar como esta agora.

---

## Problema 1: RLS bloqueia INSERT do job (CRITICO)

A tabela `arcano_cloner_jobs` tem RLS ativado com esta politica de INSERT:

```text
WITH CHECK: auth.uid() IS NOT NULL AND user_id = auth.uid()
```

O trial insere com `user_id: null` e sem autenticacao. Resultado: **erro "violates row-level security policy"** no momento de criar o job. Nada funciona a partir daqui.

**Comparacao**: A tabela `upscaler_jobs` tem `WITH CHECK: true` (permite qualquer insert), por isso o trial do upscaler funciona.

**Correcao**: Adicionar politica que permita INSERT anonimo quando `user_id IS NULL`:

```sql
CREATE POLICY "Allow anonymous trial inserts"
ON public.arcano_cloner_jobs FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);
```

---

## Problema 2: RLS bloqueia SELECT/Realtime do job (CRITICO)

A politica de SELECT exige `user_id = auth.uid()`. Como o job do trial tem `user_id: null` e o usuario nao esta autenticado:

- O **polling** do `useJobStatusSync` retorna vazio (nao encontra o job)
- O **Realtime** nao envia updates (filtrado pelo RLS)
- O usuario fica preso na tela de "Processando..." para sempre

**Correcao**: Adicionar politica de SELECT para jobs anonimos:

```sql
CREATE POLICY "Allow anonymous trial select"
ON public.arcano_cloner_jobs FOR SELECT
TO anon
USING (user_id IS NULL);
```

---

## Problema 3: Trials compartilham a mesma tabela sem separacao (CRITICO)

A tabela `landing_page_trials` **nao tem coluna `tool_name`**. Se um usuario ja fez o trial do Upscaler, ele tera 0 `uses_remaining` e **nao conseguira usar o trial do Cloner**.

O `TrialSignupModal` (compartilhado) e o `landing-trial-code` Edge Function tratam todos os trials como uma unica coisa.

**Correcao**: Duas opcoes:
- **Opcao A (simples)**: Adicionar coluna `tool_name` a tabela e atualizar a Edge Function para filtrar por ferramenta
- **Opcao B (mais simples)**: Ignorar a tabela compartilhada para o cloner e criar um registro separado com um email prefixado (ex: `cloner:email@test.com`) como chave unica - gambiarra, mas nao precisa de migracao

Recomendo a **Opcao A**: adicionar coluna `tool_name TEXT DEFAULT 'upscaler'` e ajustar os endpoints `send`, `verify`, `consume` para filtrar por `tool_name`.

---

## Problema 4: Refund tenta processar userId null em trial mode (MEDIO)

Nas linhas 786-842 da Edge Function, quando o start falha e nao retorna `taskId`, o codigo tenta fazer refund com `userId` que e `null` no trial mode:

```text
await supabase.rpc('refund_upscaler_credits', {
  _user_id: userId,  // null no trial!
  ...
});
```

Isso causa erro na RPC. Precisa do guard `if (!isTrialMode)` antes do bloco de refund.

---

## Problema 5: Email de OTP menciona Upscaler (MENOR)

O template do email na Edge Function `landing-trial-code` diz: "3 testes gratuitos do **Upscaler Arcano**". Para o trial do Cloner deveria dizer "1 teste gratuito do **Arcano Cloner**".

---

## Plano de Correcao

### Etapa 1: Migracao de banco
- Adicionar coluna `tool_name TEXT DEFAULT 'upscaler' NOT NULL` a tabela `landing_page_trials`
- Adicionar politica RLS de INSERT anonimo na `arcano_cloner_jobs` (quando `user_id IS NULL`)
- Adicionar politica RLS de SELECT anonimo na `arcano_cloner_jobs` (quando `user_id IS NULL`)

### Etapa 2: Edge Function `landing-trial-code`
- Aceitar parametro `tool_name` nos endpoints `send`, `verify`, `consume`
- Filtrar registros por `tool_name` em todas as queries
- Configurar `uses_total` = 1 para cloner (vs 3 para upscaler)
- Adaptar template de email baseado no `tool_name`

### Etapa 3: Edge Function `runninghub-arcano-cloner`
- Adicionar guard `if (!isTrialMode)` nos blocos de refund (linhas ~786-860)

### Etapa 4: Frontend
- `TrialSignupModal`: passar prop `toolName` para o endpoint
- `useClonerTrialState`: enviar `tool_name: 'cloner'` nas chamadas ao `landing-trial-code`
- `ClonerTrialSection`: enviar `tool_name: 'cloner'` no consume

### Etapa 5: Frontend Upscaler (retrocompatibilidade)
- `useTrialState`: enviar `tool_name: 'upscaler'` nas chamadas
- `UpscalerTrialSection`: enviar `tool_name: 'upscaler'` no consume

### Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| Migracao SQL | RLS + coluna tool_name |
| `supabase/functions/landing-trial-code/index.ts` | Suporte a tool_name + template condicional |
| `supabase/functions/runninghub-arcano-cloner/index.ts` | Guard de refund no trial mode |
| `src/components/upscaler/trial/TrialSignupModal.tsx` | Prop toolName |
| `src/components/upscaler/trial/useTrialState.ts` | Enviar tool_name |
| `src/components/upscaler/trial/UpscalerTrialSection.tsx` | Enviar tool_name |
| `src/components/arcano-cloner/trial/useClonerTrialState.ts` | Enviar tool_name: cloner |
| `src/components/arcano-cloner/trial/ClonerTrialSection.tsx` | Enviar tool_name: cloner |
