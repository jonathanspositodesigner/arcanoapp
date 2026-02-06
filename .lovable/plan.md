
# Plano: Tabela Interativa de Rentabilidade de Ferramentas IA

## Resumo Executivo

Criar uma nova aba "RENTABILIDADE" no menu lateral do admin de prompts com uma tabela interativa que calcula automaticamente receita, custo e lucro de cada ferramenta de IA, usando dados reais do sistema.

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     TABELA INTERATIVA DE RENTABILIDADE              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  CONFIGURAÇÕES GLOBAIS                              [Editar] │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │   │
│  │  Receita por Crédito: R$ 0,00925 (auto: 99,90 ÷ 10800)     │   │
│  │  Custo por RH Coin:   R$ 0,002 (editável)                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  TABELA DE RENTABILIDADE                                     │   │
│  ├──────────────┬────────┬────────┬────────┬────────┬─────────┤   │
│  │ Operação     │Créditos│Custo RH│Receita │ Lucro  │ Margem  │   │
│  ├──────────────┼────────┼────────┼────────┼────────┼─────────┤   │
│  │ Upscaler     │   60   │ 31.55  │ R$0,56 │ R$0,49 │  88,2%  │   │
│  │ Upscaler Pro │   80   │ 42.10* │ R$0,74 │ R$0,66 │  89,0%  │   │
│  │ Pose Changer │   60   │ 11.80  │ R$0,56 │ R$0,53 │  95,8%  │   │
│  │ Veste AI     │   60   │ 18.33  │ R$0,56 │ R$0,52 │  93,4%  │   │
│  │ Video Upsc.  │  150   │ 44.75  │ R$1,39 │ R$1,30 │  93,5%  │   │
│  │ Arcano Cloner│   60   │ ~30*   │ R$0,56 │ R$0,39 │  70,5%  │   │
│  │              │        │        │+R$0,11 │        │(c/ API) │   │
│  └──────────────┴────────┴────────┴────────┴────────┴─────────┘   │
│                                                                     │
│  [+ Adicionar Nova Ferramenta]                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Fontes de Dados

| Dado | Origem | Atualização |
|------|--------|-------------|
| **Créditos cobrados** | Constantes no código (60, 80, 150) | Manual (você define) |
| **Custo RH médio** | `AVG(rh_cost)` das tabelas de jobs | Em tempo real (RPC) |
| **Receita por crédito** | Calculado: `99,90 / 10800 = 0,00925` | Editável no admin |
| **Custo por RH coin** | Valor fixo padrão: R$ 0,002 | Editável no admin |
| **Taxa API fixa** | Apenas Arcano Cloner (e futuras) | Checkbox + input |

### Dados Reais do Banco (Já Disponíveis)

Consultei o banco e encontrei as médias reais:

| Ferramenta | Jobs Completos | Média Custo RH | Média Créditos |
|------------|----------------|----------------|----------------|
| Upscaler Arcano | 137 | 31.55 coins | 60.87 |
| Pose Changer | 10 | 11.80 coins | 42.00 |
| Veste AI | 3 | 18.33 coins | 60.00 |
| Video Upscaler | 8 | 44.75 coins | 150.00 |

---

## Cálculos (Exatamente Como Você Definiu)

```text
Receita = créditos × receita_por_credito
Custo RH = custo_rh_medio × custo_por_rh_coin
Custo Total = Custo RH + Extra API (se houver)
Lucro = Receita - Custo Total
Margem = (Lucro / Receita) × 100%
```

---

## Arquivos a Criar/Modificar

### 1. Nova RPC para Médias por Ferramenta

```sql
-- Função: get_ai_tools_cost_averages
-- Retorna média de custo RH e créditos por ferramenta
```

Isso permitirá atualizar automaticamente a tabela com dados reais.

### 2. Novo Componente: `AIToolsProfitTable.tsx`

```text
src/components/admin/AIToolsProfitTable.tsx
├── Estado local para configurações editáveis
├── Consumo da RPC para médias de custo
├── Modal para editar parâmetros globais
├── Modal para adicionar nova ferramenta
├── Tabela responsiva com cálculos automáticos
└── Persistência em localStorage (configurações do admin)
```

### 3. Nova Página: `PromptsRentabilidade.tsx`

