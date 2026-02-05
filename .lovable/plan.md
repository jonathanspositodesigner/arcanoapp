
# Plano: Botão Provisório para Download da Imagem Otimizada

## Objetivo
Adicionar um botão temporário no Upscaler Arcano para baixar a imagem que foi otimizada pelo `optimizeForAI`, permitindo verificar se a compressão para 1536px está funcionando corretamente.

---

## Onde o Botão Vai Aparecer

O botão será exibido **logo abaixo do card de upload**, apenas quando uma imagem estiver selecionada. Isso permite baixar a imagem otimizada ANTES de enviar para processamento.

```text
┌─────────────────────────────────┐
│  [Imagem Preview] Nome.webp     │
│  Clique para trocar             │
└─────────────────────────────────┘
 ↓ NOVO BOTÃO AQUI ↓
┌─────────────────────────────────┐
│  ⬇️ Baixar Imagem Otimizada    │
│  (DEBUG - Provisório)           │
└─────────────────────────────────┘
```

---

## Implementação

### Arquivo: `src/pages/UpscalerArcanoTool.tsx`

1. **Criar função de download** (após `downloadResult`):

```text
downloadOptimizedInput():
  - Pega o base64 de `inputImage`
  - Cria um link de download com o nome `inputFileName`
  - Força o download
```

2. **Adicionar botão na UI** (logo após o Card de upload, linha ~597):

```text
{inputImage && (
  <Button
    variant="outline"
    size="sm"
    onClick={downloadOptimizedInput}
    className="w-full text-xs border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
  >
    <Download className="w-3 h-3 mr-1" />
    Baixar Imagem Otimizada (DEBUG)
  </Button>
)}
```

---

## Visual do Botão

- **Cor**: Amarelo (para indicar que é provisório/debug)
- **Texto**: "Baixar Imagem Otimizada (DEBUG)"
- **Ícone**: Download
- **Posição**: Abaixo do card de upload, só aparece quando tem imagem

---

## Como Testar

1. Abra o Upscaler Arcano
2. Faça upload de uma imagem grande (ex: 4000x3000 pixels)
3. Clique no botão "Baixar Imagem Otimizada (DEBUG)"
4. Abra a imagem baixada e verifique:
   - Dimensões (deve ser máximo 1536px no maior lado)
   - Formato (deve ser .webp)
   - Tamanho (deve ser significativamente menor que o original)

---

## Remoção Futura

Este botão é **provisório** e deve ser removido após confirmar que a otimização está funcionando. Basta pedir para remover o botão amarelo de debug do Upscaler.
