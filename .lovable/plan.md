

# Auditoria e Correção — Rotas do Painel de Colaborador

## Problema encontrado

A rota `/parceiro` **não existe** no App.tsx. A rota correta do dashboard é `/parceiro-dashboard`. Isso causa 404 ao clicar no botão "Voltar" da página de Conquistas.

## Correções necessárias

### 1. PartnerConquistas.tsx — linha 189
**Bug**: `navigate("/parceiro")` aponta para rota inexistente.
**Correção**: Trocar para `navigate("/parceiro-dashboard")`.

### 2. Verificação completa de rotas (resultado da auditoria)

| Arquivo | Navegações encontradas | Status |
|---------|----------------------|--------|
| `PartnerDashboard.tsx` | `/parceiro-login`, `/parceiro-plataformas`, `/parceiro-extrato`, `/parceiro-upload`, `/parceiro-conquistas` | Todas corretas |
| `PartnerConquistas.tsx` | `/parceiro-login`, **`/parceiro`** (linha 189) | **BUG** — corrigir para `/parceiro-dashboard` |
| `PartnerEarnings.tsx` | `/parceiro-login`, `navigate(-1)` | Todas corretas |

### Arquivos alterados

- `src/pages/PartnerConquistas.tsx` — uma única linha corrigida (189)

### O que NÃO muda

- Nenhuma lógica, query, estado ou modal
- Nenhuma rota no App.tsx
- Nenhum outro arquivo

