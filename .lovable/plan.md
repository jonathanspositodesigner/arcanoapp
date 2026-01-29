

## Remover "Remover Fundo" + Adicionar Fila Global Econômica

### Análise do Problema

Você está certo - sem coordenação global, os usuários 4 e 5 não têm como saber quando os primeiros terminaram. Precisa de algo que:
1. Registre quando um job inicia
2. Registre quando um job termina
3. Permita outros usuários verificar se há vaga

---

### Solução: Fila via Tabela + Polling Econômico

Em vez de Realtime (que dispara em cada mudança), usarei **polling com intervalo otimizado**:

| Abordagem | Custo por usuário na fila |
|-----------|---------------------------|
| Realtime | ~40 queries por job completado (todos recalculam) |
| **Polling 10s** | **~6 queries/minuto** (apenas 1 query por poll) |

O polling é mais previsível e controlável.

---

### Como Funciona

```
┌─────────────────────────────────────────────────────────────┐
│  FLUXO DA FILA                                              │
├─────────────────────────────────────────────────────────────┤
│  1. Usuário clica "Processar"                               │
│                                                             │
│  2. Frontend faz 1 query: COUNT(*) WHERE status='running'   │
│                                                             │
│  3a. Se < 3: INSERT com status='running', processa normal   │
│                                                             │
│  3b. Se >= 3: INSERT com status='waiting'                   │
│      → Mostra "Posição X na fila"                           │
│      → Polling a cada 10s:                                  │
│         - Conta running                                     │
│         - Conta waiting criados antes do meu                │
│         - Se running < 3 E sou o mais antigo → iniciar      │
│                                                             │
│  4. Ao terminar: UPDATE status='completed'                  │
│                                                             │
│  5. Cleanup automático: jobs > 10min são "abandonados"      │
└─────────────────────────────────────────────────────────────┘
```

---

### Estimativa de Custo Cloud

**Cenário: 10 usuários usando simultaneamente, 3 processando, 7 na fila**

| Operação | Frequência | Custo |
|----------|------------|-------|
| Verificar fila (SELECT COUNT) | 1x ao clicar "Processar" | Mínimo |
| Insert na fila | 1x por job | Mínimo |
| Polling enquanto espera | 7 users × 6/min × ~2 min espera | ~84 queries |
| Update ao terminar | 1x por job | Mínimo |

**Total estimado: ~90-100 queries por "rodada" de 10 usuários**

Comparação com Realtime: teria ~400 queries (cada mudança notifica todos)

---

### Mudanças no Código

#### 1. Nova Tabela: `upscaler_queue`

