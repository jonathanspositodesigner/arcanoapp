
# Plano: Modal de Bônus RunningHub (250 créditos)

## Resumo
Substituir o modal de notificações push por um novo modal que oferece **250 créditos** para usuários que criarem uma conta no RunningHub. O sistema usa um countdown de 15 segundos após clicar no link e confia no usuário para confirmar a criação da conta.

---

## Fluxo do Usuário

1. Usuário **logado** acessa a Biblioteca de Prompts
2. Após 3 segundos, aparece o modal de bônus RunningHub
3. Usuário clica em "Criar conta no RunningHub" → abre link com referral
4. Inicia countdown de 15 segundos
5. Após countdown, aparece botão "Já criei minha conta" habilitado
6. Ao clicar, usuário recebe 250 créditos instantaneamente
7. Modal fecha com mensagem de sucesso (toast)

---

## Regras de Exibição

- Modal **SÓ aparece** para usuários **LOGADOS**
- Modal **NÃO aparece** se usuário já recebeu o bônus (verificação no banco)
- Modal aparece apenas **1x por sessão** (sessionStorage)

---

## Mudanças Necessárias

### 1. Banco de Dados - Nova Coluna

Adicionar coluna na tabela `profiles`:

```sql
ALTER TABLE profiles 
ADD COLUMN runninghub_bonus_claimed BOOLEAN DEFAULT false;
```

Essa coluna rastreia se o usuário já resgatou o bônus, impedindo múltiplos resgates.

---

### 2. Novo Componente: `src/components/RunningHubBonusModal.tsx`

Componente que gerencia todo o fluxo:
- Verifica se usuário está logado (recebe userId como prop)
- Verifica se já resgatou o bônus (query ao banco)
- Exibe modal com countdown de 15 segundos
- Adiciona créditos via RPC `add_upscaler_credits`
- Marca `runninghub_bonus_claimed = true` no perfil

**Estados do modal:**
1. **Inicial**: Mostra oferta + botão para ir ao RunningHub
2. **Countdown**: Timer de 15s após clicar no link
3. **Confirmação**: Botão "Já criei minha conta" habilitado
4. **Processando**: Adicionando créditos...

---

### 3. Modificar: `src/pages/BibliotecaPrompts.tsx`

- **Remover** import e uso do `PushNotificationPrompt` (linha 30 e 1085)
- **Adicionar** import e uso do novo `RunningHubBonusModal`
- **Passar** `userId` para o componente (só renderiza se user existir)

---

## Link de Referral RunningHub

```
https://www.runninghub.ai/?inviteCode=p93i9z36
```

---

## Detalhes Técnicos

### Verificação de bônus já resgatado:
```typescript
const { data } = await supabase
  .from('profiles')
  .select('runninghub_bonus_claimed')
  .eq('id', userId)
  .single();

if (data?.runninghub_bonus_claimed) return; // Não mostra modal
```

### Adicionar créditos (250):
```typescript
await supabase.rpc('add_upscaler_credits', {
  _user_id: userId,
  _amount: 250,
  _description: 'Bônus RunningHub - Criação de conta'
});
```

### Marcar bônus como resgatado:
```typescript
await supabase
  .from('profiles')
  .update({ runninghub_bonus_claimed: true })
  .eq('id', userId);
```

---

## UI do Modal

- **Ícone**: Presente animado ou logo
- **Título**: "Crie sua conta no RunningHub e ganhe 250 créditos!"
- **Subtítulo**: "Precisamos dessa ferramenta para processar suas imagens"
- **Botão principal**: "Criar conta no RunningHub" (abre nova aba)
- **Contador**: Círculo animado com números (15...14...13...)
- **Botão confirmação**: "Já criei minha conta" (aparece após countdown)
- **Botão fechar**: "Agora não" (discreto)

---

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| `profiles` (banco) | Adicionar coluna `runninghub_bonus_claimed` |
| `src/components/RunningHubBonusModal.tsx` | **CRIAR** novo componente |
| `src/pages/BibliotecaPrompts.tsx` | Trocar `PushNotificationPrompt` pelo novo modal |

---

## Verificação Pós-Implementação

1. Acessar Biblioteca de Prompts **LOGADO**
2. Modal deve aparecer após 3 segundos
3. Clicar em "Criar conta" → abre RunningHub em nova aba
4. Countdown de 15 segundos
5. Clicar em "Já criei" → recebe 250 créditos
6. Verificar saldo aumentou (no dropdown de perfil)
7. Recarregar página → modal **NÃO** deve aparecer novamente
8. Acessar **DESLOGADO** → modal **NÃO** deve aparecer
