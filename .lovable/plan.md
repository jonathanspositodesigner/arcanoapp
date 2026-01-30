
# Plano: Consertar Indicador Visual do Switch de Versão

## Problema Identificado

O switch de versão (Standard vs PRO) na página `/upscaler-arcano-tool` não mostra visualmente qual opção está selecionada. Ambos os botões aparecem iguais, sem borda ou destaque no botão ativo.

**Causa raiz:** O componente `ToggleGroupItem` usa o `toggleVariants` que aplica estilos padrão (`data-[state=on]:bg-accent`) que estão conflitando com os estilos customizados, mesmo usando `!important`. O `tailwind-merge` pode estar removendo ou ignorando as classes customizadas.

## Solução

Não depender das classes via `className` que estão sendo sobrescritas. Usar **renderização condicional baseada no estado `version`** para aplicar estilos diferentes diretamente.

### Mudanças Técnicas

**Arquivo:** `src/pages/UpscalerArcanoTool.tsx`

1. **Mudar valor padrão do state `version`** de `'pro'` para `'standard'`

2. **Substituir as classes condicionais `data-[state=on]`** por classes diretas baseadas no estado React (`version === 'standard'` ou `version === 'pro'`)

3. **Aplicar borda contrastante** (cor cyan/ciano brilhante) no botão selecionado usando lógica condicional:

```text
+-------------------------------------------+-------------------------------------------+
|  Upscaler Arcano                          |  Upscaler Arcano PRO                      |
|  (se selecionado: borda cyan + fundo)     |  (se selecionado: borda cyan + fundo)     |
+-------------------------------------------+-------------------------------------------+
```

### Código Antes (problemático):
```tsx
<ToggleGroupItem 
  value="standard" 
  className="... data-[state=on]:!border-purple-200 ..."
>
```

### Código Depois (solução):
```tsx
<ToggleGroupItem 
  value="standard" 
  className={`w-full py-3 px-4 ... ${
    version === 'standard' 
      ? 'bg-purple-600/80 text-white border-2 border-cyan-400 ring-2 ring-cyan-400/50 shadow-lg' 
      : 'border-2 border-transparent text-purple-300 hover:bg-purple-500/10'
  }`}
>
```

### Resultados Esperados

- **Botão selecionado:** Borda CYAN brilhante (alta visibilidade), fundo colorido, texto branco
- **Botão não selecionado:** Sem borda, texto roxo claro, hover sutil
- **Contraste:** Cyan contra fundo roxo escuro = máxima visibilidade

### Passos de Implementação

1. Alterar `useState<'standard' | 'pro'>('pro')` para `useState<'standard' | 'pro'>('standard')`

2. Substituir a classe do `ToggleGroupItem` de "standard" usando renderização condicional com `version === 'standard'`

3. Substituir a classe do `ToggleGroupItem` de "pro" usando renderização condicional com `version === 'pro'`

4. Remover todas as referências a `data-[state=on]` que não estão funcionando
