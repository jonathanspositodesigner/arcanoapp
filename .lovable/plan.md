
# Plano: Corrigir Cache TTL e Otimizar Auto-scroll

## Diagnóstico do Problema

O PageSpeed mostra "Cache TTL: None" porque as imagens da pasta `/images/combo/` estão sendo servidas **sem headers de cache**. Isso acontece porque:

1. O arquivo `public/_headers` **não é aplicado em domínios customizados** - ele só funciona no domínio padrão `*.lovable.app`
2. Para domínios customizados, os headers de cache precisam ser configurados no seu **provedor de DNS/CDN** (ex: Cloudflare, Hostgator, etc.)

---

## Solução em 2 Partes

### Parte 1: Configurar Cache no Provedor de Domínio (Você Precisa Fazer)

Você precisa acessar o painel do seu provedor de domínio e configurar regras de cache. Se você usa **Cloudflare** (recomendado):

1. Acesse o painel do Cloudflare para seu domínio
2. Vá em **Rules** → **Page Rules** (ou **Cache Rules** na nova interface)
3. Crie uma regra para `*.voxvisual.com.br/images/*` com:
   - **Cache Level**: Cache Everything
   - **Edge Cache TTL**: 30 dias (ou mais)
4. Crie outra regra para `*.voxvisual.com.br/assets/*` com:
   - **Cache Level**: Cache Everything
   - **Edge Cache TTL**: 1 ano (assets têm hash, são imutáveis)

Se você usa outro provedor (Hostgator, Registro.br, etc.), me avise qual é para eu te dar as instruções específicas.

---

### Parte 2: Otimizar Auto-scroll dos Carrosséis (Eu Vou Fazer)

Conforme você pediu, vou modificar o auto-scroll para **iniciar apenas depois de 3 segundos** quando o carrossel ficar visível, em vez de começar imediatamente. Isso reduz o carregamento inicial de imagens.

**Arquivo a modificar:** `src/components/combo-artes/FlyersGallerySection.tsx`

**Mudanças:**
```text
Antes: Auto-scroll inicia imediatamente quando o carrossel fica visível
Depois: Auto-scroll só inicia 3 segundos após o carrossel entrar na tela
```

Código atualizado do `useEffect` de auto-scroll:

```typescript
// Auto-scroll a cada 2 segundos, mas só começa após 3s de delay
useEffect(() => {
  if (!emblaApi) return;
  
  // Delay de 3 segundos antes de começar o auto-scroll
  const startDelay = setTimeout(() => {
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 2000);
    
    // Cleanup do interval quando componente desmontar
    return () => clearInterval(interval);
  }, 3000);
  
  return () => clearTimeout(startDelay);
}, [emblaApi]);
```

---

### Correção Adicional: `fetchPriority` Warning

Vi nos logs um warning sobre `fetchPriority`. Vou corrigir para usar a sintaxe correta do React:

**Arquivo:** `src/components/combo-artes/HeroSectionCombo.tsx`

```text
Antes:  fetchPriority="high"
Depois: fetchpriority="high"  (lowercase para evitar warning)
```

---

## Resumo das Mudanças

| O que | Arquivo | Status |
|-------|---------|--------|
| Cache headers para domínio customizado | Cloudflare/Provedor | Você precisa configurar |
| Delay de 3s no auto-scroll | FlyersGallerySection.tsx | Eu vou implementar |
| Corrigir fetchPriority warning | HeroSectionCombo.tsx | Eu vou implementar |

---

## Próximo Passo

Me diz qual é o seu provedor de domínio/DNS (Cloudflare, Hostgator, Registro.br, outro?) para eu te passar as instruções exatas de como configurar o cache lá.
