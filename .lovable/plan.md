## 🔎 Diagnóstico Completo (verificado direto no DB)

Investiguei a fundo o painel de colaboradores (`PartnerEarningsAdminContent.tsx`) e os dados reais. Achei **bugs reais**, mas alguns diferentes do que parecia à primeira vista:

### ✅ O que JÁ está correto (não preciso mexer)
A UI **já está somando** `unlock + tool + bonus` no `total_earned` (linha 148). Os dados na fonte de verdade batem com a soma:
- **Hérica:** unlock R$0,12 (2) + tool R$0,84 (6 jobs) = **R$0,96** ✓ — exatamente o que a UI exibe.

### 🐛 Bug #1 (CRÍTICO) — Jobs de parceiros NÃO geram earning
Rodei query nos últimos 30 dias só do Arcano Cloner: **6 jobs concluídos com prompt de parceiro, mas só 4 geraram registro em `collaborator_tool_earnings`. 2 jobs sumiram (33% de perda).**

Isso é o bug raiz que o admin está sentindo: ele vê o colaborador usando a ferramenta no log, mas o "R$ Ferramentas" e "Jobs IA" do painel ficam menores que a realidade. Não é a UI que está errada, é o **registro do earning na hora do job** que está falhando silenciosamente.

Possíveis causas (preciso confirmar com `rg` em default mode):
- Edge functions/triggers só registram earning quando o job termina via webhook completo, mas alguns jobs usam path alternativo (queue manager, fallback, retry) que esquece de chamar `register_collaborator_tool_earning`
- Race condition: o job marca `completed` antes do hook de earning rodar
- A versão antiga sobrecarregada da RPC (já dropada na migration anterior) pode ter deixado órfãos

### 🐛 Bug #2 — Faltam outras ferramentas no tracking
A tabela `collaborator_tool_earnings` só tem registros de 3 tools: `arcano_cloner_jobs`, `veste_ai_jobs`, `pose_changer_jobs`. Mas o `ai_tool_registry` lista **15 ferramentas ativas** (Upscaler, Flyer Maker, Gerar Imagem, Gerar Vídeo, Seedance, MovieLed, etc).

Se um colaborador subir prompt categorizado em "Movies para Telão" (MovieLed) ou "Logos" (Gerar Imagem) e usuários usarem, **nenhum earning é gerado**. O sistema precisa cobrir todas as tools que aceitam `reference_prompt_id` (ou equivalente) de partner_prompts.

### 🐛 Bug #3 — Cards de "Visão Geral" no detalhe do colaborador
Na aba "Extrato por Colaborador" (linhas 577-596) os 4 cards do topo NÃO mostram o breakdown novo (unlock vs tool vs bonus); só mostra "Saldo Bruto / Disponível / Prompts Copiados / PIX". O breakdown real existe mais abaixo (linhas 598-614) mas fica meio escondido. Reordenar pra deixar tudo no topo.

### 🐛 Bug #4 — Mensagem confusa no extrato
Linha 654 e 686: quando filtra por período, mostra "Nenhum prompt copiado" e "X prompts copiados" mesmo quando o registro é de tool_usage ou bonus. Texto desatualizado.

### 🐛 Bug #5 — Ranking ignora tool earnings
Linhas 504, 510-512, 525: o ranking "Por Prompts Copiados" e os subtítulos usam só `total_unlocks` (= count de prompt clicks), ignorando `tool_jobs`. Adicionar opção "Por Usos em IA" e mostrar ambos nos subtítulos.

---

## 🛠️ Plano de Correção

### Fase 1 — Auditoria de earnings perdidos (default mode, com `rg`)
1. Localizar TODAS as Edge Functions / triggers que finalizam jobs de IA das 15 tools
2. Para cada uma, verificar se chama `register_collaborator_tool_earning` quando `reference_prompt_id` (ou coluna equivalente) aponta pra um `partner_prompts` aprovado
3. Mapear quais tools têm a coluna de referência ao prompt:
   - `arcano_cloner_jobs.reference_prompt_id` ✓
   - Verificar: `pose_changer_jobs`, `veste_ai_jobs`, `flyer_maker_jobs`, `image_generator_jobs`, `video_generator_jobs`, `seedance_jobs`, `movieled_maker_jobs`, `character_generator_jobs`, `cinema_projects`, etc
