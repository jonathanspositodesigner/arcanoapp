
## Diagnóstico Real

O CSS inline via `<style>` tag dentro do JSX está sendo ignorado ou sobrescrito. O código mostra `6s` para mobile e `30s` para desktop, mas o usuário confirma que nada mudou — o carrossel ainda vai na mesma velocidade lenta de sempre (~25-30s).

**Causa**: `<style>` tags dentro do JSX não têm garantia de aplicação consistente em todos os browsers/contextos. Estilos em `<style>` tags dinâmicas podem ser ignorados ou sobrescritos por outros estilos com maior especificidade.

## Solução Definitiva

Usar `style={{ animationDuration: '15s' }}` **diretamente no elemento** `.marquee-refs-track`. Estilos inline no React têm prioridade máxima — nada pode sobrescrevê-los.

Manter a velocidade que o usuário quer: **15s** (nem 6s, nem 5s, nem 30s — exatamente 15s).

## Alteração Técnica

**Arquivo**: `src/pages/PlanosArcanoCloner.tsx` (linha ~388)

Mudar:
```tsx
<div className="marquee-refs-track flex gap-4">
```

Para:
```tsx
<div className="marquee-refs-track flex gap-4" style={{ animationDuration: '15s' }}>
```

Isso aplica `15s` diretamente no elemento via React style prop, que tem especificidade máxima e **não pode ser sobrescrito por nenhum CSS**, seja do `<style>` tag, seja do Tailwind, seja do cache do browser.

O keyframe `marquee-refs` no `<style>` permanece — apenas o `animation-duration` muda para o inline style.
