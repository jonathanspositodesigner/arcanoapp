

# Adicionar coluna "Tipo de Cliente" na tabela de Custos IA

## O que sera feito

Adicionar uma nova coluna **"Tipo"** na tabela de historico de uso da pagina Custos IA, mostrando para cada usuario uma badge com seu tipo de cliente.

### Logica de classificacao (4 tipos)

| Tipo | Condicao | Badge |
|------|----------|-------|
| Free | Sem plano pago ativo E sem creditos vitalicios | Cinza |
| Comprou Creditos | Sem plano pago ativo, MAS tem lifetime_balance > 0 | Amarelo/Dourado |
| Premium | Tem plano pago ativo (starter/pro/ultimate/unlimited) E sem creditos vitalicios | Roxo |
| Premium + Creditos | Tem plano pago ativo E tem creditos vitalicios > 0 | Verde/Gradiente |

### Detalhes tecnicos

**Arquivo modificado:** `src/components/admin/AdminAIToolsUsageTab.tsx`

1. Apos carregar os registros de uso, extrair todos os `user_id` unicos
2. Fazer 2 queries em paralelo:
   - `planos2_subscriptions` filtrando `is_active = true` e `plan_slug != 'free'` para saber quem e premium
   - `upscaler_credits` para saber quem tem `lifetime_balance > 0`
3. Criar um mapa `user_id -> tipo` usando a logica acima
4. Adicionar coluna "Tipo" na tabela entre "Usuario" e "Ferramenta"
5. Renderizar badges coloridas para cada tipo

Nenhuma alteracao no banco de dados e necessaria -- os dados ja existem nas tabelas `planos2_subscriptions` e `upscaler_credits`.

