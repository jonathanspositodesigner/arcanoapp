
# Teste Gratis do Arcano Cloner na Pagina de Vendas

## Resumo

Criar uma secao de teste gratuito funcional embutida na pagina de vendas `/planos-arcanocloner`, permitindo que visitantes experimentem o Arcano Cloner sem cadastro. O fluxo seguira o mesmo padrao do teste do Upscaler: verificacao por OTP via email, 1 uso gratuito, interface completa embutida.

## Arquitetura

O sistema sera composto por:

1. **Frontend**: Componentes dedicados em `src/components/arcano-cloner/trial/`
2. **Backend**: Modificacao na Edge Function `runninghub-arcano-cloner` para suportar `trial_mode: true`
3. **Controle de usos**: Reutilizacao da mesma infra de `landing-trial-code` (OTP via SendPulse + tabela `landing_page_trials`)

## Mudancas necessarias

### 1. Edge Function: `runninghub-arcano-cloner/index.ts`

Adicionar suporte a `trial_mode` no `handleRun`, seguindo o mesmo padrao do `runninghub-upscaler`:
- Quando `trial_mode: true`, pular validacao de UUID do `userId` e pular consumo de creditos via RPC
- Usar um userId interno fixo (ex: `00000000-0000-0000-0000-000000000000`) para o job
- Manter todo o resto do fluxo identico (upload para RunningHub, queue, webhook, etc.)

### 2. Novos componentes frontend

**`src/components/arcano-cloner/trial/ClonerTrialSection.tsx`**
- Componente principal da secao de teste
- 3 fases: `locked` (mockup borrado), `signup` (modal OTP), `active` (interface funcional)
- Reutiliza `useTrialState` com storage key diferente (`cloner_landing_trial`)
- Reutiliza `TrialSignupModal` existente (do upscaler)

**`src/components/arcano-cloner/trial/ClonerTrialMockup.tsx`**
- Interface visual do Arcano Cloner simplificada para a landing page
- Inclui: upload de foto do usuario, selecao de referencia (upload apenas, sem biblioteca logada), seletor de aspect ratio, slider de criatividade
- Resultado exibido com zoom/pan
- Sem: PersonInputSwitch (avatares requerem login), PhotoLibraryModal (requer autenticacao), CustomPromptToggle (simplificar)

### 3. Fluxo de processamento (identico ao ArcanoClonerTool)

1. Upload da foto do usuario com `optimizeForAI()` (JPEG, 1536px, 2MB)
2. Upload da foto de referencia com `optimizeForAI()`
3. Upload de ambas para `upscaler-uploads` bucket (publico, sem auth)
4. Criar job em `arcano_cloner_jobs` com `user_id: null`
5. Chamar `runninghub-arcano-cloner/run` com `trial_mode: true`, `creditCost: 0`, `userId: null`
6. Monitorar via `useJobStatusSync` (Realtime + polling)
7. Consumir uso do trial apos job iniciar com sucesso

### 4. Watchdogs e monitoramento

- `useJobStatusSync` com `toolType: 'arcano_cloner'` - identico ao tool principal
- Timer absoluto de 10 minutos ja incluso no hook
- Sem `useJobPendingWatchdog` (trial simplificado, ja coberto pelo timeout absoluto)

### 5. Substituicao na pagina de vendas

Na `PlanosArcanoCloner.tsx`, substituir a secao "Quer testar antes de comprar?" (linhas 549-577) pelo componente `ClonerTrialSection`, que contera a interface funcional completa.

## Detalhes tecnicos

### Edge Function - trial_mode

```
// No handleRun, apos parse do body:
const isTrialMode = trial_mode === true;

// Pular validacao de userId se trial
if (!isTrialMode) {
  // validacao UUID existente
}

// Pular consumo de creditos se trial
if (!isTrialMode) {
  // consumo de creditos existente
}
```

### Storage

Usa o bucket publico `upscaler-uploads` (ja existente, com RLS aberta para INSERT/SELECT anonimo), no path `arcano-cloner/trial_{emailHash}/`.

### Tabela de controle

Reutiliza `landing_page_trials` via `landing-trial-code` edge function (mesma logica de OTP do upscaler).

### useTrialState adaptado

Criar `useClonerTrialState.ts` com storage key `cloner_landing_trial` para manter estado independente do trial do upscaler. A logica e identica ao `useTrialState.ts` existente.

## Arquivos a criar/modificar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/runninghub-arcano-cloner/index.ts` | Adicionar suporte `trial_mode` |
| `src/components/arcano-cloner/trial/ClonerTrialSection.tsx` | Novo - secao principal |
| `src/components/arcano-cloner/trial/ClonerTrialMockup.tsx` | Novo - interface visual |
| `src/components/arcano-cloner/trial/useClonerTrialState.ts` | Novo - estado do trial |
| `src/pages/PlanosArcanoCloner.tsx` | Substituir mockup borrado pelo componente funcional |

## Limitacoes do trial (vs. ferramenta completa)

- Sem avatares salvos (requer login)
- Sem biblioteca de fotos (requer login) - apenas upload direto
- Sem instrucoes personalizadas (simplificar UX)
- 1 uso gratuito por email
- Verificacao OTP obrigatoria
