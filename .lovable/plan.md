## Objetivo
Adicionar um botão **"Criar Coleção"** no `PartnerDashboard` que abre um fluxo igual ao do admin (`AdminCollections`), mas filtrado para mostrar **apenas os prompts aprovados do próprio parceiro** — nunca prompts do admin nem de outros colaboradores.

## Estrutura existente reutilizada
- Tabelas `admin_collections` + `admin_collection_items` já existem, com slug único e link público via `/biblioteca-prompts?colecao=<slug>`.
- O `CollectionModal` em `BibliotecaPrompts.tsx` já renderiza qualquer coleção pública pelo slug, então o link compartilhável funciona automaticamente.
- RLS atual: `admin_collections` exige `has_role(admin)` para INSERT/UPDATE/DELETE. Precisa ser ampliada para permitir parceiros gerenciarem **as próprias coleções**.

## Mudanças

### 1. Banco (migração)
- Adicionar coluna `created_by uuid` (nullable, default `auth.uid()`) em `admin_collections` para identificar o autor (admin → fica null/admin id; parceiro → seu user id).
- Adicionar coluna `partner_id uuid` (nullable) em `admin_collections` referenciando o partner. Quando preenchida, indica que é uma coleção de parceiro.
- Atualizar políticas RLS:
  - Manter: admins gerenciam tudo.
  - Adicionar: parceiros autenticados podem `INSERT/UPDATE/DELETE` suas próprias coleções (`partner_id = auth.uid()`).
  - Adicionar: parceiros podem `INSERT/DELETE` itens em `admin_collection_items` apenas se o `collection_id` pertence a uma coleção com `partner_id = auth.uid()` E o `prompt_id` pertence a um `partner_prompts` com `partner_id = auth.uid()` e `approved = true` (validação via subquery dentro da policy).
  - Manter SELECT público.

### 2. Nova página `src/pages/PartnerCollections.tsx`
Cópia adaptada de `AdminCollections.tsx` com:
- Verificação de auth de parceiro (igual ao restante do PartnerDashboard) em vez de checagem de admin.
- `fetchPrompts()` consulta **apenas** `partner_prompts` com `.eq('partner_id', user.id).eq('approved', true).eq('rejected', false)`. Sem `admin_prompts`, sem `community_prompts`, sem prompts de outros parceiros.
- `fetchCollections()` lista apenas coleções `where partner_id = user.id`.
- Ao criar coleção: insere com `partner_id = user.id` e `prompt_type = 'partner'` em todos os itens.
- Sem filtro "Source filter" (admin/partner) — sempre é partner.
- Botão Voltar leva para `/parceiro-dashboard`.
- Link copiado: mesmo formato `${origin}/biblioteca-prompts?colecao=<slug>`.

### 3. Rota
Em `src/App.tsx` adicionar:
```tsx
const PartnerCollections = lazy(() => import("./pages/PartnerCollections"));
<Route path="/parceiro-colecoes" element={<PartnerCollections />} />
```

### 4. Botão no `PartnerDashboard.tsx`
Mudar o grid de **3 colunas** para **2x2** (4 botões) na seção "Quick Actions" (linha ~532), mantendo o estilo atual:
- Enviar Prompt (existente)
- Saldo & Saques (existente)
- Conquistas (existente)
- **Criar Coleção** (novo) → ícone `FolderPlus`, navega para `/parceiro-colecoes`.

Layout: `grid-cols-2 md:grid-cols-4 gap-2.5` para ficar bom no mobile e desktop.

## Resultado para o usuário
- Parceiro vê novo botão "Criar Coleção" no dashboard.
- Ao clicar, abre tela onde pode nomear a coleção, selecionar entre os **próprios prompts aprovados** e gerar um link compartilhável.
- O link abre o `CollectionModal` público existente, mostrando apenas os prompts escolhidos.
- Garantia de segurança via RLS: mesmo via API direta, parceiro não consegue incluir prompts que não sejam dele e aprovados.