```text
src/pages/admin/PromptsRentabilidade.tsx
└── Renderiza AIToolsProfitTable dentro do AdminLayoutPlatform
```

### 4. Atualizar Menu Lateral

```text
src/components/AdminSidebarPlatform.tsx
├── Adicionar item "RENTABILIDADE"
├── Ícone: TrendingUp ou Calculator
└── Path: /admin-prompts/rentabilidade
```

### 5. Adicionar Rota no App.tsx

```text
Rota: /admin-prompts/rentabilidade
Componente: PromptsRentabilidade
```

---

## Funcionalidades da Tabela Interativa

### Configurações Globais (Modal)
- **Receita por crédito**: Auto-calculado (plano mais caro), mas editável
- **Custo por RH coin**: Fixo R$ 0,002, editável
- Ambos salvos em `localStorage` para persistência

### Ferramentas Existentes
- Dados carregados automaticamente da RPC
- Créditos: valor atual cobrado no sistema
- Custo RH: média real de execuções concluídas

### Adicionar Nova Ferramenta
- Nome da ferramenta
- Custo em créditos
- Custo RH estimado (até ter dados reais)
- Checkbox: "Tem taxa fixa de API?"
- Se sim: campo para valor da taxa (ex: R$ 0,11)

---

## Escopo Técnico - O Que NÃO Muda

| ✅ Seguro | ❌ Não Será Tocado |
|-----------|-------------------|
| Nova página frontend | Edge Functions |
| Nova RPC (SQL migration) | Webhooks |
| Componente React | Lógica de cobrança |
| Menu lateral | Tabelas de jobs |
| localStorage | Autenticação |

---

## Ordem de Implementação

1. **Migration SQL** - Criar RPC `get_ai_tools_cost_averages`
2. **Componente** - `AIToolsProfitTable.tsx`
3. **Página** - `PromptsRentabilidade.tsx`
4. **Menu** - Adicionar item no sidebar
5. **Rota** - Registrar em App.tsx

---

## Exemplo Visual Final

```text
┌────────────────────────────────────────────────────────────────────────────────────┐
│  RENTABILIDADE - PromptClub                                                        │
│  Análise de lucro das ferramentas de IA                                           │
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                    │
│  📊 Configurações                                                    [⚙️ Editar]  │
│  ┌──────────────────────────────────────────────────────────────────────────────┐│
│  │  💰 Receita/Crédito: R$ 0,00925 (99,90 ÷ 10.800)                             ││
│  │  🪙 Custo/RH Coin:   R$ 0,002                                                ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
│                                                                                    │
│  📈 Tabela de Rentabilidade                                                        │
│  ┌──────────────────┬──────────┬──────────┬──────────┬──────────┬───────┬───────┐│
│  │ Operação         │ Créditos │ Custo RH │ Extra API│ Receita  │ Lucro │Margem ││
│  ├──────────────────┼──────────┼──────────┼──────────┼──────────┼───────┼───────┤│
│  │ Upscaler         │    60    │  31.55   │    -     │  R$0,56  │ R$0,49│ 88,2% ││
│  │ Upscaler Pro     │    80    │  42.10   │    -     │  R$0,74  │ R$0,66│ 89,0% ││
│  │ Pose Changer     │    60    │  11.80   │    -     │  R$0,56  │ R$0,53│ 95,8% ││
│  │ Veste AI         │    60    │  18.33   │    -     │  R$0,56  │ R$0,52│ 93,4% ││
│  │ Video Upscaler   │   150    │  44.75   │    -     │  R$1,39  │ R$1,30│ 93,5% ││
│  │ 🆕 Arcano Cloner │    60    │  ~30.00  │  R$0,11  │  R$0,56  │ R$0,39│ 70,5% ││
│  └──────────────────┴──────────┴──────────┴──────────┴──────────┴───────┴───────┘│
│                                                                                    │
│  [+ Adicionar Ferramenta]                                                          │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Resumo do Plano

- **1 Migration SQL**: Nova RPC para médias de custo
- **1 Componente novo**: Tabela interativa com cálculos
- **1 Página nova**: Container no admin
- **2 Edições mínimas**: Sidebar + App.tsx (rotas)
- **0 Edge Functions alteradas**
- **0 Webhooks tocados**
- **0 Lógica de cobrança modificada**
