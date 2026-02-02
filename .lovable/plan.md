
# Plano: Reduzir Espaçamento no Mobile dos Cards de Planos

## Problema Identificado

Na versão mobile da página `/planos`, há uma distância excessiva entre o valor do plano (ex: R$ 14,90) e o botão "Assinar". 

A distância atual é definida por `mb-6` (24px) na div que contém o preço.

## Solução

Reduzir o espaçamento em ~70% apenas no mobile, mantendo o layout desktop inalterado.

### Cálculo
- Atual: `mb-6` = 24px
- 70% de redução: 24px - (24px × 0.70) = ~7px
- Novo valor mobile: `mb-2` (8px)

## Mudança Técnica

### Arquivo: `src/pages/Planos.tsx`

**Linha 227** - Alterar a classe da div do preço:

| Antes | Depois |
|-------|--------|
| `className="text-center mb-6 min-h-[80px]"` | `className="text-center mb-2 lg:mb-6 min-h-[80px]"` |

Isso aplica:
- **Mobile**: `mb-2` (8px de margem inferior)
- **Desktop (lg+)**: `mb-6` (24px de margem inferior, mantém o atual)

## Resultado Visual

```
Mobile (Antes)          Mobile (Depois)
┌─────────────────┐     ┌─────────────────┐
│  R$ 14,90/mês   │     │  R$ 14,90/mês   │
│                 │     │  [  Assinar  ]  │  ← Muito mais próximo
│                 │     │                 │
│  [  Assinar  ]  │     │  ✓ 5 prompts    │
│                 │     │  ✓ Acesso...    │
│  ✓ 5 prompts    │     └─────────────────┘
└─────────────────┘     
```

## Arquivos Modificados

| Arquivo | Ação |
|---------|------|
| `src/pages/Planos.tsx` | Alterar classe CSS na linha 227 |