4. Criar relatório SQL: para cada tool com prompt_ref, contar `jobs concluídos com partner_prompt vs earnings registrados`

### Fase 2 — Backfill dos earnings perdidos (migration SQL)
Criar função `backfill_collaborator_tool_earnings()` que percorre cada tabela de jobs registrada no `ai_tool_registry`, identifica jobs concluídos com `reference_prompt_id` apontando pra `partner_prompts.approved=true`, e gera o registro em `collaborator_tool_earnings` se ainda não existir (idempotente via `job_id + tool_table` unique).

Executar uma vez para corrigir todo o histórico.

### Fase 3 — Garantir registro automático para o futuro
Opção A (mais segura): criar **trigger AFTER UPDATE** em cada tabela de jobs do registry que, quando `status` muda pra `completed` E há `reference_prompt_id` ligado a `partner_prompts`, chama a RPC `register_collaborator_tool_earning`. Trigger é idempotente (já existe constraint pra evitar duplicação).

Opção B: corrigir as Edge Functions uma a uma (mais frágil, alto risco de esquecer alguma).

→ Vou recomendar **Opção A** (trigger) por ser à prova de bala.

### Fase 4 — Reescrever `reconcile_collaborator_balances` ainda mais robusta
Já foi reescrita pra somar 3 fontes na migration anterior. Adicionar agora:
- Recalcular `total_unlocks` como contagem de `collaborator_unlock_earnings`
- Recalcular `total_tool_jobs` (nova coluna em `collaborator_balances`?) ou só deixar a UI calcular dinâmico
- Usar `bigint` nos `SUM()` pra evitar overflow

### Fase 5 — UI: melhorias no painel admin (`PartnerEarningsAdminContent.tsx`)
1. **Aba "Extrato por Colaborador":** mover os 3 cards de breakdown (Unlocks / Ferramentas / Bônus) para o topo, junto com Saldo Bruto, ao invés de ficarem em uma segunda linha. Adicionar card "Total: X jobs IA + Y prompts copiados".
2. **Lista de earnings:** trocar texto "Nenhum prompt copiado" por "Nenhum ganho neste período"; trocar "X prompts copiados" no rodapé por "X ganhos (Y prompts + Z jobs IA + W bônus)"
3. **Ranking:** adicionar critério "Por Jobs IA" e mostrar `tool_jobs` também nos subtítulos
4. **Card "Visão Geral":** adicionar coluna "Total Atividade" = `total_unlocks + tool_jobs` pra ranking simples
5. **Botão "Forçar Reconciliação"** já existe na aba Reconciliação — verificar que aponta pra função nova

### Fase 6 — Adicionar trigger de auto-update do balance
Criar triggers AFTER INSERT em `collaborator_unlock_earnings`, `collaborator_tool_earnings` e `partner_bonus_payments` que atualizam `collaborator_balances.total_earned` em tempo real. Assim nunca mais dessincroniza.

### Fase 7 — Bump de versão
Incrementar `APP_BUILD_VERSION` em `Index.tsx` para `1.2.0` (mudança grande).

---

## 📊 Resultado esperado
- ✅ Todos os jobs de IA usando prompts de parceiros geram earning automaticamente (trigger no DB)
- ✅ Backfill corrige histórico de jobs perdidos (estimativa: ~30%+ de earnings recuperados)
- ✅ Balance fica sempre em sincronia (triggers de atualização)
- ✅ UI do admin mostra breakdown completo no topo do extrato
- ✅ Ranking inclui jobs IA
- ✅ Reconciliação manual continua funcionando como rede de segurança

## ⚠️ Atenção
A Fase 1 (auditoria) pode revelar que algumas tools não têm coluna de `reference_prompt_id` e precisam ser instrumentadas — nesse caso vou listar e perguntar antes de mexer no schema delas.

Aprova esse plano completo?