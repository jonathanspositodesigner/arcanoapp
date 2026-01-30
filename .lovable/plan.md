
# Plano: Corrigir Botões com Nomes Estranhos na Biblioteca de Prompts

## Problema Identificado

Os botões nos cards da Biblioteca de Prompts estão mostrando as **chaves de tradução literalmente** (como `card.copyPrompt` e `card.details`) porque durante o redesign, foram usadas chaves que não existem no arquivo de traduções.

## Chaves Com Problema

| Chave usada no código | O que aparece | O que deveria ser |
|----------------------|---------------|-------------------|
| `t('card.copyPrompt')` | card.copyPrompt | Copiar Prompt |
| `t('card.details')` | card.details | Detalhes |
| `t('modal.referenceImages')` | modal.referenceImages | Imagens de Referência |
| `t('modal.prompt')` | modal.prompt | Prompt |
| `t('modal.copyPrompt')` | modal.copyPrompt | Copiar Prompt |
| `t('modal.download')` | modal.download | Baixar |
| `t('modal.watchTutorial')` | modal.watchTutorial | Ver Tutorial |
| `t('premiumModal.title')` | premiumModal.title | Conteúdo Premium |
| `t('premiumModal.description')` | premiumModal.description | Este conteúdo está disponível... |
| `t('premiumModal.becomePremium')` | premiumModal.becomePremium | Torne-se Premium |
| `t('limitModal.title')` | limitModal.title | Limite Diário Atingido |
| `t('limitModal.description')` | limitModal.description | Você atingiu o limite diário... |
| `t('limitModal.upgrade')` | limitModal.upgrade | Fazer Upgrade |

## Solução

Adicionar as chaves faltantes no arquivo `src/locales/pt/prompts.json`:

```json
{
  "card": {
    "copyPrompt": "Copiar Prompt",
    "details": "Detalhes"
  },
  "modal": {
    "referenceImages": "Imagens de Referência",
    "prompt": "Prompt",
    "copyPrompt": "Copiar Prompt",
    "download": "Baixar",
    "watchTutorial": "Ver Tutorial"
  },
  "premiumModal": {
    "title": "Conteúdo Premium",
    "description": "Este conteúdo está disponível apenas para usuários premium. Adquira um plano para ter acesso ilimitado!",
    "becomePremium": "Torne-se Premium"
  },
  "limitModal": {
    "title": "Limite Diário Atingido",
    "description": "Você atingiu o limite diário de {{limit}} prompts premium.",
    "upgrade": "Fazer Upgrade"
  }
}
```

## Arquivo a Modificar

- `src/locales/pt/prompts.json` - Adicionar as chaves faltantes

## Resultado Esperado

Após a correção:
- Botão "card.copyPrompt" → **Copiar Prompt**
- Botão "card.details" → **Detalhes**  
- Todos os textos nos modais aparecerão corretamente em português
