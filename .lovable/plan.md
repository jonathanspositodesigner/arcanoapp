
# Plano: Atualização do Saldo em Tempo Real após Bônus

## Problema Identificado
Os créditos **foram adicionados corretamente** no banco de dados (saldo atual: 900.210 com a transação do bônus registrada). Porém, a interface não atualiza porque:

1. O hook `useUpscalerCredits` na página `BibliotecaPrompts.tsx` busca o saldo apenas uma vez no carregamento
2. O modal `RunningHubBonusModal` adiciona os créditos mas não comunica à página que o saldo mudou
3. Não há mecanismo de sincronização entre o modal e o hook de créditos

## Solução Proposta

Passar a função `refetch` do hook para o modal, e chamar essa função após adicionar os créditos com sucesso.

---

## Mudanças Necessárias

### 1. Modificar `src/pages/BibliotecaPrompts.tsx`

**Linha 68** - Extrair também o `refetch`:
```typescript
const { balance: credits, isLoading: creditsLoading, refetch: refetchCredits } = useUpscalerCredits(user?.id);
```

**Linha 1085** - Passar `refetch` como prop para o modal:
```typescript
{user && <RunningHubBonusModal userId={user.id} onCreditsAdded={refetchCredits} />}
```

---

### 2. Modificar `src/components/RunningHubBonusModal.tsx`

**Adicionar prop `onCreditsAdded`**:
```typescript
interface RunningHubBonusModalProps {
  userId: string;
  onCreditsAdded?: () => void;  // Nova prop
}
```

**Na função `handleClaimBonus`**, após sucesso, chamar a callback:
```typescript
toast.success(`🎉 Parabéns! ${BONUS_CREDITS} créditos foram adicionados!`);
onCreditsAdded?.();  // Atualiza o saldo na UI
setShowModal(false);
```

---

## Fluxo Após Implementação

```text
1. Usuário clica "Já criei minha conta"
2. Modal chama RPC para adicionar 250 créditos
3. Modal chama onCreditsAdded() 
4. Hook refetch() busca novo saldo do banco
5. UI atualiza instantaneamente com novo saldo
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/BibliotecaPrompts.tsx` | Extrair `refetch` e passar como prop |
| `src/components/RunningHubBonusModal.tsx` | Adicionar prop `onCreditsAdded` e chamar após sucesso |

---

## Benefícios

- **Zero custo de Cloud**: Não usa realtime/subscriptions
- **Simples**: Apenas passa uma callback como prop
- **Confiável**: O saldo é buscado novamente do banco após adicionar
- **Extensível**: Mesmo padrão pode ser usado em outras páginas se necessário
