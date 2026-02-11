

## Restringir "Gerar sua foto" para fotos premium

### O que sera feito

Atualmente, o botao "Gerar sua foto" aparece em TODAS as fotos da categoria "Fotos", independentemente de serem premium ou nao. A mudanca fara com que:

- **Foto gratis**: botao funciona normalmente para todos
- **Foto premium + usuario premium**: botao funciona normalmente
- **Foto premium + usuario NAO premium (ou deslogado)**: botao aparece com visual de bloqueio (icone de cadeado) e ao clicar, abre o modal de "conteudo exclusivo premium" que ja existe na pagina

### Mudancas

Apenas **1 arquivo** sera modificado: `src/pages/BibliotecaPrompts.tsx`

**Dois pontos de alteracao:**

1. **Card na grid (linha ~887-896)**: Adicionar verificacao `item.isPremium && !isPremium` no onClick do botao. Se nao tiver acesso, abre o modal premium em vez de navegar pro Arcano Cloner. Visual do botao muda para mostrar cadeado quando bloqueado.

2. **Modal de detalhes (linha ~1089-1097)**: Mesma logica - se a foto selecionada for premium e o usuario nao for premium, o botao abre o modal premium em vez de redirecionar.

### Logica do botao

```text
Se (foto.isPremium E NAO isPremium):
  -> Mostra botao com icone de cadeado + texto "Exclusivo Premium"
  -> Ao clicar, abre modal premium existente (setPremiumModalItem + setShowPremiumModal)
Senao:
  -> Mostra botao normal "Gerar sua foto"
  -> Ao clicar, navega para /arcano-cloner-tool com a imagem
```

### Detalhes tecnicos

- Reutiliza o modal premium ja existente (`showPremiumModal` + `premiumModalItem`) - nenhum componente novo necessario
- A variavel `canAccess` ja existe no escopo do map (`!item.isPremium || isPremium`) e sera reutilizada
- No modal de detalhes, a verificacao usa `selectedPrompt.isPremium && !isPremium`
- Visual do botao bloqueado: fundo cinza/roxo escuro com icone Lock, mantendo o gradiente rosa/roxo para quem tem acesso
