
# Plano: Correção de Jobs Órfãos e Validação de Envio

## Problema Identificado

Os jobs do Veste AI estão sendo criados no banco de dados, mas **as imagens nunca chegam à Edge Function**. O job fica "órfão" com status `queued` e sem `person_file_name` ou `clothing_file_name`.

Análise do job `c0605021...`:
- `person_file_name: null` - imagem da pessoa nunca foi enviada
- `clothing_file_name: null` - imagem da roupa nunca foi enviada
- `task_id: null` - RunningHub nunca foi chamado
- O job ficou 28 minutos na fila até ser marcado como "incompleto"

## Causa Raiz

O fluxo atual tem uma falha arquitetural:

```text
1. Usuário clica "Vestir"
2. Job é CRIADO no banco (status: queued) ← Primeiro cria
3. Compressão de imagens...
4. Upload para Storage...
5. Chama Edge Function... ← Se falhar aqui, job fica órfão
```

Se o usuário **fechar a página** ou **acontecer um erro** entre os passos 2 e 5, o job fica órfão.

---

## Solução: Refatorar Ordem do Fluxo

### Nova Arquitetura

```text
1. Usuário clica "Vestir"
2. Compressão de imagens... ← Primeiro processa
3. Upload para Storage...
4. Job CRIADO no banco com URLs já preenchidas ← Cria depois
5. Chama Edge Function
```

Se falhar nos passos 2-3, nenhum job é criado. Isso elimina jobs órfãos.

---

## Implementação

### 1. Refatorar VesteAITool.tsx

Mover a criação do job para DEPOIS do upload das imagens:

```text
handleProcess():
  1. Verificar créditos
  2. setStatus('uploading')
  3. Comprimir imagem da pessoa
  4. Upload para Storage → personUrl
  5. Comprimir imagem da roupa
  6. Upload para Storage → clothingUrl
  7. CRIAR job no banco com personUrl e clothingUrl já preenchidos
  8. Chamar Edge Function
```

### 2. Refatorar PoseChangerTool.tsx

Mesmo padrão do Veste AI.

### 3. Adicionar Colunas de Tracking (Opcional)

Adicionar colunas `person_image_url` e `clothing_image_url`/`reference_image_url` nas tabelas para rastrear as URLs das imagens originais.

### 4. Cleanup Automático

O Queue Manager já tem um processo que marca jobs incompletos após 30 minutos:

```sql
-- Jobs que ficaram 30+ minutos em queued sem task_id
UPDATE veste_ai_jobs 
SET status = 'failed', error_message = 'Job incompleto - imagens não foram enviadas'
WHERE status = 'queued' AND task_id IS NULL 
AND created_at < NOW() - INTERVAL '30 minutes';
```

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/VesteAITool.tsx` | Refatorar `handleProcess` para criar job DEPOIS do upload |
| `src/pages/PoseChangerTool.tsx` | Refatorar `handleProcess` para criar job DEPOIS do upload |

---

## Validação do Botão (Confirmação)

O botão já está corretamente validado:

**VesteAITool.tsx**:
```typescript
const canProcess = personImage && clothingImage && status === 'idle';
// ...
<Button disabled={!canProcess || isProcessing} />
```

**PoseChangerTool.tsx**:
```typescript
const canProcess = personImage && referenceImage && status === 'idle';
// ...
<Button disabled={!canProcess || isProcessing} />
```

O botão **SÓ** é habilitado quando:
- `personImage` está preenchido E
- `clothingImage`/`referenceImage` está preenchido E
- `status` é 'idle' (não está processando)

A validação está correta. O problema era que o job era criado antes de garantir que as imagens foram enviadas.

---

## Resumo das Correções

1. Refatorar ordem do fluxo: upload ANTES de criar job
2. Garantir que URLs estejam preenchidas ao criar job
3. Manter cleanup automático para jobs que falharem silenciosamente
4. Validação do botão já está OK (não precisa mudar)

---

## Benefícios

- Elimina jobs órfãos
- Melhor UX: se upload falhar, usuário vê erro imediato
- Banco de dados mais limpo
- Menor consumo de créditos incorretos
