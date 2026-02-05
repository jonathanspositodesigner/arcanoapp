

# Plano: Página de Resgate de 1.500 Créditos Mensais

## Resumo

Criar uma página em `/resgatar-creditos` onde usuários que **já compraram o Upscaler Arcano Vitalício** podem resgatar **1.500 créditos mensais** (válidos por 30 dias). O resgate é limitado a **uma vez por pessoa**.

---

## Fluxo de Usuário

```text
┌─────────────────────────────────────────────────────────────┐
│  Usuário clica no link /resgatar-creditos                   │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Página exibe formulário pedindo EMAIL                      │
│  • Design minimalista com branding Arcano                   │
│  • Campo de email + botão "Verificar e Resgatar"            │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Sistema verifica:                                          │
│  1. Email existe no sistema?                                │
│  2. Usuário tem pack 'upscaller-arcano' ativo?              │
│  3. Usuário já resgatou antes?                              │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
     ┌─────────────────────┴─────────────────────┐
     ▼                                           ▼
┌──────────────────────┐              ┌────────────────────────┐
│  ❌ NÃO ELEGÍVEL     │              │  ✅ ELEGÍVEL           │
│  • Email não existe  │              │  • Adiciona 1.500      │
│  • Não tem o pack    │              │    créditos mensais    │
│  • Já resgatou       │              │  • Registra resgate    │
│                      │              │  • Redireciona para    │
│  Exibe mensagem +    │              │    /ferramentas-ia-    │
│  botão "Ver Planos"  │              │    aplicativo          │
└──────────────────────┘              └────────────────────────┘
```

---

## Componentes a Criar

### 1. Página Frontend: `/resgatar-creditos`

**Arquivo:** `src/pages/ResgatarCreditos.tsx`

**Funcionalidades:**
- Campo de input para email
- Botão "Verificar e Resgatar"
- Estados de loading durante verificação
- Mensagens de erro/sucesso
- Design consistente com as outras páginas de promo

**Estados possíveis:**
- `idle` - Aguardando input do email
- `checking` - Verificando elegibilidade
- `success` - Créditos resgatados, redirecionando
- `error_not_found` - Email não encontrado ou sem pack
- `error_already_claimed` - Já resgatou anteriormente

---

### 2. Edge Function: `claim-promo-credits`

**Arquivo:** `supabase/functions/claim-promo-credits/index.ts`

**Fluxo interno:**
1. Receber `{ email: string, promo_code: 'UPSCALER_1500' }`
2. Buscar usuário por email na tabela `profiles`
3. Se não encontrar → retornar `{ eligible: false, reason: 'not_found' }`
4. Verificar se tem pack `upscaller-arcano` ativo em `user_pack_purchases`
5. Se não tiver → retornar `{ eligible: false, reason: 'no_pack' }`
6. Verificar se já resgatou na tabela `promo_claims`
7. Se já resgatou → retornar `{ eligible: false, reason: 'already_claimed' }`
8. Adicionar 1.500 créditos mensais via RPC `add_upscaler_credits`
9. Registrar resgate na tabela `promo_claims`
10. Retornar `{ eligible: true, credits_added: 1500, new_balance: X }`

---

### 3. Tabela de Controle: `promo_claims`

**Migration SQL:**

```sql
CREATE TABLE IF NOT EXISTS promo_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promo_code TEXT NOT NULL,
  credits_granted INTEGER NOT NULL,
  credit_type TEXT NOT NULL DEFAULT 'monthly',
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  
  -- Índice único para evitar resgates duplicados
  CONSTRAINT unique_user_promo UNIQUE(user_id, promo_code)
);

-- RLS: Apenas service role pode inserir/ler
ALTER TABLE promo_claims ENABLE ROW LEVEL SECURITY;

-- Política: usuários autenticados podem ver seus próprios resgates
CREATE POLICY "Users can view own claims"
ON promo_claims FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

---

## Design da Página

**Visual:**
- Fundo gradiente roxo/fuchsia (padrão do app)
- Logo ArcanoApp no topo
- Card central com:
  - Título: "🎁 Resgate seus Créditos"
  - Subtítulo: "1.500 créditos para usar nas Ferramentas de IA"
  - Campo de email
  - Botão CTA gradiente

**Mensagens de feedback:**
- ✅ Sucesso: "Parabéns! 1.500 créditos adicionados. Redirecionando..."
- ❌ Não encontrado: "Compra não encontrada. Verifique se usou o email correto."
- ⚠️ Já resgatou: "Você já resgatou essa promoção anteriormente."

---

## Rota no App.tsx

```tsx
const ResgatarCreditos = lazy(() => import("./pages/ResgatarCreditos"));

