
# Plano: Adicionar Recomendação no Slider de Nível de Detalhes

## O Que Fazer

Adicionar um texto de recomendação abaixo do slider "Nível de Detalhes" quando:
- Versão: **PRO**
- Categoria: **Pessoas** 
- Enquadramento: **Perto**

## Texto a Adicionar

```
💡 Recomendado: entre 0.05 e 0.20
```

## Localização no Código

O slider está nas linhas 944-967 do arquivo `src/pages/UpscalerArcanoTool.tsx`. Vou adicionar após o `div` com "Menos" e "Mais":

```tsx
<div className="flex justify-between text-[10px] text-purple-300/50 mt-1">
  <span>Menos</span>
  <span>Mais</span>
</div>

{/* NOVO: Recomendação para Pessoas Perto */}
{promptCategory === 'pessoas_perto' && (
  <p className="text-[10px] text-purple-400/80 text-center mt-2">
    💡 Recomendado: entre 0.05 e 0.20
  </p>
)}
```

## Arquivo a Modificar

| Arquivo | Linha | Ação |
|---------|-------|------|
| `src/pages/UpscalerArcanoTool.tsx` | ~965 | Adicionar texto de recomendação |

## Resultado Visual

```
Nível de Detalhes                    0.15
[=======|---------------------------]
Menos                            Mais
      💡 Recomendado: entre 0.05 e 0.20
```

A recomendação só aparece quando PRO + Pessoas + Perto está selecionado.
