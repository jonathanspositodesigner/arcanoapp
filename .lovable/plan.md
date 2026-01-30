
# Plano: Adicionar Botão de Perfil e Sistema de Créditos no Upscaler

## Resumo

Adicionar na barra superior do Upscaler Arcano:
1. Um badge mostrando os créditos restantes do usuário
2. Um botão de perfil com menu dropdown contendo opções para configurar perfil, mudar senha, ver telefone e créditos

A ordem será: **Nome da ferramenta** → **Badge de créditos** → **Ícone de perfil**

## Layout Visual

```text
┌────────────────────────────────────────────────────────────────────────┐
│  ← Voltar  │  Upscaler Arcano  │           [💰 150]  [👤]             │
│            │                   │           (badge)  (perfil)          │
└────────────────────────────────────────────────────────────────────────┘
                                                      │
                                                      ▼
                                          ┌─────────────────────┐
                                          │ 👤 Meu Perfil       │
                                          │ 📱 (11) 99999-9999  │
                                          ├─────────────────────┤
                                          │ 💰 Créditos: 150    │
                                          ├─────────────────────┤
                                          │ 🔒 Alterar Senha    │
                                          │ ⚙️ Configurações    │
                                          ├─────────────────────┤
                                          │ 🚪 Sair             │
                                          └─────────────────────┘
```

## Comportamento

1. **Badge de Créditos**: Mostra quantidade atual de créditos restantes com ícone de moeda
2. **Botão de Perfil**: Ícone de usuário que abre um dropdown menu
3. **Menu Dropdown**: 
   - Mostra nome do usuário no topo
   - Exibe telefone cadastrado (se houver)
   - Mostra créditos restantes
   - Opção para alterar senha (navega para /change-password ou abre modal)
   - Opção de configurações (navega para /profile-settings)
   - Botão de logout

---

## Etapa 1: Criar Sistema de Créditos no Banco de Dados

### 1.1 Criar tabela `upscaler_credits`

```sql
CREATE TABLE public.upscaler_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.upscaler_credits ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own credits" 
  ON public.upscaler_credits 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all credits" 
  ON public.upscaler_credits 
  FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

### 1.2 Criar tabela `upscaler_credit_transactions` (histórico)

```sql
CREATE TABLE public.upscaler_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.upscaler_credit_transactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own transactions" 
  ON public.upscaler_credit_transactions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all transactions" 
  ON public.upscaler_credit_transactions 
  FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

### 1.3 Criar função para consumir créditos

```sql
CREATE OR REPLACE FUNCTION public.consume_upscaler_credits(
  _user_id UUID,
  _amount INTEGER,
  _description TEXT DEFAULT 'Upscaler usage'
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_balance INTEGER;
  updated_balance INTEGER;
BEGIN
  -- Get current balance (or create if not exists)
  INSERT INTO upscaler_credits (user_id, balance)
  VALUES (_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT balance INTO current_balance
  FROM upscaler_credits
  WHERE user_id = _user_id
  FOR UPDATE;
  
  IF current_balance < _amount THEN
    RETURN QUERY SELECT FALSE, current_balance, 'Saldo insuficiente'::TEXT;
    RETURN;
  END IF;
  
  updated_balance := current_balance - _amount;
  
  UPDATE upscaler_credits
  SET balance = updated_balance, updated_at = now()
  WHERE user_id = _user_id;
  
  INSERT INTO upscaler_credit_transactions 
    (user_id, amount, balance_after, transaction_type, description)
  VALUES 
    (_user_id, -_amount, updated_balance, 'consumption', _description);
  
  RETURN QUERY SELECT TRUE, updated_balance, NULL::TEXT;
END;
$$;
```

### 1.4 Criar função para obter saldo

```sql
CREATE OR REPLACE FUNCTION public.get_upscaler_credits(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT balance FROM upscaler_credits WHERE user_id = _user_id),
    0
  )
$$;
```

---

## Etapa 2: Criar Hook para Gerenciar Créditos

**Novo arquivo:** `src/hooks/useUpscalerCredits.tsx`

```tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUpscalerCredits = (userId: string | undefined) => {
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBalance = async () => {
    if (!userId) {
      setBalance(0);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc('get_upscaler_credits', {
      _user_id: userId
    });

    if (!error && data !== null) {
      setBalance(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchBalance();
  }, [userId]);

  const consumeCredits = async (amount: number, description?: string) => {
    if (!userId) return { success: false, error: 'Not authenticated' };
    
    const { data, error } = await supabase.rpc('consume_upscaler_credits', {
      _user_id: userId,
      _amount: amount,
      _description: description || 'Upscaler usage'
    });

    if (error || !data?.[0]?.success) {
      return { 
        success: false, 
        error: data?.[0]?.error_message || error?.message 
      };
    }

    setBalance(data[0].new_balance);
    return { success: true, newBalance: data[0].new_balance };
  };

  return { balance, isLoading, refetch: fetchBalance, consumeCredits };
};
```

---

## Etapa 3: Modificar Header do Upscaler

**Arquivo:** `src/pages/UpscalerArcanoTool.tsx`

### 3.1 Adicionar imports

```tsx
import { User, Settings, Lock, LogOut, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useUpscalerCredits } from '@/hooks/useUpscalerCredits';
```

### 3.2 Adicionar hooks e estados

