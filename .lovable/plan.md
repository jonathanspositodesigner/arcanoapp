

## Alteração do Botão "Ferramentas de IA" na Sidebar

### Mudança Necessária

Alterar a navegação do botão "Ferramentas de IA" na sidebar da página `/biblioteca-prompts` de `/ferramentas-ia` para `/ferramentas-ia-aplicativo`.

### Arquivo a Modificar

**`src/pages/BibliotecaPrompts.tsx`** - Linha 704

### Alteração

```typescript
// De:
onClick={() => navigate("/ferramentas-ia")}

// Para:
onClick={() => navigate("/ferramentas-ia-aplicativo")}
```

### Resultado

Ao clicar no botão "Ferramentas de IA" na sidebar da biblioteca de prompts, o usuário será direcionado para a nova interface de ferramentas de IA em `/ferramentas-ia-aplicativo`.

