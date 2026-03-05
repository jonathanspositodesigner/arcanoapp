

# Corrigir exibição do resultado — Gerar Imagem

## Problema
Existem **dois** pontos no código que checam `resultBase64` para mostrar o resultado e os botões. Como a edge function agora retorna apenas `output_url` (e `resultBase64` é sempre `null`), nada aparece.

## Correções em `src/pages/GerarImagemTool.tsx`

### 1. Condição de exibição da imagem (linha 297)
Trocar `resultBase64 ?` por `(resultUrl || resultBase64) ?`

### 2. Src da imagem (linha 303)
Trocar `src={`data:${resultMimeType};base64,${resultBase64}`}` por `src={resultUrl || `data:${resultMimeType};base64,${resultBase64}`}`

### 3. Botões de download/nova geração (linha 466)
Trocar `resultBase64 &&` por `(resultUrl || resultBase64) &&`

Três linhas. Sem mais nada.

