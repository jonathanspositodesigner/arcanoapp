
## Correção do Upscaler Arcano Tool

### Problema Identificado

A edge function `runninghub-upscaler` foi atualizada para exigir validação estrita de parâmetros, mas o frontend **não foi atualizado** para enviar os parâmetros no formato correto.

**O que a edge function espera:**
| Parâmetro | Tipo | Valor esperado |
|-----------|------|----------------|
| `creditCost` | number | 60 ou 80 (obrigatório) |
| `resolution` | number | 2048 ou 4096 |
| `framingMode` | string | `'perto'` ou `'longe'` |

**O que o frontend envia atualmente:**
| Parâmetro | Tipo | Valor enviado |
|-----------|------|---------------|
| `creditCost` | ❌ não envia | - |
| `resolution` | string | `'2k'` ou `'4k'` |
| `isLongeMode` | boolean | `true` ou `false` |

### Erro Resultante

Quando o frontend chama a edge function, ela retorna:
```json
{
  "error": "Invalid credit cost (must be 1-500)",
  "code": "INVALID_CREDIT_COST"
}
```

Isso gera o erro genérico: **"Edge Function returned a non-2xx status code"**

---

### Solução

Atualizar o arquivo `src/pages/UpscalerArcanoTool.tsx` para enviar os parâmetros no formato correto:

```typescript
// Step 3: Call edge function with URL (not base64)
const creditCost = version === 'pro' ? 80 : 60;
const resolutionValue = resolution === '4k' ? 4096 : 2048;
const framingMode = isLongeMode ? 'longe' : 'perto';

const { data: response, error: fnError } = await supabase.functions.invoke('runninghub-upscaler', {
  body: {
    jobId: job.id,
    imageUrl: imageUrl,
    detailDenoise: detailDenoise,
    prompt: getFinalPrompt(),
    resolution: resolutionValue,     // número, não string
    version: version,
    framingMode: framingMode,        // string 'perto' ou 'longe'
    userId: user.id,
    creditCost: creditCost           // NOVO - obrigatório
  }
});
```

---

### Alterações Técnicas

**Arquivo:** `src/pages/UpscalerArcanoTool.tsx`

1. **Linhas 446-458** - Atualizar chamada da edge function:
   - Adicionar `creditCost` (60 ou 80 dependendo da versão)
   - Converter `resolution` de string para número (`'2k'` → `2048`, `'4k'` → `4096`)
   - Trocar `isLongeMode` (boolean) por `framingMode` (string `'perto'` ou `'longe'`)

---

### Resultado Esperado

- A chamada da edge function vai funcionar novamente
- O job será processado corretamente
- Créditos serão consumidos atomicamente no backend
- Upscaler Arcano voltará a funcionar como antes
