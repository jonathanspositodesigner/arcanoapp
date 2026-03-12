

## Problema

Quando o usuário digita o email na página `/sucesso-compra` e não existe conta (perfil) cadastrada, o sistema pula direto para o formulário de senha **sem verificar se existe uma compra real**. Se a pessoa nunca comprou, ela consegue chegar no passo de criar senha, e aí só falha no backend.

O correto é: ao digitar o email e clicar "Acessar meu conteúdo", **verificar imediatamente se existe pedido** para aquele email. Se não existir, mostrar uma tela de "Nenhuma compra encontrada" com botão de suporte WhatsApp.

## Plano

### 1. Criar novo step "not_found" no frontend

**Arquivo: `src/pages/SucessoCompra.tsx`**

- Adicionar um terceiro step: `type Step = "email" | "password" | "not_found"`
- No `handleEmailSubmit`, antes de ir para o step de senha, chamar o backend para verificar se existe pedido para aquele email
- Criar uma edge function leve ou reutilizar a `complete-purchase-onboarding` com um modo "check-only"

### 2. Criar edge function `check-purchase-exists`

**Arquivo: `supabase/functions/check-purchase-exists/index.ts`**

- Recebe `{ email, order_id }` (sem senha)
- Consulta `asaas_orders` pelo email (e opcionalmente order_id)
- Retorna `{ exists: true/false }`
- Sem criar conta, sem alterar nada — apenas verifica

### 3. Atualizar fluxo do `handleEmailSubmit`

Novo fluxo:
1. Verifica se perfil existe via `check_profile_exists`
2. Se existe → redireciona para `/` (sem mudança)
3. Se não existe → chama `check-purchase-exists` para ver se tem pedido
   - Se tem pedido → mostra step `"password"` (sem mudança)
   - Se **não tem pedido** → mostra step `"not_found"`

### 4. Tela do step "not_found"

Exibir na mesma página (sem redirecionar):
- Ícone de alerta (trocar o check verde por um ícone de atenção)
- Título: **"Nenhuma compra encontrada"**
- Texto: "Não encontramos nenhuma compra associada ao email **{email}**. Verifique se digitou o email correto."
- Subtexto: "Problemas com o pagamento?"
- Botão verde do WhatsApp: **"Falar com o suporte"** → link `https://wa.me/+5533988819891`
- Botão secundário: "← Tentar outro email" (volta para step "email")

### Fluxo final

```text
/sucesso-compra → digita email
  → perfil existe? → redireciona para /
  → perfil não existe → tem pedido no banco?
      → sim → mostra criar senha
      → não → mostra "Nenhuma compra encontrada" + WhatsApp
```

Nenhuma migração de banco necessária.

