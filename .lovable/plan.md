

## Modal de Login com 3 Geracoes Gratuitas no Arcano Cloner

### Resumo

Quando um usuario nao logado chega na pagina do Arcano Cloner vindo da Biblioteca de Prompts (com `referenceImageUrl` no state), apos 2 segundos aparece um modal oferecendo 3 geracoes gratuitas em troca do login/cadastro. Toda a autenticacao acontece dentro do modal, sem sair da pagina. Apos login bem-sucedido, o sistema concede 3 geracoes (creditos) apenas se o usuario nao for premium, nunca comprou creditos avulsos, e nunca recebeu esse bonus antes.

---

### Etapa 1 -- Tabela de controle (migracao)

Criar tabela `arcano_cloner_free_trials` para garantir que cada email receba o bonus apenas uma vez:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | Identificador |
| user_id | uuid NOT NULL | Referencia ao usuario |
| email | text NOT NULL UNIQUE | Email (chave de deduplicacao) |
| credits_granted | integer | Quantidade concedida |
| created_at | timestamptz | Data da concessao |

RLS: apenas admins e service_role podem ler/escrever. O frontend nao acessa essa tabela diretamente.

---

### Etapa 2 -- Edge Function `claim-arcano-free-trial`

Endpoint que recebe o `userId` do usuario autenticado e executa:

1. Verifica se o email ja esta na tabela `arcano_cloner_free_trials` -- se sim, retorna `{ already_claimed: true }`
2. Verifica se o usuario e premium (`premium_users` com `is_active = true`) -- se sim, retorna `{ is_premium: true }`
3. Verifica se o usuario ja comprou creditos avulsos (verifica `upscaler_credit_transactions` com `transaction_type` diferente de tipos gratuitos, ou verifica se `lifetime_balance > 0` na `upscaler_credits`) -- se sim, retorna `{ has_purchased: true }`
4. Se passou todas as validacoes:
   - Cria/atualiza registro em `upscaler_credits` adicionando os creditos ao `monthly_balance`
   - Registra transacao em `upscaler_credit_transactions`
   - Insere registro em `arcano_cloner_free_trials`
   - Retorna `{ success: true, credits_granted: 3 * creditCost }`

O custo por geracao sera lido de `app_settings` (chave do Arcano Cloner) para calcular `3 * creditCost`.

---

### Etapa 3 -- Componente `ArcanoClonerAuthModal`

Novo componente em `src/components/arcano-cloner/ArcanoClonerAuthModal.tsx`:

- Usa `useUnifiedAuth` com configuracao para nao navegar para fora (o `defaultRedirect` aponta para `/arcano-cloner-tool`, e `onLoginSuccess` / `onSignupSuccess` chamam callback em vez de navegar)
- Modal com visual roxo (variant `purple`) para combinar com o Arcano Cloner
- Header: icone de presente + "Ganhe 3 geracoes gratuitas!" + "Faca login ou crie sua conta"
- Conteudo: Tabs Login/Cadastro usando os componentes reutilizaveis `LoginEmailStep`, `LoginPasswordStep`, `SignupForm`
- Ao fechar o modal, usuario continua na pagina normalmente (sem creditos)
- Tela de sucesso pos-signup mostrando "Verifique seu email"

---

### Etapa 4 -- Integracao no ArcanoClonerTool.tsx

Logica no componente principal:

1. Detectar se usuario veio da Biblioteca de Prompts: `location.state?.referenceImageUrl` existe
2. Detectar se usuario nao esta logado: `!user` e `!isLoading`
3. Apos 2 segundos, abrir o `ArcanoClonerAuthModal`
4. Quando o usuario faz login com sucesso (callback `onAuthSuccess`):
   - Chamar edge function `claim-arcano-free-trial`
   - Se sucesso, mostrar toast "3 geracoes gratuitas adicionadas!"
   - Atualizar creditos via `refetchCredits()`
   - Fechar modal

---

### Arquivos criados/modificados

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Criar tabela `arcano_cloner_free_trials` |
| `supabase/functions/claim-arcano-free-trial/index.ts` | Nova edge function |
| `src/components/arcano-cloner/ArcanoClonerAuthModal.tsx` | Novo componente modal |
| `src/pages/ArcanoClonerTool.tsx` | Timer de 2s + modal + callback |

### Observacoes tecnicas

- O `useUnifiedAuth` precisa ser customizado no modal para nao redirecionar via `navigate()` -- o `onLoginSuccess` fecha o modal e dispara a claim
- O fluxo de primeiro acesso (sem senha) que redireciona para `/change-password` sera tratado normalmente -- o usuario volta depois e pode tentar novamente
- A verificacao de "comprou creditos avulsos" checara registros em `upscaler_credit_transactions` com `transaction_type` em ('purchase', 'admin_add', 'promo') ou `lifetime_balance > 0`
- Os creditos serao adicionados como `monthly_balance` para serem consumidos primeiro

