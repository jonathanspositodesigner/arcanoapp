

## Correção: Marcar job como failed imediatamente quando Edge Function falha no cliente

### O que muda
Uma unica alteracao no arquivo `src/pages/UpscalerArcanoTool.tsx`, no bloco catch (linhas 626-636).

### Detalhes tecnicos

**Mudanca 1 - Antes do try (linha 516):**
Declarar variavel `let createdJobId: string | null = null;` para que o catch consiga acessar o ID do job.

**Mudanca 2 - Apos criar o job (linha 582):**
Adicionar `createdJobId = job.id;` logo apos `setJobId(job.id);`

**Mudanca 3 - No catch (linhas 626-636):**
Adicionar chamada ao RPC `mark_pending_job_as_failed` antes de atualizar a UI:

```typescript
} catch (error: any) {
  console.error('[Upscaler] Error:', error);
  
  // Marcar job como failed no banco imediatamente
  if (createdJobId) {
    try {
      await supabase.rpc('mark_pending_job_as_failed', {
        p_table_name: 'upscaler_jobs',
        p_job_id: createdJobId,
        p_error_message: `Erro no cliente: ${(error.message || 'Desconhecido').substring(0, 200)}`
      });
      console.log('[Upscaler] Job marked as failed in DB:', createdJobId);
    } catch (rpcErr) {
      console.error('[Upscaler] Failed to mark job in DB:', rpcErr);
    }
  }
  
  setStatus('error');
  setLastError({
    message: error.message || 'Erro desconhecido',
    code: 'UPLOAD_ERROR',
    solution: 'Tente novamente ou use uma imagem menor.'
  });
  toast.error('Erro ao processar imagem');
  endSubmit();
}
```

### Riscos: ZERO
- O RPC `mark_pending_job_as_failed` ja existe e e usado pelo watchdog ha semanas
- So atualiza jobs com status `pending` do proprio usuario (seguro)
- Se o RPC falhar, o try/catch interno engole o erro e o watchdog continua como backup
- Nenhuma outra parte do fluxo e alterada

### Arquivo afetado
- `src/pages/UpscalerArcanoTool.tsx` (3 edicoes pontuais, ~12 linhas adicionadas)
