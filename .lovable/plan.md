

## Plano: Centralizar atribuição de créditos ao colaborador em um hook único

### Problema atual

Cada ferramenta implementa a mesma lógica de atribuição de forma diferente:

| Ferramenta | Tipo de estado | Inicialização | Limpeza ao upload | Limpeza ao trocar ref | Passa ao job |
|---|---|---|---|---|---|
| Arcano Cloner | `useState` | `useEffect` separado | Sim | Sim | `reference_prompt_id` no insert |
| Pose Changer | `useState` | `useEffect` separado | Sim | Sim | `reference_prompt_id` no insert |
| Veste AI | `useState` | Manual (sem useEffect) | Sim | Sim | `reference_prompt_id` no insert |
| Seedance 2 | `useState` com initializer | Inline no `useState` | Sim (parcial) | Sim | `reference_prompt_id` no insert |
| MovieLed | `useRef` | `useEffect` separado | Sim | Sim | Via body do `invoke` |

Cada ferramenta repete 20-40 linhas de lógica idêntica. Se precisar corrigir algo, tem que mexer em 5 arquivos. Inconsistências geram bugs.

### Solução

Criar um hook `useCollaboratorAttribution` que encapsula toda a lógica em um único lugar.

### Hook: `src/hooks/useCollaboratorAttribution.ts`

```typescript
// Retorna:
{
  referencePromptId: string | null,  // valor atual para gravar no job
  setFromLibrary: (meta) => void,    // ao selecionar item da biblioteca
  setFromNavigation: () => void,     // ao chegar via location.state
  clear: () => void,                 // ao fazer upload, trocar imagem, limpar form
}
```

O hook:
1. Lê `location.state` para inicializar (se `prefillPromptType === 'partner'`)
2. Expoe `setFromLibrary(meta)` que verifica `meta?.promptType === 'partner'` e seta ou limpa
3. Expoe `clear()` para chamar em upload, troca de referência, limpeza de form
4. Retorna `referencePromptId` pronto para ser gravado no insert do job

### Alterações por ferramenta

Cada ferramenta substitui:
- O `useState<string | null>(...)` do referencePromptId
- O `useEffect` de inicialização via location.state
- As chamadas manuais a `setReferencePromptId(null)` e `setReferencePromptId(meta?.promptId)`

Por:
- `const { referencePromptId, setFromLibrary, clear } = useCollaboratorAttribution();`
- `clear()` nos pontos de upload/troca
- `setFromLibrary(meta)` nos pontos de seleção da biblioteca

#### ArcanoClonerTool.tsx
- Remover `useState` do `referencePromptId` e `useEffect` de `location.state`
- `handleSelectFromLibrary` → chamar `setFromLibrary(meta)`
- `handleUploadFromModal` → chamar `clear()`
- `handleClearReference` → chamar `clear()`
- Insert do job: continua usando `reference_prompt_id: referencePromptId`

#### PoseChangerTool.tsx
- Mesma substituição que o Arcano Cloner
- `handleSelectFromLibraryWithMeta` → `setFromLibrary(meta)`

#### VesteAITool.tsx
- Mesma substituição
- `handleSelectFromLibrary` → `setFromLibrary(meta)`
- `handleUploadFromModal` → `clear()`
- `handleClearClothing` → `clear()`

#### Seedance2.tsx
- Remover `useState` com initializer do `referencePromptId`
- `handleUseLibraryItem` → chamar `clear()` (já faz) — mas também precisa setar se o item for partner
- Cada `setReferencePromptId(null)` inline nos UploadSlots → `clear()`
- Insert do job: continua usando `reference_prompt_id: referencePromptId`

#### MovieLedMakerTool.tsx
- Remover `useRef` do `partnerPromptIdRef`
- `useEffect` de inicialização → hook já faz
- `onSelectItem` no modal → `clear()` (itens da biblioteca MovieLed são admin, não partner)
- `onUploadPhoto` → `clear()`
- Body do invoke: `referencePromptId: referencePromptId` (troca ref por state)

### O que NÃO muda

- Nenhuma tabela, RLS ou migration
- Nenhuma edge function
- Nenhuma RPC
- O fluxo de geração de IA não é alterado
- O daily limit de earnings permanece intacto
- A lógica de `register_collaborator_tool_earning` no backend não é tocada
- A navegação da biblioteca continua passando `prefillPromptType: 'partner'`

### Arquivos envolvidos

| Arquivo | Ação |
|---|---|
| `src/hooks/useCollaboratorAttribution.ts` | Criar (novo) |
| `src/pages/ArcanoClonerTool.tsx` | Refatorar para usar hook |
| `src/pages/PoseChangerTool.tsx` | Refatorar para usar hook |
| `src/pages/VesteAITool.tsx` | Refatorar para usar hook |
| `src/pages/Seedance2.tsx` | Refatorar para usar hook |
| `src/pages/MovieLedMakerTool.tsx` | Refatorar para usar hook |

### Resultado

- Lógica de atribuição ao colaborador em UM lugar
- Correção de bug futuro = alterar 1 arquivo
- Todas as ferramentas com comportamento idêntico e previsível
- Zero risco de regressão: o hook expoe a mesma interface que o código atual já usa

