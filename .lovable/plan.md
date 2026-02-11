

## Adicionar botao "Gerar sua foto" no modal de Colecoes

### Resumo

Adicionar o botao "Gerar sua foto" (que leva ao Arcano Cloner) em dois locais do `CollectionModal.tsx`:

1. **Na grid de preview (hover sobre cada item)**: Dois botoes aparecem ao passar o mouse -- "Ver Prompt" (abre o detalhe do item) e "Gerar sua foto" (navega pro Arcano Cloner com a imagem como referencia)
2. **Na view de detalhe do item (selectedItem)**: Botao "Gerar sua foto" junto aos botoes de Copiar Prompt e Baixar Ref.

O botao so aparece para itens que NAO sao video (mesma logica da Biblioteca de Prompts). A logica de premium gating tambem se aplica: se o item for premium e o usuario nao for premium, mostra "Exclusivo Premium" com cadeado e redireciona para /planos.

### Mudancas

#### Arquivo: `src/components/CollectionModal.tsx`

**1. Importar icones faltantes:**
- Adicionar `Sparkles`, `Lock` e `Eye` aos imports do lucide-react

**2. Grid de items (linhas ~358-408) - overlay de hover:**
- Adicionar um overlay que aparece no hover com dois botoes:
  - "Ver Prompt" (chama `setSelectedItem(item)`)
  - "Gerar sua foto" (navega para `/arcano-cloner-tool` com `state: { referenceImageUrl: item.imageUrl }`)
- Para itens de video, mostrar apenas "Ver Prompt"
- Para itens premium sem acesso, o botao "Gerar sua foto" mostra "Exclusivo Premium" com icone de cadeado e navega para `/planos`

**3. View de detalhe (linhas ~295-323) - botao extra:**
- Adicionar botao "Gerar sua foto" abaixo dos botoes Copiar/Baixar (apenas para imagens, nao videos)
- Mesmo estilo gradiente rosa-roxo da Biblioteca de Prompts
- Mesma logica premium gating

### Detalhes tecnicos

```text
Logica do botao (identica a BibliotecaPrompts):

Se item.isPremium && !isPremium:
  -> Mostra "Exclusivo Premium" com Lock icon
  -> onClick navega para /planos

Senao:
  -> Mostra "Gerar sua foto" com Sparkles icon  
  -> onClick navega para /arcano-cloner-tool com state: { referenceImageUrl: item.imageUrl }

Condicao de exibicao:
  -> Apenas quando !isVideoUrl(item.imageUrl)
```

### Arquivos

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/CollectionModal.tsx` | Adicionar overlay de hover na grid + botao na view de detalhe |

