

# Corrigir modal que fecha durante signup

## Problema

O modal fecha porque existem **dois pontos** que forcam o fechamento:

1. **`src/pages/Index.tsx`** - Tem um listener `onAuthStateChange` que faz `setShowAuthModal(false)` toda vez que detecta um `SIGNED_IN`. Durante o signup, o Supabase cria uma sessao temporaria (dispara SIGNED_IN) antes do `signOut()`, e esse listener fecha o modal instantaneamente.

2. **`src/components/HomeAuthModal.tsx`** - O `Dialog` tem `onOpenChange` que chama `onClose()` direto, sem verificar se o signup esta em andamento.

## Solucao

### 1. `src/pages/Index.tsx` (linhas 62-77)

Adicionar uma ref `signupInProgressRef` que e passada ou controlada para ignorar eventos de auth durante o signup. A forma mais simples: adicionar um estado `ignoreAuthEvents` e passa-lo ao modal, ou melhor, usar um ref compartilhado.

A abordagem mais limpa: no listener do `onAuthStateChange`, verificar se o modal esta aberto E se o step atual e de signup antes de fechar. Como o Index nao tem acesso ao step interno, a solucao e:

- Criar um ref `skipNextAuthClose` no Index
- Passar uma callback `onSignupStarted` ao `HomeAuthModal` que seta esse ref como `true`
- No listener, se `skipNextAuthClose.current` for true, ignorar o evento e resetar o ref

**Alternativa mais simples (recomendada):** Mudar o listener para so fechar o modal no evento `SIGNED_IN` quando NAO houver um signup em progresso, usando um ref local no Index que e controlado via props do modal.

Concretamente:
- Adicionar `const signupRef = useRef(false)` no Index
- No listener: `if (session?.user && !signupRef.current) { setShowAuthModal(false); }`
- Passar `onSignupStart={() => signupRef.current = true}` e `onSignupEnd={() => signupRef.current = false}` ao HomeAuthModal
- No HomeAuthModal, chamar `onSignupStart()` antes do `auth.signup()` e `onSignupEnd()` no `onSignupSuccess`

### 2. `src/components/HomeAuthModal.tsx` (linha 42)

Mudar o `onOpenChange` do Dialog para tambem verificar o ref de signup:

```
onOpenChange={(isOpen) => {
  if (!isOpen && !signupInProgressRef.current && !signupSuccess) {
    onClose();
  }
}}
```

Isso impede que clicar no X ou no overlay feche o modal durante o processo de signup.

## Arquivos a editar

1. **`src/pages/Index.tsx`** - Adicionar ref e passar callbacks de controle ao modal
2. **`src/components/HomeAuthModal.tsx`** - Receber callbacks, proteger `onOpenChange`, e chamar as callbacks nos momentos certos

## Resultado esperado

- Usuario clica "Criar Conta", preenche dados, clica no botao
- Modal permanece aberto
- Tela de sucesso aparece com instrucoes para verificar email
- Modal so fecha quando o usuario clicar explicitamente em "Navegar sem login" ou no X apos o processo terminar

