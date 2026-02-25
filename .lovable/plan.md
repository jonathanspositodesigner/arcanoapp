
## Somar clique de "Gerar sua foto" no contador de cópias

### O que muda
Quando alguém clica em **"Gerar sua foto"** (botão que leva ao Arcano Cloner), o contador de cópias/cliques do prompt vai incrementar +1, da mesma forma que já acontece ao clicar em "Copiar Prompt".

### Como funciona hoje
- O contador exibido no card (ícone de cópia + número) soma `clickCount + bonusClicks`
- `clickCount` vem da tabela `prompt_clicks` — cada registro = 1 clique
- A função `trackPromptClick` insere um registro nessa tabela
- Hoje, só o botão "Copiar Prompt" chama `trackPromptClick`

### O que será feito

**Arquivo:** `src/pages/BibliotecaPrompts.tsx`

1. **Botão "Gerar sua foto" no card** (linha ~429): Antes de navegar para `/arcano-cloner-tool`, chamar `trackPromptClick(promptId, title, isExclusive)` para registrar o clique
2. **Botão "Gerar sua foto" no modal de detalhes** (linha ~561): Mesmo tratamento — chamar `trackPromptClick` antes de navegar

### Detalhes técnicos

Nos dois pontos onde o botão "Gerar sua foto" faz `navigate('/arcano-cloner-tool', ...)`, adicionar a chamada:

```typescript
// Antes do navigate, adicionar:
await trackPromptClick(String(item.id), item.title, !!item.isExclusive);
navigate('/arcano-cloner-tool', { state: { referenceImageUrl: item.imageUrl } });
```

O `trackPromptClick` já tem proteção contra cliques duplicados na mesma sessão (via `sessionStorage`), então não há risco de inflar o contador se a pessoa clicar várias vezes no mesmo prompt.

Nenhuma alteração de banco de dados é necessária — a tabela `prompt_clicks` já existe e recebe os dados corretamente.
