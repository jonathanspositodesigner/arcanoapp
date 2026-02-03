
# Correção: Upload de Imagem Não Funciona Após Reset

## Problema Identificado

Após clicar em **"Processar Nova Imagem"**, o botão de upload ignora os cliques porque o `<input type="file">` ainda contém o valor do arquivo anterior.

**Causa raiz:** A função `resetTool` limpa os estados React mas não limpa o `fileInputRef.current.value`, fazendo com que o evento `onChange` do input não dispare.

## Localização do Bug

**Arquivo:** `src/pages/UpscalerArcanoTool.tsx`

**Função problemática (linhas 526-537):**
```typescript
const resetTool = useCallback(() => {
  setInputImage(null);
  setInputFileName('');
  setOutputImage(null);
  setStatus('idle');
  setProgress(0);
  setSliderPosition(50);
  setLastError(null);
  setJobId(null);
  setIsWaitingInQueue(false);
  setQueuePosition(0);
  // ❌ FALTA: limpar o fileInputRef.current.value
}, []);
```

## Solução

Adicionar a limpeza do file input na função `resetTool`:

```typescript
const resetTool = useCallback(() => {
  setInputImage(null);
  setInputFileName('');
  setOutputImage(null);
  setStatus('idle');
  setProgress(0);
  setSliderPosition(50);
  setLastError(null);
  setJobId(null);
  setIsWaitingInQueue(false);
  setQueuePosition(0);
  // ✅ Limpar o input de arquivo para permitir nova seleção
  if (fileInputRef.current) {
    fileInputRef.current.value = '';
  }
}, []);
```

## Referência

Este padrão já é usado corretamente em outros componentes do projeto, como em `PartnerUploadArtes.tsx` (linhas 163-165).

## Impacto

- **Upscaler Arcano**: Upload funcionará corretamente após reset
- **Outros componentes**: Nenhum impacto
