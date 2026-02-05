
## Objetivo (sem “coisa cabulosa”, sem criar função nova)
Corrigir de vez:
1) Job entrando na fila quando não deveria  
2) “Processamento eterno” ocupando slot e bagunçando a contagem  
3) Garantir a regra: **fila só existe quando já tem 3 jobs rodando; o próximo vira o 4º na fila.**  

Sem cron externo, sem novo serviço, sem inventar arquitetura nova.

---

## O que eu vi no backend (explica exatamente o que você está passando)
- Existem jobs do usuário (ex.: Vinicius Tadeu) que ficam **running/queued** por tempo demais e só saem quando você cancela manualmente.
- A limpeza automática de 10 min que foi tentada antes **não é confiável** por dois motivos:
  1) Foi implementada com timer em background (10 min) dentro de função serverless; esse tipo de timer pode não rodar até o fim por encerramento de instância.
  2) A RPC `user_cancel_ai_job` exige `auth.uid()` (usuário logado). Quando a limpeza roda “como sistema”, ela falha por “Usuário não autenticado”.

- Existe uma função no banco já pronta e correta para isso: **`cleanup_all_stale_ai_jobs()`**  
  Ela:
  - encontra jobs `running` ou `queued` com mais de 10 min,
  - marca como `failed`,
  - estorna crédito via `refund_upscaler_credits`.

O problema é: **ela não estava sendo chamada de forma garantida no fluxo principal**, então os “jobs fantasmas” ficam segurando os slots e induzindo fila.

---

## Correção simples e definitiva (centralizada, sem criar nada novo)
A correção vai ser toda no **`runninghub-queue-manager`**, que é o “cérebro” da fila.

### A) Enforce da regra de negócio: “3 rodando no máximo (global)”
Hoje o queue-manager calcula capacidade com base em “3 por conta”, o que pode virar 6/9/15 se tiver várias chaves.  
Você quer: **3 total e acabou**.

Mudança:
- Introduzir uma constante **GLOBAL_MAX_CONCURRENT = 3**
- Em `/check` e `/process-next`, usar **globalRunningCount** e comparar com **3**, ignorando o “accounts * 3” para decisão de entrar em fila.

Resultado:
- Só vai para fila quando `running >= 3`.
- Se `running < 3`, não existe “fila por engano”.

### B) Matar “processamento eterno” sem cron e sem timer de 10 minutos
Em vez de depender de timer longo em serverless, a gente faz **limpeza oportunista** (sempre que o sistema é usado), chamando a função que já existe no banco:

- No início de **/check** (toda tentativa de iniciar job passa por aqui)
- No início de **/process-next** (toda finalização via webhook tenta puxar o próximo)
- No início de **/check-user-active** (para não bloquear usuário por job fantasma)

Implementação:
- Chamar `cleanup_all_stale_ai_jobs()` e, se ela cancelou algo, chamar `updateAllQueuePositions()` para manter posições coerentes.
- Essa limpeza não precisa de usuário logado (é SECURITY DEFINER), então funciona “como sistema”.

Resultado:
- Se algum job travar e ficar `running/queued` por mais de 10 min, **ele deixa de “segurar slot” automaticamente** no próximo evento normal do sistema (novo clique de qualquer usuário, ou webhook de qualquer job).
- Isso evita “fila fantasma” e evita precisar de você cancelar manualmente a toda hora.

Observação honesta: sem cron, não existe como o backend “acordar sozinho” exatamente no minuto 10 se ninguém usa o sistema. Mas na prática, o seu problema é recorrente com tráfego real; então essa abordagem resolve “de vez” porque qualquer nova ação dispara a limpeza e desbloqueia.

### C) Garantir que “fila não fica travada com slot livre”
Pode acontecer do slot abrir e ficar job `queued` parado se o webhook falhar ou se a cadeia não chamar `/process-next` como esperado.

Correção simples:
- No `/check`, depois da limpeza, se `running < 3` e existir job `queued`, o queue-manager tenta **processar a fila antes de autorizar um job novo iniciar direto**.
- Isso evita:
  - job novo “furar” quem já está na fila
  - fila ficar acumulando enquanto tem slot sobrando

---

## Arquivos que serão ajustados (sem criar novos)
1) `supabase/functions/runninghub-queue-manager/index.ts`
   - Aplicar `GLOBAL_MAX_CONCURRENT = 3`
   - Rodar `cleanup_all_stale_ai_jobs()` no começo de:
     - `/check`
     - `/process-next`
     - `/check-user-active`
   - Se cancelou algo: `updateAllQueuePositions()`
   - Ajustar retorno de `/check` para refletir `maxConcurrent: 3` e `slotsAvailable` baseado em 3
   - Fazer “drain” da fila quando houver slot livre (prioriza fila)

2) (Revisão rápida, mudanças mínimas só se necessário) nas funções de ferramenta:
   - `supabase/functions/runninghub-upscaler/index.ts`
   - `supabase/functions/runninghub-pose-changer/index.ts`
   - `supabase/functions/runninghub-veste-ai/index.ts`
   - `supabase/functions/runninghub-video-upscaler/index.ts`
   
   Objetivo: garantir que elas:
   - **sempre** consultem `/runninghub-queue-manager/check` antes de decidir
   - só chamem `/enqueue` quando `/check` disser que não tem slot (>=3 rodando)
   - não usem nenhum “MAX_CONCURRENT local” que conflite com o manager

(Não vou “migrar padrão” nem mexer no bootstrap/serve/imports além do necessário, seguindo sua regra crítica.)

---

## Como vamos validar (pra você ter certeza que acabou)
### 1) Teste de concorrência (regra dos 3)
- Disparar 4 jobs rapidamente (pode ser em abas/usuários diferentes).
- Esperado:
  - 3 ficam `running`
  - 1 fica `queued` (posição 1)
- Ao completar 1 job:
  - `/process-next` roda
  - o `queued` vira `running` automaticamente

### 2) Teste de “travou”
- Forçar um job a ficar sem callback (simulação prática: instabilidade do provedor).
- Após passar de 10 min, no próximo `/check` de qualquer usuário:
  - `cleanup_all_stale_ai_jobs()` marca como `failed` + estorna
  - slots voltam ao normal
  - fila volta a comportar

### 3) Conferência no seu painel (como na imagem)
- “Fila?” só aparece quando realmente foi o 4º.
- Não deve mais existir cenário de “2 na fila” sem ter 3 rodando de verdade.

---

## Ação do seu lado (só se você suspeitar de site desatualizado)
Como você usa PWA/cache, pode acontecer de algum cliente estar com build antigo.
Para garantir:
- Peça para o cliente fazer “hard refresh” (Ctrl+F5) ou abrir em aba anônima.
- Se ele “instalou” como app, remover e abrir de novo pelo navegador.

(As correções principais são backend, então mesmo com frontend antigo a fila/limpeza já melhora drasticamente.)

---

## Resultado final
- Fila só existe quando realmente tem 3 jobs rodando; o próximo vira o 4º.
- “Processamento eterno” deixa de quebrar o sistema porque é limpo automaticamente no fluxo normal (sem cron, sem serviço extra).
- Menos cancelamento manual e menos “erro pra caramba” na operação.
