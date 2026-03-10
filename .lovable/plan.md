

## Nova Tela "Vendas" no Admin Hub

### Resumo
Criar uma nova seção "VENDAS" no menu lateral do Admin Hub com listagem completa de vendas, filtro por período, 20 itens por página, e modal de detalhes com ações administrativas (reenviar email, trocar email, resetar senha, mudar nome, mudar WhatsApp).

### Arquivos a criar/modificar

**1. `src/components/AdminHubSidebar.tsx`**
- Adicionar `"sales"` ao tipo `HubViewType`
- Novo item no menu: "VENDAS" com ícone `Receipt` entre "REMARKETING" e "ADMINISTRADORES"

**2. `src/pages/AdminHub.tsx`**
- Adicionar case `"sales"` no `renderContent()` renderizando o novo componente `<SalesManagementContent />`

**3. `src/components/admin/SalesManagementContent.tsx`** (NOVO)
- Filtro por período (presets: hoje, 7d, 30d, 90d, personalizado com datepicker)
- Busca por email/nome/produto
- Tabela com 20 itens por página usando `get_unified_dashboard_orders`
- Colunas: Data, Nome, Email, Produto, Plataforma, Pagamento, Valor, Status
- Linhas clicáveis abrindo modal de detalhes
- Paginação completa

**4. `src/components/admin/SaleDetailDialog.tsx`** (NOVO)
- Dialog/Sheet mostrando todos os detalhes da venda:
  - Dados da transação (ID, data, valor bruto/líquido, método pagamento, plataforma, produto, UTM)
  - Dados do cliente (nome, email, WhatsApp)
- Seção de ações administrativas:
  - **Reenviar email de acesso**: invoca edge function existente de welcome email
  - **Trocar email**: campo editável + update no profiles
  - **Resetar senha**: invoca `send-recovery-email`
  - **Mudar nome**: campo editável + update no profiles  
  - **Mudar WhatsApp**: campo editável + update no profiles

**5. `supabase/functions/admin-manage-user/index.ts`** (NOVO)
- Edge function para ações admin sobre usuários
- Ações: `update_profile` (nome, email, whatsapp), `resend_welcome_email`, `send_password_reset`
- Validação de role admin via service_role
- Busca perfil por email, atualiza campos solicitados

### Fluxo
1. Admin clica em "VENDAS" no sidebar
2. Vê lista de vendas com filtros de período e busca
3. Clica em uma venda → abre dialog com detalhes completos
4. No dialog, pode executar ações sobre o cliente (reenviar email, editar dados, resetar senha)

### Detalhes técnicos
- Reutiliza o RPC `get_unified_dashboard_orders` já existente
- Enriquece com dados de `profiles` (nome, whatsapp) como o `LatestSales` já faz
- A edge function `admin-manage-user` usa `SUPABASE_SERVICE_ROLE_KEY` para atualizar perfis e disparar emails
- Todos os filtros de status incluem paid, pending e refunded (diferente do LatestSales que mostra só paid)