```tsx
const { user, logout } = usePremiumStatus();
const { balance: credits, isLoading: creditsLoading } = useUpscalerCredits(user?.id);
const [userProfile, setUserProfile] = useState<{name?: string; phone?: string} | null>(null);

// Fetch user profile
useEffect(() => {
  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('name, phone')
      .eq('id', user.id)
      .single();
    if (data) setUserProfile(data);
  };
  fetchProfile();
}, [user]);
```

### 3.3 Modificar o Header

```tsx
<div className="sticky top-0 z-50 bg-[#0D0221]/80 backdrop-blur-lg border-b border-purple-500/20">
  <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
    {/* Left side: Back button + Title */}
    <div className="flex items-center gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={goBack}
        className="text-purple-300 hover:text-white hover:bg-purple-500/20"
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>
      <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
        {t('upscalerTool.title')}
      </h1>
    </div>

    {/* Right side: Credits Badge + Profile Dropdown */}
    <div className="flex items-center gap-2">
      {/* Credits Badge */}
      <Badge 
        variant="outline" 
        className="bg-purple-900/50 border-purple-500/30 text-purple-200 flex items-center gap-1.5 px-2.5 py-1"
      >
        <Coins className="w-3.5 h-3.5 text-yellow-400" />
        <span className="font-medium">
          {creditsLoading ? '...' : credits}
        </span>
      </Badge>

      {/* Profile Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-purple-300 hover:text-white hover:bg-purple-500/20 rounded-full"
          >
            <User className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-56 bg-[#1A0A2E] border-purple-500/30 text-white"
        >
          {/* User Info */}
          <DropdownMenuLabel className="text-purple-200">
            <div className="flex flex-col gap-1">
              <span className="font-medium">
                {userProfile?.name || user?.email?.split('@')[0] || 'Meu Perfil'}
              </span>
              <span className="text-xs text-purple-400 font-normal">
                {user?.email}
              </span>
            </div>
          </DropdownMenuLabel>
          
          {userProfile?.phone && (
            <div className="px-2 py-1.5 text-sm text-purple-300 flex items-center gap-2">
              <Phone className="w-3.5 h-3.5" />
              {userProfile.phone}
            </div>
          )}
          
          <DropdownMenuSeparator className="bg-purple-500/20" />
          
          {/* Credits Display */}
          <div className="px-2 py-2 flex items-center justify-between">
            <span className="text-sm text-purple-300 flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-400" />
              Créditos
            </span>
            <Badge className="bg-purple-600 text-white">
              {creditsLoading ? '...' : credits}
            </Badge>
          </div>
          
          <DropdownMenuSeparator className="bg-purple-500/20" />
          
          {/* Actions */}
          <DropdownMenuItem 
            onClick={() => navigate('/change-password')}
            className="cursor-pointer hover:bg-purple-500/20 focus:bg-purple-500/20"
          >
            <Lock className="w-4 h-4 mr-2" />
            Alterar Senha
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => navigate('/profile-settings')}
            className="cursor-pointer hover:bg-purple-500/20 focus:bg-purple-500/20"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="bg-purple-500/20" />
          
          <DropdownMenuItem 
            onClick={logout}
            className="cursor-pointer text-red-400 hover:bg-red-500/20 focus:bg-red-500/20 focus:text-red-400"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
</div>
```

---

## Etapa 4: Integrar Consumo de Créditos no Processamento

Atualizar a função `processImage()` para verificar e consumir créditos antes de processar:

```tsx
const processImage = async () => {
  if (!inputImage) {
    toast.error(t('upscalerTool.errors.selectFirst'));
    return;
  }

  const creditCost = version === 'pro' ? 60 : 40;
  
  // Check if user has enough credits
  if (credits < creditCost) {
    toast.error(`Créditos insuficientes. Necessário: ${creditCost}, Disponível: ${credits}`);
    return;
  }

  // Consume credits
  const result = await consumeCredits(creditCost, `Upscaler ${version} - ${resolution}`);
  if (!result.success) {
    toast.error(result.error || 'Erro ao consumir créditos');
    return;
  }

  // Continue with processing...
  setLastError(null);
  setStatus('uploading');
  // ... rest of the code
};
```

---

## Resumo das Mudanças

| Arquivo | Alteração |
|---------|-----------|
| **Migração SQL** | Criar tabelas `upscaler_credits` e `upscaler_credit_transactions` |
| **Migração SQL** | Criar funções `get_upscaler_credits` e `consume_upscaler_credits` |
| `src/hooks/useUpscalerCredits.tsx` | Novo hook para gerenciar créditos |
| `src/pages/UpscalerArcanoTool.tsx` | Adicionar badge de créditos e dropdown de perfil no header |
| `src/pages/UpscalerArcanoTool.tsx` | Integrar verificação e consumo de créditos no processamento |

---

## Fluxo de Créditos

```text
┌─────────────────────────────────────────────────────────────┐
│                   Usuário clica "Processar"                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌────────────────────────────┐
              │  Créditos >= Custo?        │
              │  (Standard=40, Pro=60)     │
              └────────────────────────────┘
                    │              │
                   SIM            NÃO
                    │              │
                    ▼              ▼
           ┌──────────────┐  ┌─────────────────┐
           │ Consume RPC  │  │ Toast de erro   │
           │ -40 ou -60   │  │ "Créditos       │
           └──────────────┘  │  insuficientes" │
                    │        └─────────────────┘
                    ▼
           ┌──────────────┐
           │ Atualiza UI  │
           │ balance -= X │
           └──────────────┘
                    │
                    ▼
           ┌──────────────┐
           │ Processa     │
           │ imagem       │
           └──────────────┘
```
