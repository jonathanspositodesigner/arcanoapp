

## Problema Identificado

O botão de "Gerar" demora a ficar visualmente desabilitado após o primeiro clique porque:
1. O React atualiza estado de forma assíncrona (`setStatus`)
2. O usuário vê o botão ainda "clicável" por alguns milissegundos
3. Isso induz cliques duplos

## Solução

Criar um **estado local de "submitting"** que é ativado **instantaneamente** no primeiro clique, antes de qualquer operação async. Isso vai:
- Desabilitar o botão imediatamente
- Mostrar spinner de carregamento
- Prevenir visualmente cliques duplos

### Hook Reutilizável

Criar um hook `useProcessingButton` que pode ser usado em todas as ferramentas de IA:

```typescript
// src/hooks/useProcessingButton.ts
import { useState, useCallback, useRef } from 'react';

export function useProcessingButton() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const startSubmit = useCallback(() => {
    if (submittingRef.current) return false;
    submittingRef.current = true;
    setIsSubmitting(true);
    return true;
  }, []);

  const endSubmit = useCallback(() => {
    submittingRef.current = false;
    setIsSubmitting(false);
  }, []);

  return { isSubmitting, startSubmit, endSubmit };
}
```

### Uso nas Ferramentas

Cada ferramenta vai usar o hook e o botão verificará `isSubmitting` além de `isProcessing`:

```typescript
const { isSubmitting, startSubmit, endSubmit } = useProcessingButton();

const handleProcess = async () => {
  if (!startSubmit()) return; // Bloqueia imediatamente
  
  try {
    // ... lógica existente
  } finally {
    // endSubmit() só é chamado se der erro antes de iniciar o job
    // Se o job iniciar, o status muda para 'processing' e o botão fica desabilitado
  }
};

// No botão:
<Button disabled={!canProcess || isProcessing || isSubmitting}>
  {isSubmitting ? <Loader2 className="animate-spin" /> : ...}
</Button>
```

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useProcessingButton.ts` | **CRIAR** - Hook reutilizável |
| `src/pages/UpscalerArcanoTool.tsx` | Integrar hook no botão de gerar |
| `src/pages/PoseChangerTool.tsx` | Integrar hook no botão de gerar |
| `src/pages/VesteAITool.tsx` | Integrar hook no botão de gerar |
| `src/pages/VideoUpscalerTool.tsx` | Integrar hook no botão de gerar |

## Fluxo de Proteção

```text
[Clique] ──► startSubmit() retorna true?
               │
          ┌────┴────┐
          ▼         ▼
         SIM       NÃO (já está submitting)
          │         │
          ▼         ▼
  isSubmitting=true  Ignora clique
  Botão desabilitado
  imediatamente
          │
          ▼
  [Inicia processamento]
          │
          ▼
  status muda para 'uploading'
  (isProcessing = true)
```

## Resultado Esperado

- Botão fica desabilitado **instantaneamente** no primeiro clique
- Spinner aparece imediatamente
- Impossível enviar jobs duplicados por clique rápido
- Solução universal funcionando em todas as 4 ferramentas de IA

