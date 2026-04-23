

## Resumo da lógica atual

O hook `useCollaboratorAttribution` centraliza a atribuição de créditos ao colaborador:

1. **Inicialização**: Quando o usuário navega da Biblioteca de Prompts para uma ferramenta, o `location.state` traz `prefillPromptId` + `prefillPromptType: 'partner'`. O hook inicializa `referencePromptId` automaticamente.
2. **Seleção na biblioteca interna**: Ao selecionar um item da biblioteca dentro da ferramenta, chama-se `setFromLibrary(meta)` — se `meta.promptType === 'partner'`, seta o ID; senão, limpa.
3. **Upload manual / remoção**: Chama `clear()` para zerar a atribuição.
4. **Gravação no job**: O `referencePromptId` é gravado no insert do job (DB direto ou via body do invoke).
5. **Backend**: O `runninghub-queue-manager`, `seedance-poll` e `seedance-recovery` leem o `reference_prompt_id` do job e chamam a RPC `register_collaborator_tool_earning`.

### Estado por ferramenta

| Ferramenta | Inicialização (nav) | setFromLibrary | clear | Gravação |
|---|---|---|---|---|
| Arcano Cloner | OK | OK | OK | OK |
| Pose Changer | OK | OK | OK | OK |
| Veste AI | OK | OK | OK | OK |
| **Seedance 2** | OK | **NUNCA CHAMADO** | OK | OK |
| **MovieLed** | OK | **NEM EXTRAÍDO** | OK | OK |

---

## Bugs encontrados

### BUG 1 — Seedance2: `setAttributionFromLibrary` nunca é chamado

**Cenário**: Usuário abre o Seedance, seleciona um item da galeria interna que é de parceiro, gera o vídeo. O colaborador **não recebe crédito**.

**Causa**: A função `handleUseLibraryItem` chama `clearAttribution()` e nunca chama `setAttributionFromLibrary()`. Além disso, a interface `Generation` do Seedance não carrega metadados de `promptType` nem `promptId` — não tem como saber se o item veio de um parceiro.

**Impacto**: Atribuição só funciona se o usuário chegar via navegação da BibliotecaPrompts. Se o usuário escolher um item de parceiro pela galeria interna do Seedance, o colaborador perde o crédito.

**Nota**: Hoje os itens da galeria interna do Seedance são criações do próprio usuário (completadas anteriormente), então esse bug só afetaria um cenário futuro onde prompts de parceiro apareçam na galeria interna. Mas a arquitetura está errada — se itens de parceiro forem adicionados, o bug já está lá esperando.

### BUG 2 — MovieLed: `setFromLibrary` não é nem extraído do hook

**Cenário**: Igual ao bug 1, mas no MovieLed. A biblioteca interna (`MovieLedLibraryModal`) lista itens admin. Se no futuro forem adicionados itens de parceiro nessa biblioteca, a atribuição nunca será setada.

**Estado atual**: O `onSelectItem` do modal sempre chama `clearAttribution()`. Correto para itens admin, mas não tem caminho para setar atribuição se o item for de parceiro.

**Impacto real agora**: Baixo, porque a biblioteca do MovieLed hoje só tem itens admin. Mas a arquitetura não está preparada.

### BUG 3 — Seedance2: upload de imagem de referência NÃO limpa atribuição em todos os caminhos

**Cenário**: Usuário chega via BibliotecaPrompts com prompt de parceiro (atribuição setada). No modo `startend`, faz upload de `startImage` e `endImage` manualmente. O `clearAttribution()` só é chamado no modo `multiref` (ao adicionar/remover `refImages`). Nos uploads de `startImage`/`endImage`, a atribuição **permanece**.

**Causa**: Os UploadSlots de `startImage` e `endImage` (linhas 748-763) NÃO chamam `clearAttribution()` em nenhum evento (onRemove, onClickUpload, onDrop).

**Impacto**: Crédito fantasma — o colaborador recebe crédito mesmo que o usuário tenha trocado todas as imagens de referência no modo startend.

---

## Plano de correção

### 1. Seedance2 — Limpar atribuição ao alterar startImage/endImage

Nos UploadSlots de `startImage` e `endImage` (modo `startend`), adicionar `clearAttribution()` nos callbacks `onRemove`, `onClickUpload` e `onDrop`, da mesma forma que já é feito para `refImages` no modo `multiref`.

### 2. Seedance2 e MovieLed — Preparar `setFromLibrary` para itens de parceiro

Embora hoje as galerias internas dessas ferramentas não tenham itens de parceiro, a arquitetura deve ser consistente:

- **MovieLed**: Extrair `setFromLibrary` do hook. No `onSelectItem` do modal, chamar `setFromLibrary(meta)` em vez de `clearAttribution()`, onde `meta` deve ser construído a partir dos dados do item (se tiver `promptType === 'partner'`, seta; senão o hook limpa automaticamente).

- **Seedance2**: No `handleUseLibraryItem`, se no futuro a `Generation` carregar metadados de parceiro, chamar `setAttributionFromLibrary(meta)` em vez de `clearAttribution()`. Por agora, manter o `clearAttribution()` mas documentar que precisa ser trocado quando itens de parceiro forem adicionados à galeria.

### 3. Tabela de ações

| Arquivo | Ação |
|---|---|
| `src/pages/Seedance2.tsx` | Adicionar `clearAttribution()` nos UploadSlots de `startImage`/`endImage` (modo startend) |
| `src/pages/MovieLedMakerTool.tsx` | Extrair `setFromLibrary` do hook; usar no `onSelectItem` do modal |
| Nenhum outro arquivo | — |

### O que NÃO muda

- Nenhuma migration, RLS, edge function ou RPC
- Arcano Cloner, Pose Changer e Veste AI estão corretos
- O hook `useCollaboratorAttribution` permanece igual
- O fluxo de navegação da BibliotecaPrompts continua funcionando

