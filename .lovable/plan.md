

## Reverter o Atraso dos Scripts de Analytics para Carregamento Imediato

### Situação Atual
Os scripts do **Meta Pixel** e **Microsoft Clarity** estão configurados no `index.html` para carregar apenas:
- Após uma interação do usuário (click, scroll, touch, keydown), OU
- Após 3 segundos de timeout

Isso foi feito para melhorar o LCP (Largest Contentful Paint), mas agora você quer que carreguem imediatamente.

### Alteração Necessária

**Arquivo**: `index.html`

Substituir os scripts com delay pelas versões que carregam imediatamente:

#### Meta Pixel (linhas 79-103) - ANTES:
```html
<script>
(function() {
  var loaded = false;
  function loadMetaPixel() {
    if (loaded) return;
    loaded = true;
    // ... código do pixel
  }
  // Delay de 3s ou interação
  ['click', 'scroll', 'touchstart', 'keydown'].forEach(function(evt) {
    window.addEventListener(evt, loadMetaPixel, { once: true, passive: true });
  });
  setTimeout(loadMetaPixel, 3000);
})();
</script>
```

#### Meta Pixel - DEPOIS (carregamento imediato):
```html
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '1162356848586894');
fbq('track', 'PageView');
</script>
```

#### Microsoft Clarity (linhas 106-124) - ANTES:
```html
<script>
(function() {
  var loaded = false;
  function loadClarity() {
    if (loaded) return;
    loaded = true;
    // ... código do clarity
  }
  // Delay de 3s ou interação
  ['click', 'scroll', 'touchstart', 'keydown'].forEach(function(evt) {
    window.addEventListener(evt, loadClarity, { once: true, passive: true });
  });
  setTimeout(loadClarity, 3000);
})();
</script>
```

#### Microsoft Clarity - DEPOIS (carregamento imediato):
```html
<script>
(function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "qczq95ipaf");
</script>
```

### Resumo

| Script | ID | Comportamento Anterior | Novo Comportamento |
|--------|-----|------------------------|-------------------|
| Meta Pixel | 1162356848586894 | Delay 3s/interação | Imediato |
| Clarity | qczq95ipaf | Delay 3s/interação | Imediato |

### Impacto
- Os pixels vão carregar junto com a página
- Pode haver impacto leve no LCP mobile (os scripts vão competir com o render inicial)
- Tracking mais preciso desde o primeiro momento

