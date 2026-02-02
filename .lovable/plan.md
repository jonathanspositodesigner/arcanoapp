

# Plano: Painel de Monitoramento de Emails de Boas-Vindas

## Status Atual do Sistema

### Verificação Completa Realizada

| Plataforma | Emails Enviados | Emails Pendentes | Status |
|------------|-----------------|------------------|--------|
| Artes-Eventos (Greenn BR) | 8/8 | 0 | OK |
| Hotmart ES | Alguns | ~12 pendentes | Problema anterior |
| App | OK | 0 | OK |

A correção do `dedup_key` funcionou para os webhooks Greenn. Os emails pendentes da Hotmart ES são de compras anteriores ao sistema de tracking.

---

## Implementação do Painel

### Componente Principal: `WelcomeEmailsMonitor.tsx`

Um novo componente que será integrado diretamente na página inicial do admin (`AdminHub`) mostrando:

```text
+------------------------------------------------------------------+
|  MONITORAMENTO DE EMAILS DE BOAS-VINDAS              [Atualizar] |
+------------------------------------------------------------------+
|                                                                  |
|  +----------+  +----------+  +----------+  +----------+          |
|  | ENVIADOS |  | PENDENTE |  |  FALHAS  |  |  ABERTOS |          |
|  |    156   |  |    0     |  |    2     |  |    89    |          |
|  +----------+  +----------+  +----------+  +----------+          |
|                                                                  |
|  Filtros: [Hoje] [7 dias] [15 dias] [30 dias] [Personalizado]    |
|                                                                  |
+------------------------------------------------------------------+
|  TABELA: Últimas Compras vs Status Email                        |
+------------------------------------------------------------------+
| Data/Hora | Email              | Plataforma  | Produto | Status  |
|-----------|--------------------| ------------|---------|---------|
| 15:27     | markinhosky@...    | artes-even. | Upscal. | ENVIADO |
| 15:20     | gg.grafica@...     | artes-even. | Upscal. | ENVIADO |
| 15:06     | marshall...        | hotmart-es  | Upscal. | PENDENTE|
+------------------------------------------------------------------+
```

### Funcionalidades

1. **Cards de Estatísticas**
   - Total de emails enviados no período
   - Pendentes (compras sem email correspondente)
   - Falhas de envio
   - Taxa de abertura (opens)

2. **Filtros de Período**
   - Hoje (default ao abrir)
   - 7 dias
   - 15 dias  
   - 30 dias
   - Personalizado (date range picker)

3. **Botão de Atualizar**
   - Refetch dos dados em tempo real
   - Ícone de loading enquanto carrega

4. **Tabela Cruzada**
   - Cruza `webhook_logs` (compras) com `welcome_email_logs`
   - Mostra status: ENVIADO, PENDENTE, FALHA
   - Badge colorido para status visual

### Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/WelcomeEmailsMonitor.tsx` | CRIAR | Componente principal do painel |
| `src/pages/AdminHub.tsx` | MODIFICAR | Integrar o monitor na página inicial |

### Query SQL para Cruzamento

A lógica principal usa LEFT JOIN para identificar compras sem email:

```sql
-- Compras bem-sucedidas (status paid/PURCHASE_COMPLETE)
-- LEFT JOIN com welcome_email_logs
-- Identifica: ENVIADO, PENDENTE, FALHA
```

### Tecnologias

- React Query para fetch e cache
- date-fns para formatação de datas
- Radix Popover + Calendar para range personalizado
- Tabela reutilizando componentes UI existentes

---

## Detalhes Técnicos

### Estrutura do Componente

```tsx
interface EmailMonitorStats {
  sent: number;
  pending: number;
  failed: number;
  opened: number;
  openRate: number;
}

interface PurchaseEmailStatus {
  email: string;
  platform: string;
  productId: number;
  purchaseTime: string;
  emailStatus: 'sent' | 'pending' | 'failed';
  emailSentAt?: string;
}
```

### Filtros de Período

```tsx
type PeriodFilter = 'today' | '7' | '15' | '30' | 'custom';

const [period, setPeriod] = useState<PeriodFilter>('today');
const [customRange, setCustomRange] = useState<DateRange>();
```

### Integração no AdminHub

O componente será adicionado como primeiro elemento na página inicial do admin hub, antes dos outros cards de navegação.

