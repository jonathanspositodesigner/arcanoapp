

## Excecao de custo no Upscaler: Logo e Arte = 50 creditos

### Resumo

Adicionar uma excecao **isolada** no calculo de custo do Upscaler Arcano: quando a categoria "Logo e Arte" estiver selecionada, o custo sera fixo em **50 creditos**, tanto para Standard quanto para PRO. Todos os outros modos (Geral, Foto Antiga, Comida/Objeto, Selos 3D) continuam com seus valores normais inalterados.

### Como funciona hoje

| Versao | Custo atual |
|--------|-------------|
| Standard | 60 creditos (via ai_tool_settings) |
| PRO | 80 creditos (via ai_tool_settings) |

### Como vai funcionar

| Versao | Logo/Arte selecionado | Custo |
|--------|----------------------|-------|
| Standard | Nao | 60 (sem mudanca) |
| PRO | Nao | 80 (sem mudanca) |
| Standard | Sim | **50** |
| PRO | Sim | **50** |

### Detalhes tecnicos

**Arquivo**: `src/pages/UpscalerArcanoTool.tsx`

A variavel `isLogoMode` ja existe no componente (`const isLogoMode = promptCategory === 'logo'`). A mudanca e minima -- apenas envolver o calculo de custo existente com uma condicao:

```text
ANTES:  version === 'pro' ? getCreditCost('Upscaler Pro', 80) : getCreditCost('Upscaler Arcano', 60)
DEPOIS: isLogoMode ? 50 : (version === 'pro' ? getCreditCost('Upscaler Pro', 80) : getCreditCost('Upscaler Arcano', 60))
```

Isso sera aplicado nos **3 pontos** onde o custo aparece:

1. **Verificacao de saldo** (antes de iniciar o job)
2. **Payload para a Edge Function** (valor enviado ao backend para debito)
3. **Label do botao** (exibicao visual pro usuario)

Nenhuma outra parte do codigo e alterada. Os valores de 60 e 80 continuam vindo do `ai_tool_settings` normalmente para todos os outros modos.

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/UpscalerArcanoTool.tsx` | Adicionar `isLogoMode ? 50 :` antes do calculo de custo em 3 linhas |

