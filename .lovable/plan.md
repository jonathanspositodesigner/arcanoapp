
# Plano: Corrigir UTMs para Estrutura Completa

## Problema

O código atual está incompleto em dois pontos:

1. **UTM_KEYS** não tem `xcod` - então quando vem do anúncio, o xcod é ignorado
2. **DEFAULT_UTMS** só tem 4 campos, faltam `utm_content`, `utm_term` e `xcod`

## Estrutura do Anúncio (Referência)

```
utm_source=FB
utm_campaign={{campaign.name}}|{{campaign.id}}
utm_medium={{adset.name}}|{{adset.id}}
utm_content={{ad.name}}|{{ad.id}}
utm_term={{placement}}
xcod=FBhQwK21wXxR...
```

## Mudanças

### 1. src/hooks/useUtmTracker.ts

**Linha 3 - Adicionar xcod na lista de captura:**

```typescript
// ANTES
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term', 'utm_content', 'fbclid'];

// DEPOIS
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term', 'utm_content', 'fbclid', 'xcod'];
```

**Linhas 7-12 - Atualizar DEFAULT_UTMS com TODOS os parâmetros:**

```typescript
// ANTES
const DEFAULT_UTMS = {
  utm_source: 'aplicativo',
  utm_medium: 'aplicativo',
  utm_campaign: 'aplicativo',
  utm_id: 'aplicativo'
};

// DEPOIS
const DEFAULT_UTMS = {
  utm_source: 'aplicativo',
  utm_medium: 'aplicativo',
  utm_campaign: 'aplicativo',
  utm_id: 'aplicativo',
  utm_content: 'aplicativo',
  utm_term: 'aplicativo',
  xcod: 'aplicativo'
};
```

### 2. src/lib/utmUtils.ts

Verificar que o xcod é repassado para o checkout (o código atual já faz isso porque usa `Object.entries(utms)`, então não precisa mudar).

## Resultado

| Cenário | Parâmetros Enviados |
|---------|---------------------|
| Usuário do anúncio | utm_source, utm_medium, utm_campaign, utm_content, utm_term, xcod, fbclid (tudo que veio) |
| Usuário direto (sem UTMs) | utm_source=aplicativo, utm_medium=aplicativo, utm_campaign=aplicativo, utm_id=aplicativo, utm_content=aplicativo, utm_term=aplicativo, xcod=aplicativo |

Todos os parâmetros completos e na mesma estrutura.
