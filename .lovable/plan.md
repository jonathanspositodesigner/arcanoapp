
# Plano de Limpeza: Simplificar Dashboards (Manter Métricas Essenciais)

## Resumo

Você quer **manter apenas estas métricas**:
1. ✅ **Instalações de Aplicativo** (total, mobile, desktop)
2. ✅ **Notificações Push Ativadas** (dispositivos inscritos)
3. ✅ **Pessoas que já trocaram a senha** (primeiro acesso concluído)
4. ✅ **Pessoas que faltam trocar a senha** (primeiro acesso pendente)
5. ✅ **Cliques nos prompts** (para exibir aos usuários nos cards)

E **remover todos os gráficos pesados e métricas complexas**.

---

## O Que Será MANTIDO

| Item | Localização |
|------|-------------|
| Hook `useInstallTracker` | Continua gravando instalações no banco |
| Página `AdminInstallStats.tsx` | Já existe, mostra instalações |
| Componente `PushNotificationsContent.tsx` | Conta dispositivos inscritos |
| Lógica de `firstAccessStats` | Extraída do AdminAnalyticsDashboard |
| Hook `usePromptClickTracker` | Registra cliques para exibir aos usuários |

---

## O Que Será REMOVIDO ou SIMPLIFICADO

### 1. Componentes Pesados a DELETAR

| Arquivo | Linhas | Motivo |
|---------|--------|--------|
| `src/components/AdminAnalyticsDashboard.tsx` | ~2000 | Substituir por componente leve com apenas as 4 métricas |
| `src/components/AdminGeneralDashboard.tsx` | ~624 | Gráficos de acessos, pico de horário, etc. |
| `src/components/GridDashboard.tsx` | ~80 | Sistema de grid drag-and-drop |
| `src/components/GridCard.tsx` | ~40 | Card wrapper do grid |
| `src/components/HubGeneralMarketing.tsx` | ~300 | Métricas de marketing consolidadas |

### 2. Hooks a DELETAR

| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useDashboardGrid.ts` | Layout do grid arrastável |

### 3. Métricas a REMOVER (do AdminAnalyticsDashboard)

- ❌ Acessos de hoje / período (page_views)
- ❌ Gráfico de evolução de acessos
- ❌ Horário de pico de acessos
- ❌ Média de acessos por dia
- ❌ Taxa de conversão
- ❌ Compras por hora
- ❌ Top prompts/artes mais clicados (admin só)
- ❌ Top categorias
- ❌ Top packs comprados
- ❌ Estatísticas de reembolso
- ❌ Checkouts abandonados (já tem página própria)
- ❌ Links de coleção
- ❌ Usage por plano

---

## Novo Componente Simplificado

Vou criar um componente **`AdminSimpleMetrics.tsx`** com apenas:

```text
┌─────────────────────────────────────────────────────────────┐
│                    MÉTRICAS ESSENCIAIS                      │
├──────────────────┬──────────────────┬───────────────────────┤
│  📱 INSTALAÇÕES  │  🔔 PUSH ATIVO   │   🔑 PRIMEIRO ACESSO  │
│      Total: 234  │  Inscritos: 156  │  ✅ Trocaram: 412     │
│  Mobile: 180     │                  │  ⏳ Pendentes: 88     │
│  Desktop: 54     │                  │                       │
└──────────────────┴──────────────────┴───────────────────────┘
```

**Código do componente:**
- Busca `app_installations` para instalações
- Busca `push_subscriptions` (count) para push ativados
- Busca `profiles` com `password_changed` para primeiro acesso

---

## Alterações no AdminHub.tsx

**Antes:**
```tsx
case "dashboard":
  return <AdminGeneralDashboard />;
case "marketing":
  return <HubGeneralMarketing onNavigate={handleViewChange} />;
```

**Depois:**
```tsx
case "dashboard":
  return <AdminSimpleMetrics />;
// case "marketing": REMOVIDO
```

---

## Alterações no AdminHubSidebar.tsx

**Remover do menu:**
- ❌ "MARKETING GERAL" (não terá mais esse componente)

**Manter no menu:**
- ✅ HOME
- ✅ DASHBOARD GERAL (agora mostra métricas simples)
- ✅ GERENCIAR PARCEIROS
- ✅ REMARKETING
- ✅ ADMINISTRADORES
- ✅ EMAILS DE BOAS-VINDAS

---

## Alterações nas Páginas de Dashboard por Plataforma

As páginas `PromptsDashboard.tsx`, `ArtesEventosDashboard.tsx` e `ArtesMusicosDashboard.tsx` serão simplificadas para mostrar apenas as 4 métricas relevantes para aquela plataforma, sem gráficos.

---

## Resumo do Impacto

| Métrica | Valor |
|---------|-------|
| Arquivos deletados | 5 componentes + 1 hook |
| Arquivos criados | 1 (AdminSimpleMetrics.tsx) |
| Arquivos modificados | 4 (AdminHub, Sidebar, e 3 dashboards de plataforma) |
| Linhas removidas | ~3.500 |
| Redução de complexidade | Significativa (sem recharts, sem grids arrastáveis) |

---

## Ordem de Execução

1. Criar componente `AdminSimpleMetrics.tsx` com as 4 métricas
2. Modificar `AdminHub.tsx` para usar o novo componente
3. Modificar `AdminHubSidebar.tsx` para remover "Marketing Geral"
4. Simplificar as 3 páginas de dashboard de plataforma
5. Deletar componentes pesados antigos
6. Deletar hook `useDashboardGrid.ts`

---

## Seção Técnica

### Queries que serão mantidas:

```sql
-- Instalações
SELECT device_type FROM app_installations;

-- Push subscriptions (count)
SELECT COUNT(*) FROM push_subscriptions;

-- Primeiro acesso
SELECT id, email, name, password_changed FROM profiles WHERE email IS NOT NULL;
```

### Dependências que podem ser removidas do bundle (opcional, futuro):
- `recharts` (se não for usado em outro lugar)
- `react-grid-layout` (se não for usado em outro lugar)

