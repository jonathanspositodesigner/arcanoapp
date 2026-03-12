
Objetivo: corrigir o fluxo de `/sucesso-compra` para **nunca mandar para `/login`** nesse passo e seguir exatamente o que você pediu:
1) email já cadastrado → vai direto para `/`
2) email sem cadastro → define senha na própria página, faz login e vai para `/`

Diagnóstico rápido:
- O redirect do `/login` já está com fallback para `/`.
- O problema atual está em `src/pages/SucessoCompra.tsx`: hoje, quando encontra conta, ele ainda faz `navigate("/login")` em 2 caminhos.
- Por isso, depois de “Acessar meu conteúdo”, cai na tela de login.

Plano de implementação:

1) Reescrever o fluxo da `SucessoCompra` (frontend)
- Arquivo: `src/pages/SucessoCompra.tsx`
- Trocar o comportamento do submit para um fluxo em etapas:
  - Etapa A: valida email + chama `check_profile_exists`.
  - Se `exists_in_db = true`: **redirecionar direto para `/`** (sem passar por `/login`).
  - Se `exists_in_db = false`: abrir na mesma tela um formulário de senha (senha + confirmar senha).
- Remover totalmente os `navigate("/login")` desta página.
- Manter toasts claros para cada estado.

2) Criar onboarding seguro para “sem cadastro” (backend function)
- Criar nova função de backend pública (ex.: `complete-purchase-onboarding`), chamada pela `SucessoCompra`.
- Entrada: `email`, `password`, `order_id` (lido da URL `?order_id=...`).
- Validação de segurança:
  - Confirmar que existe pedido correspondente em `asaas_orders` para esse email e order id (via `asaas_payment_id` ou id interno, conforme disponível), com status permitido (`pending/paid`).
- Se válido:
  - Criar usuário com email confirmado (ou recuperar usuário órfão se já existir).
  - Definir a senha escolhida.
  - Upsert em `profiles` com `email_verified=true` e `password_changed=true`.
  - Vincular `asaas_orders.user_id` se faltar.
- Retornar sucesso para o frontend fazer login imediato.

3) Login automático após criação de senha
- Ainda em `SucessoCompra`:
  - Depois da função acima retornar sucesso, executar `signInWithPassword(email, password)`.
  - Em sucesso: `navigate("/")`.
  - Em falha: erro amigável pedindo nova tentativa.

4) Ajuste de robustez no checkout (para próximas compras)
- Arquivo: `supabase/functions/create-pagarme-checkout/index.ts`
- Incluir identificador interno no `success_url` (ex.: `internal_order_id`) para facilitar validação forte no onboarding quando necessário.
- Continuar aceitando `order_id` do gateway já existente.

Fluxo final esperado:
```text
/sucesso-compra
  -> digita email
    -> existe cadastro? sim -> /
    -> não existe -> mostra criar senha na mesma página
        -> cria conta + login -> /
```

Detalhes técnicos (resumo):
- Sem migração de banco.
- Sem mexer em arquivos gerados automaticamente.
- Segurança preservada no fluxo de criação de conta por compra (validação de pedido+email antes de criar/confirmar usuário).
- Escopo focado em `/sucesso-compra` (não altera o fluxo especial do upscaler).

Validação pós-implementação:
1) E-mail já cadastrado em `/sucesso-compra` redireciona para `/` sem passar em `/login`.
2) E-mail sem cadastro abre formulário de senha na própria página.
3) Após criar senha, login acontece automaticamente e vai para `/`.
4) Cenário inválido (order/email não batem) bloqueia criação e mostra mensagem correta.
