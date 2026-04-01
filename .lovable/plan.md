

# Plano: Corrigir todas as seções quebradas nas páginas V3

## Causa raiz

O problema é uma **incompatibilidade entre o `V3LazySection` e o IntersectionObserver de scroll reveal**.

Todos os elementos com classe `.v3-reveal` começam com `opacity: 0` no CSS (invisíveis). Eles só aparecem quando recebem a classe `.v3-visible`, que é adicionada por um IntersectionObserver configurado no `useEffect([], [])` — ou seja, **roda uma única vez no mount da página**.

O problema: elementos dentro de `V3LazySection` **não existem no DOM** quando esse observer roda, porque o `V3LazySection` só renderiza o conteúdo quando o usuário scrolla perto. Resultado: os elementos lazy nunca são observados → nunca recebem `.v3-visible` → ficam invisíveis para sempre.

Mesmo problema acontece com o **counter animation** (`data-target`) — os números dentro de seções lazy nunca são observados e ficam parados em "0".

### Seções afetadas (ambas páginas)

| Seção | Problema |
|---|---|
| Como funciona (steps) | `.v3-step.v3-reveal` → opacity: 0 permanente |
| Galeria antes/depois | `.v3-gallery-item.v3-reveal` → opacity: 0 permanente |
| Dois novos recursos (Turbo/Batch) | `.v3-feature-card.v3-reveal` → opacity: 0 permanente |
| Resultados reais (números) | `data-target` → contagem não inicia |
| Resultados reais (cards) | `.v3-real-card.v3-reveal` → opacity: 0 permanente |

---

## Correção

Trocar o observer de "roda uma vez no mount" para um **MutationObserver** que detecta automaticamente novos elementos `.v3-reveal` e `[data-target]` conforme aparecem no DOM.

### Arquivo: `src/pages/UpscalerArcanoV3.tsx` e `src/pages/UpscalerArcanoV3Es.tsx`

Substituir os dois `useEffect` (scroll reveal + counter animation) por uma versão que usa `MutationObserver` para re-observar elementos novos:

```typescript
// Scroll reveal observer — watches for dynamically added .v3-reveal elements
useEffect(() => {
  const io = new IntersectionObserver(
    (entries) => { entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("v3-visible"); }); },
    { threshold: 0.15 }
  );
  
  const observeAll = () => {
    document.querySelectorAll(".v3-reveal:not(.v3-visible)").forEach((el) => io.observe(el));
  };
  
  observeAll(); // observe existing elements
  
  // Watch for new elements added by V3LazySection
  const mo = new MutationObserver(() => observeAll());
  mo.observe(document.body, { childList: true, subtree: true });
  
  return () => { io.disconnect(); mo.disconnect(); };
}, []);

// Counter animation — same pattern
useEffect(() => {
  const observed = new WeakSet();
  const counterObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !observed.has(e.target)) {
          observed.add(e.target);
          const el = e.target as HTMLElement;
          const target = parseInt(el.dataset.target || "0");
          const suffix = target === 100 ? "%" : "+";
          let current = 0;
          const step = target / 60;
          const timer = setInterval(() => {
            current = Math.min(current + step, target);
            el.textContent = Math.floor(current).toLocaleString("pt-BR") + suffix;
            if (current >= target) clearInterval(timer);
          }, 25);
          counterObs.unobserve(el);
        }
      });
    },
    { threshold: 0.5 }
  );
  
  const observeCounters = () => {
    document.querySelectorAll("[data-target]").forEach((el) => {
      if (!observed.has(el)) counterObs.observe(el);
    });
  };
  
  observeCounters();
  
  const mo = new MutationObserver(() => observeCounters());
  mo.observe(document.body, { childList: true, subtree: true });
  
  return () => { counterObs.disconnect(); mo.disconnect(); };
}, []);
```

Mesma mudança nos dois `useEffect` de staggered delays — precisam re-aplicar quando novos elementos aparecem.

### Arquivos editados

| Arquivo | Mudança |
|---|---|
| `src/pages/UpscalerArcanoV3.tsx` | Trocar scroll reveal, counter e stagger observers por versão com MutationObserver |
| `src/pages/UpscalerArcanoV3Es.tsx` | Mesma troca (código espelho) |

### O que NÃO muda
- Nenhum CSS
- Nenhum componente (`V3IsolatedComponents.tsx`)
- Nenhuma mudança visual/design
- Nenhuma mudança de checkout ou backend