<Route path="/resgatar-creditos" element={<ResgatarCreditos />} />
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/ResgatarCreditos.tsx` | ✨ Criar |
| `src/App.tsx` | Adicionar rota |
| `supabase/functions/claim-promo-credits/index.ts` | ✨ Criar |
| Migration SQL (tabela `promo_claims`) | ✨ Criar |

---

## Detalhes Técnicos

### Verificação de elegibilidade (Edge Function)

```typescript
// 1. Buscar user_id pelo email
const { data: profile } = await supabase
  .from('profiles')
  .select('id')
  .eq('email', email.toLowerCase())
  .maybeSingle();

if (!profile) {
  return { eligible: false, reason: 'not_found' };
}

// 2. Verificar pack upscaller-arcano ativo
const { data: pack } = await supabase
  .from('user_pack_purchases')
  .select('id')
  .eq('user_id', profile.id)
  .eq('pack_slug', 'upscaller-arcano')
  .eq('is_active', true)
  .maybeSingle();

if (!pack) {
  return { eligible: false, reason: 'no_pack' };
}

// 3. Verificar se já resgatou
const { data: existingClaim } = await supabase
  .from('promo_claims')
  .select('id')
  .eq('user_id', profile.id)
  .eq('promo_code', 'UPSCALER_1500')
  .maybeSingle();

if (existingClaim) {
  return { eligible: false, reason: 'already_claimed' };
}

// 4. Adicionar créditos mensais
const { data: creditResult } = await supabase.rpc('add_upscaler_credits', {
  _user_id: profile.id,
  _amount: 1500,
  _description: 'Resgate promoção UPSCALER_1500'
});

// 5. Registrar resgate
await supabase.from('promo_claims').insert({
  user_id: profile.id,
  promo_code: 'UPSCALER_1500',
  credits_granted: 1500,
  credit_type: 'monthly'
});

return { 
  eligible: true, 
  credits_added: 1500,
  new_balance: creditResult?.[0]?.new_balance 
};
```

### Página Frontend (simplificado)

```tsx
const ResgatarCreditos = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setStatus('checking');
    
    const response = await fetch('/functions/v1/claim-promo-credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, promo_code: 'UPSCALER_1500' })
    });
    
    const result = await response.json();
    
    if (result.eligible) {
      setStatus('success');
      toast.success('1.500 créditos adicionados!');
      setTimeout(() => navigate('/ferramentas-ia-aplicativo'), 2000);
    } else {
      setStatus('error');
      // Mapear reason para mensagem amigável
      setErrorMessage(getErrorMessage(result.reason));
    }
  };
  
  // ... render com formulário e feedback
};
```

---

## Segurança

1. **Rate limiting**: A Edge Function pode limitar tentativas por IP
2. **Validação de email**: Normalização e validação no backend
3. **Constraint único**: A tabela `promo_claims` impede resgates duplicados a nível de banco
4. **RLS**: Apenas service role pode inserir, usuários só podem ler próprios registros

---

## Resultado Esperado

Após aprovação e implementação:
- Página acessível em `/resgatar-creditos`
- Usuários com Upscaler Arcano podem resgatar 1.500 créditos mensais uma vez
- Créditos válidos por 30 dias (padrão mensal)
- Redirecionamento automático para `/ferramentas-ia-aplicativo`
- Controle de resgates para evitar abusos

