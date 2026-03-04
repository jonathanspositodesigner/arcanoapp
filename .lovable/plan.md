

# Forcar rebuild e prevenir problema recorrente

## Diagnostico

O problema e o mesmo de antes: o Vite perde o estado do build e para de servir os assets corretamente. Os logs estao vazios (sem console, sem network), o que confirma que o app nem chega a renderizar.

## Solucao (2 partes)

### Parte 1: Forcar rebuild imediato
Alterar o comentario no `src/main.tsx` para um timestamp novo, forcando recompilacao:

```typescript
// rebuild 2026-03-04
```

### Parte 2: Prevenir crashes futuros
Adicionar um handler global de erros nao tratados no `App.tsx` para que erros asincronos nao derrubem o app inteiro:

```typescript
// No AppContent, adicionar useEffect:
useEffect(() => {
  const handler = (event: PromiseRejectionEvent) => {
    console.error("Unhandled rejection:", event.reason);
    event.preventDefault();
  };
  window.addEventListener("unhandledrejection", handler);
  return () => window.removeEventListener("unhandledrejection", handler);
}, []);
```

Isso garante que promessas rejeitadas nao tratadas (ex: chamadas ao banco, fetch de dados) nao causem crash silencioso do app.

### Arquivos modificados
- `src/main.tsx` - novo timestamp de rebuild
- `src/App.tsx` - handler global de erros

