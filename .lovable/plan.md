

# Corrigir timing do sessionStorage no modal de free trial

## Problema

O `sessionStorage` marca o modal como "já exibido" no momento que ele abre (antes do usuário completar o cadastro). Se o usuário cria conta, sai para verificar email e volta, o modal nao reaparece e o claim nunca acontece.

## Correcao

Mover a marcacao do `sessionStorage` para DEPOIS do claim ser executado com sucesso.

### Arquivo: `src/hooks/useAIToolsAuthModal.ts`

**Antes (atual):**
```typescript
const timer = setTimeout(() => {
  setShowAuthModal(true);
  sessionStorage.setItem(SESSION_KEY, 'true'); // marca ANTES do claim
}, SHOW_DELAY_MS);
```

**Depois (corrigido):**
```typescript
const timer = setTimeout(() => {
  setShowAuthModal(true);
  // NAO marca aqui - so marca depois do claim
}, SHOW_DELAY_MS);
```

E no `handleAuthSuccess`, marcar o sessionStorage apos o claim:
```typescript
const handleAuthSuccess = useCallback(async () => {
  setShowAuthModal(false);
  
  try {
    const { data, error } = await supabase.functions.invoke('claim-arcano-free-trial');
    
    // Marcar como concluido DEPOIS do claim (sucesso ou ja resgatado)
    if (!error) {
      sessionStorage.setItem(SESSION_KEY, 'true');
    }
    
    if (data?.success) {
      toast.success(`🎉 ${data.credits_granted} creditos gratuitos adicionados!`);
      refetchCredits?.();
    } else if (data?.already_claimed) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      toast.info('Voce ja resgatou suas geracoes gratuitas anteriormente.');
    }
  } catch (err) {
    console.error('[AIToolsAuth] Claim error:', err);
  }
}, [refetchCredits]);
```

### Resultado

1. Usuario abre ferramenta IA - modal aparece (sessionStorage NAO marcado ainda)
2. Cria conta pelo modal
3. Sai pra verificar email
4. Volta - modal reaparece (sessionStorage ainda nao foi marcado)
5. Faz login pelo modal - claim executa - sessionStorage marcado
6. Modal nao aparece mais nessa sessao

### Seguranca contra duplicacao

- A RPC `claim_arcano_free_trial_atomic` usa advisory lock + unique constraint no email
- Mesmo que o modal apareca varias vezes, o claim so credita uma vez
- `already_claimed` retorna silenciosamente sem dar creditos extras

