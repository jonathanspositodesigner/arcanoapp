

# Plano: Adicionar Aviso de Página + Recuperação de Jobs

## Problema Identificado

Atualmente, se o usuário fechar a página durante o processamento:
- O job continua no RunningHub e webhook salva resultado no banco
- Mas o usuário perde o resultado porque não está mais escutando

## Solução

### 1. Aviso ao Tentar Sair da Página

Adicionar `beforeunload` event listener que mostra confirmação do navegador quando está processando.

**Arquivo**: `src/pages/UpscalerArcanoTool.tsx`

```typescript
// Novo useEffect para aviso de saída
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (status === 'processing' || status === 'uploading' || isWaitingInQueue) {
      e.preventDefault();
      e.returnValue = 'Seu upscale está em andamento. Tem certeza que deseja sair?';
      return e.returnValue;
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [status, isWaitingInQueue]);
```

Isso mostra o alerta nativo do navegador: "Tem certeza que deseja sair? Alterações podem não ser salvas."

### 2. Aviso Visual na Interface

Adicionar banner/alerta visível durante processamento informando para não fechar.

```tsx
{(status === 'processing' || isWaitingInQueue) && (
  <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg p-3 mb-4 flex items-center gap-2">
    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
    <p className="text-sm text-amber-200">
      {t('upscalerTool.warnings.dontClose')}
    </p>
  </div>
)}
```

Tradução: "Não feche esta página! Seu upscale está sendo processado e o resultado aparecerá automaticamente aqui."

### 3. Recuperação de Jobs Pendentes

Ao carregar a página, verificar se existe job pendente para esta sessão.

```typescript
// Novo useEffect para recuperar jobs pendentes
useEffect(() => {
  const checkPendingJob = async () => {
    // Verifica localStorage por sessão anterior
    const savedSessionId = localStorage.getItem('upscaler_session_id');
    if (!savedSessionId) {
      // Nova sessão, salvar ID
      localStorage.setItem('upscaler_session_id', sessionIdRef.current);
      return;
    }

    // Usar sessão anterior
    sessionIdRef.current = savedSessionId;

    // Buscar job pendente desta sessão
    const { data: pendingJob } = await supabase
      .from('upscaler_jobs')
      .select('*')
      .eq('session_id', savedSessionId)
      .in('status', ['queued', 'running'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (pendingJob) {
      console.log('[Upscaler] Found pending job:', pendingJob.id);
      setJobId(pendingJob.id);
      setStatus('processing');
      setIsWaitingInQueue(pendingJob.status === 'queued');
      setQueuePosition(pendingJob.position || 0);
      toast.info('Recuperando seu upscale em andamento...');
    }

    // Verificar também se tem job completo recente (últimos 5 min)
    const { data: completedJob } = await supabase
      .from('upscaler_jobs')
      .select('*')
      .eq('session_id', savedSessionId)
      .eq('status', 'completed')
      .gte('completed_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (completedJob && completedJob.output_url) {
      console.log('[Upscaler] Found recent completed job:', completedJob.id);
      setOutputImage(completedJob.output_url);
      setStatus('completed');
      toast.success('Seu upscale anterior foi recuperado!');
    }
  };

  checkPendingJob();
}, []);
```

### 4. Salvar Session ID no localStorage

Modificar criação do session para persistir:

```typescript
// Mudança na inicialização
const sessionIdRef = useRef<string>('');

useEffect(() => {
  const savedId = localStorage.getItem('upscaler_session_id');
  if (savedId) {
    sessionIdRef.current = savedId;
  } else {
    const newId = crypto.randomUUID();
    sessionIdRef.current = newId;
    localStorage.setItem('upscaler_session_id', newId);
  }
}, []);
```

### 5. Novas Traduções

**Arquivo**: `src/locales/pt/tools.json`

```json
{
  "upscalerTool": {
    "warnings": {
      "dontClose": "Não feche esta página! Seu upscale está sendo processado e o resultado aparecerá automaticamente aqui.",
      "recovered": "Seu upscale anterior foi recuperado!"
    }
  }
}
```

---

## Fluxo Após Implementação

```text
Usuário inicia upscale
        │
        ▼
┌─────────────────────────┐
│ Aviso visual aparece:   │
│ "Não feche a página!"   │
└─────────────────────────┘
        │
        ├── Se tentar fechar ──▶ Confirmação do navegador
        │
        ├── Se trocar aba ──▶ Continua funcionando ✅
        │
        ├── Se minimizar ──▶ Continua funcionando ✅
        │
        └── Se fechar e voltar depois:
                │
                ▼
        ┌─────────────────────────┐
        │ Verifica job pendente   │
        │ ou recém-completado     │
        └─────────────────────────┘
                │
                ├── Job running ──▶ Reconecta Realtime, aguarda
                │
                └── Job completed ──▶ Mostra resultado recuperado
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/UpscalerArcanoTool.tsx` | Adicionar beforeunload, aviso visual, recuperação de jobs |
| `src/locales/pt/tools.json` | Adicionar strings de aviso |
| `src/locales/es/tools.json` | Adicionar strings de aviso (se existir) |

---

## Benefícios

1. **Usuário informado**: Sabe que não deve fechar
2. **Proteção ativa**: Navegador pede confirmação se tentar sair
3. **Recuperação**: Mesmo se fechar acidentalmente, recupera o resultado
4. **Troca de aba**: Funciona normalmente, sem problemas

