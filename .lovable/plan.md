

# Auditoria Completa — Redesign Painel de Colaborador

## Bugs encontrados

### BUG 1 — Rota `/parceiro` inexistente no Bottom Nav (3 arquivos)
Todas as bottom navs usam `/parceiro` para Home e Perfil, mas essa rota **nao existe** no App.tsx. A rota correta e `/parceiro-dashboard`.

**Arquivos afetados:**
- `PartnerDashboard.tsx` linha 648: Home -> `/parceiro`
- `PartnerConquistas.tsx` linhas 405, 409: Home e Perfil -> `/parceiro`
- `PartnerEarnings.tsx` linhas 401, 405: Home e Perfil -> `/parceiro`

**Correcao:** Trocar todas as ocorrencias de `/parceiro` para `/parceiro-dashboard` nos bottom navs.

### BUG 2 — Perfil no Bottom Nav de Conquistas e Extrato
Nas paginas Conquistas e Extrato, o botao "Perfil" navega para `/parceiro` (rota inexistente). Como essas paginas nao possuem dialog de perfil, o botao Perfil deve navegar para `/parceiro-dashboard` (onde o perfil esta disponivel via dialog).

### BUG 3 — Stats incompletos no Dashboard
O spec pedia 4 stat chips (Total, Aprovados, Pendentes, Recusados). Porem o screenshot mostra que tambem devem aparecer **Desbloqueios** e **Usos em IA** como cards adicionais apos os 4 stats de prompts.

**Correcao:** Adicionar 2 cards extras ao grid de stats:
- `earningsUnlocks` desbloqueios (com icone MousePointerClick)
- `toolEarningsCount` usos em IA (com icone Cpu/Bot)

Mudar o grid para acomodar 6 items (3 colunas x 2 linhas) ou manter 2 colunas com 3 linhas.

## Verificacao item-a-item do spec original

| Item | Spec | Status |
|------|------|--------|
| 1.1 TopBar com avatar/nivel | Sticky topbar, avatar, nivel, logout | OK |
| 1.2 Hero Card roxo | Gradiente, saldo, streak, nivel | OK |
| 1.3 Quick Actions 3-col | Upload, Saldo, Conquistas | OK |
| 1.4 Stat chips 2x2 | 4 cards compactos | OK (mas faltam Desbloqueios/Usos IA) |
| 1.5 Filter pills | overflow-x-auto, pills | OK |
| 1.6 Grid 2 col mobile | grid-cols-2, aspect-[3/4] | OK |
| 1.7 Bottom Nav | 5 botoes fixos | OK (rotas erradas) |
| 1.8 Perfil como Dialog | ProfileDialog | OK |
| 1.9 Container max-w-2xl | pb-20 md:pb-8 | OK |
| 2.1 TopBar Conquistas | Back + titulo | OK |
| 2.2 Earnings 2-col | grid-cols-2 | OK |
| 2.3 Card nivel bg-card | Sem bg-purple | OK |
| 2.4 Badges 3-col dourado | yellow-500 earned | OK |
| 2.5 Challenges bg-card | Sem borda azul | OK |
| 2.6 Bottom Nav Conquistas | Active em Conquistas | OK (rotas erradas) |
| 2.7 Container | max-w-2xl pb-20 | OK |
| 3.1 TopBar Extrato | Back + saque | OK |
| 3.2 Hero verde | Gradiente verde, 2 mini cards | OK |
| 3.3 Filter pills | overflow-x-auto | OK |
| 3.4 Icones por tipo | unlock/tool/bonus | OK |
| 3.5 Bottom Nav Extrato | Active em Extrato | OK (rotas erradas) |
| 3.6 Container | max-w-2xl pb-20 | OK |

## Correcoes a aplicar

### Arquivo 1: `src/pages/PartnerDashboard.tsx`
- Linha 648: Trocar `'/parceiro'` por `'/parceiro-dashboard'` (Home no bottom nav)
- Adicionar 2 stat cards extras (Desbloqueios + Usos em IA) no grid de stats

### Arquivo 2: `src/pages/PartnerConquistas.tsx`
- Linha 405: Trocar `'/parceiro'` por `'/parceiro-dashboard'` (Home)
- Linha 409: Trocar `'/parceiro'` por `'/parceiro-dashboard'` (Perfil)

### Arquivo 3: `src/pages/PartnerEarnings.tsx`
- Linha 401: Trocar `'/parceiro'` por `'/parceiro-dashboard'` (Home)
- Linha 405: Trocar `'/parceiro'` por `'/parceiro-dashboard'` (Perfil)

## O que NAO muda
- Nenhuma logica, query, estado ou modal
- Nenhuma rota no App.tsx
- Nenhum Edge Function ou migration

