

## Plano: Cadastro Multi-Etapas com Todos os Dados do Pagar.me

### O que será feito

Transformar o `SignupForm` em um formulário multi-etapas com barra de progresso, coletando todos os dados obrigatórios do checkout Pagar.me: email, nome, telefone, CPF, endereço completo (CEP, rua, cidade, estado). Isso se aplica a **todos** os locais onde contas são criadas.

### Etapas do cadastro

```text
Etapa 1: Dados da Conta          (Email, Senha, Confirmar Senha)
Etapa 2: Dados Pessoais          (Nome Completo, Telefone/WhatsApp, CPF)
Etapa 3: Endereço                (CEP, Endereço, Cidade, Estado)
─────────────────────────────────────────────
[████████████░░░░░░░░] Etapa 2 de 3
```

### Alterações

**1. `SignupData` em `useUnifiedAuth.ts`**

Expandir a interface para incluir novos campos:
```typescript
export interface SignupData {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  cpf?: string;
  address_line?: string;
  address_zip?: string;
  address_city?: string;
  address_state?: string;
}
```

**2. `useUnifiedAuth.ts` — função `signup`**

Salvar os novos campos (`cpf`, `address_line`, `address_zip`, `address_city`, `address_state`, `address_country: 'BR'`) no upsert do profile (linha ~402).

**3. `SignupForm.tsx` — Refatorar para multi-etapas**

- Adicionar estado `currentStep` (1, 2, 3)
- Etapa 1: Email + Senha + Confirmar Senha
- Etapa 2: Nome Completo (obrigatório) + Telefone (obrigatório) + CPF (obrigatório, com máscara `000.000.000-00`)
- Etapa 3: CEP (com auto-preenchimento via ViaCEP) + Endereço + Cidade + Estado
- Barra de progresso visual no topo com indicador de etapa
- Botões "Próximo" / "Voltar" entre etapas
- Submit final na etapa 3
- Manter todas as props de styling/variant existentes
- Adicionar máscara de CPF e validação (11 dígitos)
- Auto-preenchimento de cidade/estado/rua via API ViaCEP ao digitar CEP

**4. Locais que usam `SignupForm` — sem alteração de chamada**

Os seguintes locais já usam `<SignupForm>` e herdarão as etapas automaticamente:
- `HomeAuthModal.tsx` (home)
- `UserLogin.tsx` (login principal)
- `UserLoginArtes.tsx`
- `UserLoginArtesMusicos.tsx`
- `ArcanoClonerAuthModal.tsx`

As props existentes (`showNameField`, `showPhoneField`, etc.) serão ignoradas pois agora **todos** os campos são obrigatórios por padrão no fluxo multi-etapas.

### Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useUnifiedAuth.ts` | Expandir `SignupData` + salvar campos no profile upsert |
| `src/components/auth/SignupForm.tsx` | Refatorar para 3 etapas com progress bar, CPF mask, ViaCEP |

Nenhuma alteração necessária nos arquivos que **usam** o `SignupForm` — o componente mantém a mesma interface de props.

