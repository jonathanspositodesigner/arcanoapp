
# Plano: Histórico de Créditos + Consumo no Backend

## Resumo
Implementar duas melhorias:
1. **Histórico de Transações**: Mostrar as últimas transações de créditos na página de perfil
2. **Consumo no Backend**: Mover a cobrança de créditos para o backend (edge function), garantindo que só cobre se o upscaler iniciar com sucesso

---

## Problema Atual

O consumo de créditos acontece **antes** do processamento iniciar:
```typescript
// No frontend (UpscalerArcanoTool.tsx linha 374)
const creditResult = await consumeCredits(creditCost, ...);
if (!creditResult.success) return;

// Só depois cria o job e faz upload...
```

Se o upload ou o início do job falhar, o usuário **já perdeu os créditos**.

---

## Solução

### 1. Histórico de Transações (ProfileSettings.tsx)

Adicionar uma seção "Histórico de Créditos" que mostra as últimas 10 transações:
- Data/hora
- Valor (+X ou -X)
- Tipo (consumo/recarga)
- Descrição

A consulta já está protegida por RLS - cada usuário só vê suas próprias transações.

### 2. Consumo no Backend (Edge Function)

Mover a lógica de consumo para a função `runninghub-upscaler/run`:
- Receber o `userId` e `creditCost` do frontend
- **Primeiro**: Verificar se o job pode iniciar (slot disponível ou entrar na fila)
- **Segundo**: Consumir créditos via RPC `consume_upscaler_credits`
- Se consumo falhar → retornar erro, não criar job
- Se consumo OK → criar job e processar

O frontend passa a apenas verificar se tem saldo suficiente (otimista) e delega o débito real para o backend.

---

## Arquivos a Modificar

### 1. `src/pages/ProfileSettings.tsx`
- Adicionar estado para transações
- Buscar últimas 10 transações do usuário
- Renderizar lista com data, valor e descrição

### 2. `src/pages/UpscalerArcanoTool.tsx`
- Remover chamada `consumeCredits()` antes do processamento
- Passar `userId` e `creditCost` para a edge function
- Apenas verificação local de saldo (para UX, não para segurança)
- Atualizar saldo local após resposta de sucesso do backend

### 3. `supabase/functions/runninghub-upscaler/index.ts`
- Adicionar `userId` e `creditCost` nos parâmetros
- Antes de criar/iniciar job, consumir créditos via RPC
- Se falhar consumo, retornar erro sem processar
- Se upscale falhar, considerar se deve reembolsar ou não (opcional)

---

## Detalhes Técnicos

### Histórico no ProfileSettings
```tsx
// Novo estado
const [transactions, setTransactions] = useState<any[]>([]);
const [transactionsLoading, setTransactionsLoading] = useState(true);

// Buscar transações
useEffect(() => {
  const fetchTransactions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('upscaler_credit_transactions')
      .select('amount, transaction_type, description, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setTransactions(data);
    setTransactionsLoading(false);
  };
  fetchTransactions();
}, [user]);

// Renderização
<Card>
  <h2>Histórico de Créditos</h2>
  {transactions.map((tx, i) => (
    <div key={i} className="flex justify-between">
      <span>{format(new Date(tx.created_at), 'dd/MM HH:mm')}</span>
      <span className={tx.amount < 0 ? 'text-red-400' : 'text-green-400'}>
        {tx.amount > 0 ? '+' : ''}{tx.amount}
      </span>
      <span className="text-sm text-gray-400">{tx.description}</span>
    </div>
  ))}
</Card>
```

### Consumo no Backend (handleRun)
```typescript
async function handleRun(req: Request) {
  const { 
    jobId, fileName, detailDenoise, resolution, 
    prompt, version, framingMode,
    userId, creditCost  // NOVOS PARÂMETROS
  } = await req.json();
  
  // Validar parâmetros obrigatórios
  if (!userId || !creditCost) {
    return new Response(JSON.stringify({ 
      error: 'userId e creditCost são obrigatórios', 
      code: 'MISSING_AUTH'
    }), { status: 400, headers: corsHeaders });
  }
  
  // PRIMEIRO: Consumir créditos
  const { data: creditResult, error: creditError } = await supabase.rpc(
    'consume_upscaler_credits', 
    {
      _user_id: userId,
      _amount: creditCost,
      _description: `Upscaler ${version} - ${resolution}`
    }
  );
  
  if (creditError || !creditResult?.[0]?.success) {
    return new Response(JSON.stringify({ 
      error: creditResult?.[0]?.error_message || 'Saldo insuficiente',
      code: 'INSUFFICIENT_CREDITS',
      currentBalance: creditResult?.[0]?.new_balance
    }), { status: 400, headers: corsHeaders });
  }
  
  // DEPOIS: Atualizar job e processar...
  // (resto da lógica existente)
}
```

### Frontend Simplificado
```typescript
const processImage = async () => {
  const creditCost = version === 'pro' ? 60 : 40;
  
  // Verificação otimista (só UX, backend valida de verdade)
  if (credits < creditCost) {
    toast.error(`Créditos insuficientes. Necessário: ${creditCost}`);
    return;
  }
  
  // NÃO CONSOME AQUI MAIS - backend vai consumir
  setStatus('uploading');
  // ... resto do código
  
  // Na chamada run, passar userId e creditCost
  const runResponse = await supabase.functions.invoke('runninghub-upscaler/run', {
    body: {
      jobId: job.id,
      fileName,
      // ... outros params
      userId: user?.id,      // NOVO
      creditCost: creditCost // NOVO
    },
  });
  
  // Se sucesso, atualizar saldo local
  if (runResponse.data?.success) {
    refetch(); // Busca saldo atualizado do servidor
  }
};
```

---

## Fluxo Atualizado

```text
ANTES (problemático):
Frontend → consumeCredits() → Se OK → createJob → upload → run
   ❌ Se upload falhar, créditos já foram cobrados!

DEPOIS (seguro):
Frontend → createJob → upload → run(userId, creditCost)
   └→ Backend: consumeCredits → Se OK → processar
       ❌ Se falhar upload ou run, créditos NÃO são cobrados
       ✅ Só cobra quando o job efetivamente inicia
```

---

## Validações

- Histórico mostra todas as transações do usuário
- Créditos só são debitados após upload + início do job com sucesso
- Se qualquer etapa falhar antes do `run`, não há cobrança
- Saldo é atualizado no frontend após confirmação do backend
