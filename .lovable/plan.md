

# Plano: Adicionar Slider de Nível de Edição para Pessoas + De Perto (PRO)

## Resumo

Adicionar um novo slider de "Nível de Edição" que aparece **apenas** quando:
- Versão PRO está selecionada
- Categoria "Pessoas" está selecionada 
- Enquadramento "De Perto" está selecionado

O slider vai de 0.0 a 1.0, com **valor inicial de 0.10**.

---

## Mudanças Planejadas

### Arquivo 1: `src/pages/UpscalerArcanoTool.tsx`

#### 1.1 Adicionar State para Nível de Edição

```text
// Após linha 55 (após detailDenoise state)
const [editingLevel, setEditingLevel] = useState(0.10);
```

#### 1.2 Adicionar Novo Card do Slider

Adicionar **após** o card de "Nível de Detalhes", um novo card que aparece **apenas** quando:
- `version === 'pro'`
- `promptCategory === 'pessoas_perto'` (Pessoas + De Perto)

```text
{version === 'pro' && promptCategory === 'pessoas_perto' && (
  <Card className="bg-[#1A0A2E]/50 border-purple-500/20 p-3">
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-pink-400" />
        <span className="text-xs font-medium text-white">Nível de Edição</span>
      </div>
      <span className="text-xs text-purple-300 font-mono">{editingLevel.toFixed(2)}</span>
    </div>
    <Slider
      value={[editingLevel]}
      onValueChange={([value]) => setEditingLevel(value)}
      min={0}
      max={1}
      step={0.01}
      className="w-full"
    />
    <div className="flex justify-between text-[10px] text-purple-300/50 mt-1">
      <span>Menos Edição</span>
      <span>Mais Edição</span>
    </div>
  </Card>
)}
```

#### 1.3 Enviar editingLevel na Chamada da API

Na função `processImage()`, adicionar `editingLevel` ao body:

```text
editingLevel: (version === 'pro' && promptCategory === 'pessoas_perto') ? editingLevel : undefined,
```

---

### Arquivo 2: `supabase/functions/runninghub-upscaler/index.ts`

#### 2.1 Extrair editingLevel do Request

Adicionar `editingLevel` na desestruturação do JSON.

#### 2.2 Adicionar editingLevel ao nodeInfoList

Para PRO + Pessoas Perto, adicionar o node 91:

```text
if (version === 'pro' && category === 'pessoas_perto' && editingLevel !== undefined) {
  nodeInfoList.push({ 
    nodeId: "91", 
    fieldName: "value", 
    fieldValue: String(editingLevel) 
  });
}
```

---

## Fluxo Visual

### Quando o Slider de Edição Aparece:

```text
PRO + Pessoas + De Perto:
┌────────────────────────────────────────┐
│ ✨ Nível de Detalhes     [0.15]        │
│ ━━━━━━━━●━━━━━━━━━━━━━━━━━             │
├────────────────────────────────────────┤
│ ✨ Nível de Edição       [0.10]        │  ← NOVO! Valor inicial 0.10
│ ━●━━━━━━━━━━━━━━━━━━━━━━━━━            │
│ Menos Edição      Mais Edição          │
└────────────────────────────────────────┘
```

---

## Resumo das Mudanças

| Arquivo | Mudança |
|---------|---------|
| `UpscalerArcanoTool.tsx` | + State `editingLevel` (default **0.10**) |
| `UpscalerArcanoTool.tsx` | + Card com Slider de Edição (PRO + Pessoas + Perto) |
| `UpscalerArcanoTool.tsx` | + Enviar `editingLevel` na chamada API |
| `runninghub-upscaler/index.ts` | + Extrair `editingLevel` |
| `runninghub-upscaler/index.ts` | + Adicionar node 91 no nodeInfoList |

