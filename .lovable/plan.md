

# Dashboard de Logs Meta CAPI + Persistência de Eventos

## Visão Geral

Criar uma tabela `meta_capi_logs` para registrar todos os eventos enviados ao Meta CAPI, e um novo painel "PIXEL/CAPI" no Admin Hub para monitorar em tempo real se os eventos estão sendo enviados corretamente, com detalhes de fbp, fbc, event_id, UTMs e status da resposta do Facebook.

Também corrigir o `webhook-pagarme` que **não envia fbp, fbc nem client_user_agent** no evento Purchase (atualmente envia sem esses campos).

## Mudanças

### 1. Tabela `meta_capi_logs` (migration)
```sql
CREATE TABLE public.meta_capi_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  email text,
  value numeric,
  currency text DEFAULT 'BRL',
  event_id text,
  fbp text,
  fbc text,
  client_ip_address text,
  client_user_agent text,
  utm_data jsonb,
  event_source_url text,
  meta_response_status integer,
  meta_response_body text,
  success boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.meta_capi_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view meta_capi_logs"
ON public.meta_capi_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
```

### 2. Atualizar Edge Function `meta-capi-event`
- Após enviar o evento ao Facebook, **inserir um registro** na tabela `meta_capi_logs` com todos os dados: event_name, email, value, fbp, fbc, event_id, utm_data, client_ip, user_agent, status da resposta do Meta, e se foi sucesso ou não.

### 3. Corrigir `webhook-pagarme` — Purchase CAPI
- Atualmente o Purchase no webhook NÃO envia `fbp`, `fbc` nem `client_user_agent` (linhas 829-837). Esses dados precisam ser armazenados na `asaas_orders` no momento do checkout para serem recuperados no webhook.
- **Adicionar colunas** `meta_fbp`, `meta_fbc`, `meta_user_agent` na `asaas_orders`.
- **Atualizar `create-pagarme-checkout`** para salvar fbp, fbc e user_agent na ordem.
- **Atualizar `webhook-pagarme`** para ler esses campos da ordem e enviá-los no CAPI Purchase.

### 4. Novo componente: `MetaCapiLogsContent.tsx`
Dashboard no Admin Hub com:
- **Cards resumo**: Total de eventos hoje, InitiateCheckout hoje, Purchase hoje, taxa de sucesso
- **Tabela de logs** com colunas: Data/Hora, Evento, Email, Valor, event_id, fbp (✅/❌), fbc (✅/❌), User-Agent (✅/❌), UTMs (expandível), Status Meta, Sucesso
- **Filtros**: Por evento (InitiateCheckout/Purchase), por período, por sucesso/erro
- **Indicadores visuais**: Verde para dados presentes, vermelho para ausentes — permitindo ver rapidamente se fbp/fbc estão chegando

### 5. Adicionar ao Admin Hub
- Nova view `"pixel"` no `HubViewType`
- Novo item no `AdminHubSidebar`: "PIXEL / CAPI" com ícone `Activity`
- Renderizar `MetaCapiLogsContent` quando `activeView === "pixel"`

## Resultado
- Cada evento CAPI ficará registrado com todos os detalhes
- Você poderá ver se fbp/fbc estão presentes (match rate)
- UTMs de cada venda ficam visíveis para verificar atribuição
- Erros do Meta API ficam registrados para debugging
- Purchase agora enviará fbp/fbc/user_agent corretamente

