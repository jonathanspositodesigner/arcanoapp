

# Correção: Alterações na Página /planos

## Problema Identificado

Você está na página `/planos`, que usa o arquivo `src/pages/Planos.tsx`. Eu editei o arquivo errado (`src/pages/UpgradePlano.tsx` = rota `/upgrade`).

A página `/planos` também usa o namespace de tradução `prompts` (`t('planos.features.xxx')`), não o namespace `plans`.

## Arquivos a Modificar (Corretos)

### 1. `src/pages/Planos.tsx`

**Alterações nos planos MENSAIS:**

| Plano | Mudança |
|-------|---------|
| Starter | Remover linha `arcanoAcademy` |
| Pro | Remover linha `arcanoAcademy` |
| **IA Unlimited** | Remover `arcanoAcademy` + **mudar preço para 29,90** + **remover originalPrice** + **remover promo: true** |

**Alterações nos planos ANUAIS:**

| Plano | Mudança |
|-------|---------|
| Starter | Remover linha `arcanoAcademy` |
| Pro | Remover linha `arcanoAcademy` |
| IA Unlimited | Remover linha `arcanoAcademy` (manter 19,90 com promo) |

### 2. `src/locales/pt/prompts.json` (linhas ~144-157)

Atualizar a tradução dentro de `planos.features`:
- `upscaleArcano`: "Upscale Arcano" → **"Upscale Arcano v2.0"**

### 3. `src/locales/es/prompts.json` (linhas ~123-136)

Mesma atualização para espanhol:
- `upscaleArcano`: já está v2.0 ✅ (editado antes)

## Resumo das Mudanças

```text
/planos (Planos.tsx)
├── MENSAL
│   ├── Starter: remove arcanoAcademy
│   ├── Pro: remove arcanoAcademy
│   └── IA Unlimited: remove arcanoAcademy + preço 29,90 (sem promo)
│
└── ANUAL
    ├── Starter: remove arcanoAcademy
    ├── Pro: remove arcanoAcademy
    └── IA Unlimited: remove arcanoAcademy (mantém 19,90 com promo)
```

## Resultado Esperado

- Nenhum plano mostrará "Arcano Academy – Mini curso de IA"
- IA Unlimited MENSAL: R$29,90 normal (sem badge de promoção, sem preço riscado)
- IA Unlimited ANUAL: mantém R$19,90 com desconto de R$29,90
- Texto "Upscale Arcano" vira "Upscale Arcano v2.0"