```sql
CREATE TABLE upscaler_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Índice para queries rápidas
CREATE INDEX idx_upscaler_queue_status_created 
  ON upscaler_queue(status, created_at);

-- RLS permissiva (tool pública, sem auth)
ALTER TABLE upscaler_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view queue" 
  ON upscaler_queue FOR SELECT USING (true);
  
CREATE POLICY "Anyone can insert" 
  ON upscaler_queue FOR INSERT WITH CHECK (true);
  
CREATE POLICY "Anyone can update" 
  ON upscaler_queue FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete" 
  ON upscaler_queue FOR DELETE USING (true);

-- Função de cleanup (jobs > 10 min são considerados abandonados)
CREATE OR REPLACE FUNCTION cleanup_stale_upscaler_jobs()
RETURNS void AS $$
BEGIN
  UPDATE upscaler_queue 
  SET status = 'abandoned' 
  WHERE status IN ('running', 'waiting') 
  AND created_at < NOW() - INTERVAL '10 minutes';
  
  DELETE FROM upscaler_queue 
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

#### 2. Modificar `UpscalerArcanoTool.tsx`

**Remover:**
- `type Mode = 'upscale' | 'rembg'` → apenas upscale
- `const [mode, setMode] = useState<Mode>('upscale')` 
- Toggle buttons (linhas 456-480)
- Todas as referências a `mode === 'rembg'`

**Adicionar:**
- Estado de fila: `queuePosition`, `queueId`, `isWaitingInQueue`
- Gerador de session ID único (via `crypto.randomUUID()`)
- Funções de fila:
  - `checkQueueAndProcess()` - verifica antes de processar
  - `startPollingForTurn()` - polling enquanto espera
  - `markJobCompleted()` - ao terminar
- UI de "Aguardando na fila"

**Novo fluxo do `processImage`:**

```typescript
const processImage = async () => {
  // Gerar session ID se não existir
  const sessionId = sessionIdRef.current || crypto.randomUUID();
  sessionIdRef.current = sessionId;

  // 1. Verificar quantos jobs estão rodando
  const { count: runningCount } = await supabase
    .from('upscaler_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'running');

  if (runningCount >= 3) {
    // 2. Entrar na fila como waiting
    const { data: queueEntry } = await supabase
      .from('upscaler_queue')
      .insert({ session_id: sessionId, status: 'waiting' })
      .select()
      .single();

    setQueueId(queueEntry.id);
    setIsWaitingInQueue(true);

    // 3. Calcular posição inicial
    const { count: position } = await supabase
      .from('upscaler_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'waiting')
      .lt('created_at', queueEntry.created_at);

    setQueuePosition((position || 0) + 1);

    // 4. Iniciar polling para verificar quando é minha vez
    startPollingForTurn(queueEntry.id, queueEntry.created_at);
    return;
  }

  // 5. Tem vaga - registrar e processar
  const { data: runningEntry } = await supabase
    .from('upscaler_queue')
    .insert({ 
      session_id: sessionId, 
      status: 'running', 
      started_at: new Date().toISOString() 
    })
    .select()
    .single();

  setQueueId(runningEntry.id);
  
  // Continuar com processamento normal...
  await actuallyProcessImage();
};

// Polling econômico: 10s
const startPollingForTurn = (myId: string, myCreatedAt: string) => {
  queuePollingRef.current = setInterval(async () => {
    // Limpar jobs abandonados primeiro (1 chamada RPC)
    await supabase.rpc('cleanup_stale_upscaler_jobs');

    // Verificar running count
    const { count: runningCount } = await supabase
      .from('upscaler_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'running');

    // Verificar minha posição
    const { count: aheadOfMe } = await supabase
      .from('upscaler_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'waiting')
      .lt('created_at', myCreatedAt);

    const newPosition = (aheadOfMe || 0) + 1;
    setQueuePosition(newPosition);

    // É minha vez?
    if (runningCount < 3 && newPosition === 1) {
      clearInterval(queuePollingRef.current);
      
      // Atualizar para running
      await supabase
        .from('upscaler_queue')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', myId);

      setIsWaitingInQueue(false);
      await actuallyProcessImage();
    }
  }, 10000); // 10 segundos
};
```

**UI quando na fila:**

```tsx
{isWaitingInQueue && (
  <Card className="bg-[#1A0A2E]/50 border-yellow-500/30 p-6">
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center animate-pulse">
        <Clock className="w-8 h-8 text-yellow-400" />
      </div>
      <div>
        <p className="text-xl font-bold text-yellow-300">
          Servidor ocupado
        </p>
        <p className="text-4xl font-bold text-white mt-2">
          {queuePosition}º na fila
        </p>
        <p className="text-sm text-purple-300/70 mt-2">
          Seu processamento iniciará automaticamente
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={cancelQueue}
        className="text-red-300 hover:text-red-100 hover:bg-red-500/20"
      >
        Sair da fila
      </Button>
    </div>
  </Card>
)}
```

---

### Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/UpscalerArcanoTool.tsx` | Remover rembg, adicionar lógica de fila |
| Nova migration SQL | Criar tabela `upscaler_queue` |

---

### Proteções Anti-Custo

1. **Polling fixo de 10s** - Não acelera sob carga
2. **Cleanup automático** - Jobs > 10min são marcados abandonados
3. **Deleção após 1h** - Tabela não cresce infinitamente
4. **Sem Realtime** - Evita cascata de queries
5. **Queries com COUNT apenas** - Não traz dados, só contagem

---

### Resultado Final

- ✅ Modo "Remover Fundo" removido
- ✅ Máximo 3 processamentos simultâneos
- ✅ Usuário vê posição na fila
- ✅ Inicia automaticamente quando chegar a vez
- ✅ Custo controlado (~100 queries por 10 usuários)

