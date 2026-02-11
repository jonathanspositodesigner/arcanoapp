

## Adicionar botao "Gerar sua foto" na categoria Fotos da Biblioteca de Prompts

### Resumo

Itens da categoria "Fotos" ganham um botao "Gerar sua foto" que leva o usuario direto para o Arcano Cloner com a imagem ja selecionada como foto de referencia.

---

### Etapa 1 -- Arcano Cloner receber referencia via navegacao

**Arquivo: `src/pages/ArcanoClonerTool.tsx`**

- Importar `useLocation` do react-router-dom
- No inicio do componente, ler `location.state?.referenceImageUrl`
- Adicionar `useEffect` que, ao detectar esse valor, chama `handleReferenceImageChange(url)` automaticamente (a funcao ja faz download da URL e converte em File)
- Isso pre-preenche a foto de referencia sem nenhuma acao do usuario

---

### Etapa 2 -- Botao "Gerar sua foto" no card da grid

**Arquivo: `src/pages/BibliotecaPrompts.tsx`**

Na secao de botoes do card (linhas 867-885), adicionar condicionalmente para itens da categoria "Fotos":

- Novo botao "Gerar sua foto" com icone `Sparkles`
- Aparece somente quando `item.category === 'Fotos'` e o item nao e video
- Ao clicar: `navigate('/arcano-cloner-tool', { state: { referenceImageUrl: item.imageUrl } })`
- Estilo: gradiente rosa/roxo para destaque visual

---

### Etapa 3 -- Botao "Gerar sua foto" no modal de detalhes

**Arquivo: `src/pages/BibliotecaPrompts.tsx`**

Na secao de botoes do modal (linhas 1046-1077), adicionar condicionalmente:

- Mesmo botao "Gerar sua foto" com icone `Sparkles`
- Aparece quando `selectedPrompt.category === 'Fotos'` e nao e video
- Mesma navegacao com state

---

### Arquivos modificados

| Arquivo | Acao |
|---------|------|
| `src/pages/ArcanoClonerTool.tsx` | Ler `location.state` e pre-preencher referencia |
| `src/pages/BibliotecaPrompts.tsx` | Adicionar botao "Gerar sua foto" no card e no modal |

### Observacoes

- A funcao `handleReferenceImageChange` ja existe e aceita uma URL -- ela faz o fetch e converte em File automaticamente
- Nao precisa de mudancas no banco de dados
- O botao so aparece para itens da categoria "Fotos" (nao afeta outras categorias)
- Itens de video nao mostram o botao (nao faz sentido enviar video como referencia)
