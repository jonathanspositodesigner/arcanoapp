
Objetivo: blindar o fluxo de geração de checkout do Pagar.me (incluindo /prevenda-pack4) para reduzir falhas, reduzir demora percebida e evitar “ordens penduradas”.

Diagnóstico já verificado
- O erro crítico anterior (`PAGARME_API_URL is not defined`) já foi corrigido e os logs recentes mostram checkouts sendo criados.
- Ainda existem riscos reais no código atual:
  1) falhas transitórias de gateway/rede sem retry inteligente;
  2) ordens ficam `pending` sem `asaas_payment_id` quando a chamada falha após criar ordem interna;
  3) ausência de idempotência (risco de duplicar cobrança em reenvio/retry);
  4) alguns `catch` no frontend são silenciosos (usuário clica e não sabe o que aconteceu);
  5) modal de pré-checkout ainda pode ser fechado durante processamento (abandono/confusão).

Plano de implementação (em fases)

Fase 1 — Hotfix de robustez imediata (prioridade máxima)
1. Hardening do `create-pagarme-checkout`:
   - Adicionar `request_id`/`idempotency_key` por tentativa.
   - Enviar idempotência para o gateway (mesmo id em retries).
   - Retry controlado para erros transitórios (timeout/rede/429/5xx), com backoff curto.
   - Timeout por tentativa + limpeza do timer em `finally`.
   - Normalização mais tolerante de telefone (tratar prefixo 55) e validação consistente de CPF/email.
   - Em qualquer falha final: atualizar a ordem para `failed` (em vez de deixar `pending` sem payment id).

2. Tratamento de erro explícito para usuário:
   - Resposta padronizada com `error_code`, `message`, `request_id`.
   - Frontend mostra erro claro e reaproveita `request_id` para suporte.

3. Frontend sem falhas silenciosas:
   - Nos fluxos de compra (`PricingCardsSection`, `Planos2`, `PlanosArtes`, `PlanosArtesMembro`, `PreCheckoutModal`), remover `catch` “mudo”.
   - Se falhar leitura de perfil, abrir pré-checkout como fallback + aviso visual.
   - Bloquear fechamento do modal enquanto `loading/isSubmitting`.

Fase 2 — Integridade e recuperação automática
4. Banco (migração):
   - Adicionar metadados de tentativa em `asaas_orders` (ex.: `checkout_request_id`, `gateway_error_code`, `gateway_error_message`, `last_attempt_at`).
   - Criar índice para monitorar rapidamente ordens problemáticas (`status`, `asaas_payment_id`, `created_at`).
   - Função de saneamento para marcar como `failed` ordens `pending` sem `asaas_payment_id` após janela de segurança.

5. Resiliência de fallback (anti-timeout extremo):
   - Implementar modo fila para contingência:
     - função principal enfileira quando o gateway estiver instável;
     - worker processa em background;
     - cliente recebe `job_id` e faz polling até obter `checkout_url`.
   - Estratégia híbrida: tentar síncrono primeiro (rápido), cair para fila apenas em indisponibilidade transitória.

Fase 3 — Validação operacional
6. Testes e validação ponta a ponta:
   - Cenários obrigatórios:
     - sucesso PIX e cartão;
     - timeout simulado + retry;
     - falha de gateway 5xx;
     - repetição de clique/reenvio (idempotência);
     - perfil incompleto/inválido;
     - fluxo específico `/prevenda-pack4`.
   - Confirmar que não nasce nova ordem “pendurada” sem payment id em falhas.

Resultado esperado
- Queda forte nas falhas de criação de checkout.
- Menos demora percebida (retry curto + fallback estruturado).
- Sem ordens órfãs pendentes.
- Fluxo previsível para usuário e suporte com `request_id` rastreável.
