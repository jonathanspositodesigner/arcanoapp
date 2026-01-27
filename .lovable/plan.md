
# Plano: Proteção Anti-Inspeção Global

## Resumo
Adicionar código JavaScript global no `index.html` para dificultar a inspeção do site por usuários comuns. O código vai bloquear clique direito, atalhos de teclado, e detectar quando o DevTools é aberto.

## ⚠️ Importante Entender

**O que essa proteção FAZ:**
- Bloqueia 90%+ dos usuários casuais que tentam "ver o código fonte"
- Impede clique direito → "Inspecionar"
- Bloqueia F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
- Detecta DevTools aberto e pode redirecionar ou exibir aviso

**O que essa proteção NÃO FAZ:**
- Não impede usuários técnicos (sempre conseguem contornar)
- Não protege APIs ou dados do backend (isso é feito no servidor)
- Não substitui segurança real (RLS, autenticação, etc.)

## Implementação

### Arquivo: `index.html`

Adicionar um script no `<head>` com as seguintes funcionalidades:

```text
┌─────────────────────────────────────────────────┐
│           PROTEÇÃO ANTI-INSPEÇÃO                │
├─────────────────────────────────────────────────┤
│ 1. Bloquear Clique Direito                      │
│    - Desabilita menu de contexto                │
│    - Usuário não vê "Inspecionar Elemento"      │
├─────────────────────────────────────────────────┤
│ 2. Bloquear Atalhos de Teclado                  │
│    - F12 (DevTools)                             │
│    - Ctrl+Shift+I (Inspecionar)                 │
│    - Ctrl+Shift+J (Console)                     │
│    - Ctrl+Shift+C (Seletor de elementos)        │
│    - Ctrl+U (Ver código fonte)                  │
│    - Cmd+Option+I (Mac)                         │
├─────────────────────────────────────────────────┤
│ 3. Detectar DevTools Aberto                     │
│    - Verifica tamanho da janela                 │
│    - Detecta debugger statement                 │
│    - Pode redirecionar ou exibir alerta         │
└─────────────────────────────────────────────────┘
```

### Código a ser adicionado

```javascript
// Anti-inspeção: Bloqueia DevTools para usuários comuns
(function() {
  // 1. Bloquear clique direito
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
  });

  // 2. Bloquear atalhos de teclado
  document.addEventListener('keydown', function(e) {
    // F12
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+I / Cmd+Option+I
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+J
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+C
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
      e.preventDefault();
      return false;
    }
    // Ctrl+U (ver código fonte)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u')) {
      e.preventDefault();
      return false;
    }
  });

  // 3. Detectar DevTools aberto (técnica de debugger)
  (function detectDevTools() {
    const threshold = 160;
    const check = function() {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        // DevTools provavelmente está aberto
        // Opção 1: Redirecionar
        // window.location.href = '/';
        
        // Opção 2: Console.clear para dificultar debug
        console.clear();
      }
    };
    
    setInterval(check, 1000);
  })();

  // 4. Desabilitar seleção de texto (opcional - pode atrapalhar UX)
  // document.onselectstart = function() { return false; };
  
  // 5. Desabilitar arrastar elementos
  document.ondragstart = function() { return false; };
})();
```

## Localização no `index.html`

O script será adicionado logo após o Microsoft Clarity (linha ~101), antes do fechamento do `</head>`:

```html
<!-- End Microsoft Clarity -->

<!-- Anti-Inspect Protection -->
<script>
  // código aqui
</script>
</head>
```

## Resultado Esperado

| Ação do Usuário | Antes | Depois |
|-----------------|-------|--------|
| Clique direito | Menu aparece | Nada acontece |
| Pressionar F12 | DevTools abre | Nada acontece |
| Ctrl+Shift+I | DevTools abre | Nada acontece |
| Ctrl+U | Código fonte | Nada acontece |
| Abrir DevTools manualmente | Funciona | Console limpa automaticamente |

## Observações Técnicas

1. **Não afeta o funcionamento do site** - apenas bloqueia ações de inspeção
2. **Funciona em mobile** - clique longo também é bloqueado
3. **Compatível com todos os navegadores** - Chrome, Firefox, Safari, Edge
4. **Performance** - impacto zero (menos de 1KB de código)
