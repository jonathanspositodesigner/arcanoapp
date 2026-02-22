
## Melhorar contraste dos botões Feed e Stories

### Problema
Os botões Feed (3:4) e Stories (9:16) usam as variantes `default` e `outline` do componente Button genérico, que não oferecem contraste visual suficiente no fundo escuro do Flyer Maker.

### Solução
Aplicar classes customizadas para cada estado:

**Botão selecionado:**
- Borda clara e vibrante (branca ou ciano) para destacar
- Fundo semi-transparente roxo
- Texto branco

**Botão não selecionado:**
- Borda roxa opaca, próxima da cor do fundo
- Fundo quase transparente
- Texto roxo claro (mas legível)

### Alteração

**Arquivo:** `src/pages/FlyerMakerTool.tsx` (linhas 524-525)

De:
```
<Button variant={imageSize === '3:4' ? 'default' : 'outline'} ... className="text-xs h-8">Feed (3:4)</Button>
<Button variant={imageSize === '9:16' ? 'default' : 'outline'} ... className="text-xs h-8">Stories (9:16)</Button>
```

Para:
```
<Button variant="outline" ... className={`text-xs h-8 ${
  imageSize === '3:4'
    ? 'border-cyan-400 bg-purple-700/40 text-white'
    : 'border-purple-700/40 bg-purple-900/20 text-purple-400 hover:text-purple-200'
}`}>Feed (3:4)</Button>

<Button variant="outline" ... className={`text-xs h-8 ${
  imageSize === '9:16'
    ? 'border-cyan-400 bg-purple-700/40 text-white'
    : 'border-purple-700/40 bg-purple-900/20 text-purple-400 hover:text-purple-200'
}`}>Stories (9:16)</Button>
```

Isso garante:
- Selecionado: borda ciano brilhante + fundo roxo visível + texto branco
- Não selecionado: borda escura discreta + fundo quase invisível + texto roxo suave
- Contraste adequado em ambos os estados
