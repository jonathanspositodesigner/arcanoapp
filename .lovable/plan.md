

# Plano: Reconfigurar Chave API Google e Reativar Gerar Imagem/Vídeo

## Resumo
Atualizar o secret `GOOGLE_GEMINI_API_KEY` com a nova chave e reativar as páginas Gerar Imagem e Gerar Vídeo que foram desabilitadas temporariamente.

## O que já está certo no código
As edge functions `generate-image`, `generate-video` e `poll-video-status` já usam os endpoints corretos:
- **Imagen**: `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` com `x-goog-api-key`
- **Veo 3.1**: `generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning` com `x-goog-api-key`
- **Poll**: `generativelanguage.googleapis.com/v1beta/{operation_name}` com `x-goog-api-key`

Nenhuma alteração de código nas edge functions é necessária — a estrutura está correta.

## Passos

### 1. Atualizar o secret `GOOGLE_GEMINI_API_KEY`
Vou pedir a nova chave via ferramenta segura de secrets (caixinha). Você cola a chave lá.

### 2. Reativar as rotas no App.tsx
Descomentar as rotas `/gerar-imagem` e `/gerar-video` que foram desabilitadas.

### 3. Reativar os botões na navegação
- **FloatingToolsNav.tsx**: Descomentar `/gerar-imagem` e `/gerar-video` no array de rotas
- **AppSidebar.tsx**: Readicionar os itens "Gerar Imagem" e "Gerar Vídeo" no menu lateral

### 4. Testar a geração
Após a chave ser inserida, testar com uma chamada real para confirmar que funciona.

## Arquivos modificados
- `src/App.tsx` — descomentar 2 linhas de Route
- `src/components/FloatingToolsNav.tsx` — descomentar 2 linhas
- `src/components/layout/AppSidebar.tsx` — readicionar itens do menu

