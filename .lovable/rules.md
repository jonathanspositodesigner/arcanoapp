# REGRAS ABSOLUTAS DO PROJETO

## 🚨 REGRA #1 — NUNCA QUEBRAR O QUE JÁ FUNCIONA

Antes de QUALQUER alteração em código, banco de dados, RPCs, edge functions ou migrations:

1. **Analise o impacto completo**: Identifique TODOS os consumidores (edge functions, hooks, páginas, RPCs) que dependem do que será alterado.
2. **Se houver QUALQUER risco de quebrar funcionalidade existente**: NÃO FAÇA A ALTERAÇÃO. Avise o usuário sobre o risco e peça aprovação explícita.
3. **Nunca reescreva funções do banco (RPCs) sem preservar 100% da interface e dos campos obrigatórios** (ex: `balance_after`, `credit_type`, `transaction_type` na tabela `upscaler_credit_transactions`).
4. **Nunca remova colunas, altere NOT NULL constraints, ou mude assinaturas de RPCs** sem auditoria completa de todos os chamadores.
5. **Teste ANTES de entregar**: Valide que o fluxo completo (consumo de créditos → execução do job → webhook → finalização) continua funcionando.

## Consequências de violação
- Upscaler Arcano, Arcano Cloner, Gerar Vídeo, MovieLed Maker, Cinema Studio, e TODAS as ferramentas de IA dependem do sistema de créditos centralizado.
- Uma alteração mal feita em `consume_upscaler_credits` ou `refund_upscaler_credits` derruba TODAS as ferramentas simultaneamente.

## Checklist obrigatório antes de qualquer migration:
- [ ] Listei todos os campos NOT NULL da tabela afetada
- [ ] Verifiquei que o INSERT/UPDATE preenche TODOS os campos obrigatórios
- [ ] Confirmei que a coluna `balance` em `upscaler_credits` é atualizada junto com `monthly_balance` e `lifetime_balance`
- [ ] Testei a RPC com um SELECT direto antes de entregar
