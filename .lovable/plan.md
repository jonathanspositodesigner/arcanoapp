
## Lightbox de Criações com Ações Inteligentes

### Comportamento
Clicar numa mídia em `/minhas-criacoes` abre um modal full-screen com a mídia ampliada e botões contextuais:
- **Imagem**: Baixar · Excluir · Fazer Upscale · Modificar · Gerar Vídeo
- **Vídeo**: Baixar · Excluir · Fazer Upscale (Vídeo)

### Arquivos novos
1. **`src/lib/urlToFile.ts`** — Helper que baixa uma URL (via download-proxy se necessário) e devolve um `File`.
2. **`src/components/ai-tools/creations/CreationLightboxModal.tsx`** — `<Dialog>` full-screen mostrando `output_url` em qualidade total + barra de ações.

### Arquivos editados (mudanças aditivas, sem risco)
3. **`src/components/ai-tools/creations/CreationCard.tsx`** — adiciona `onClick` no container que dispara `onOpen(creation)`. Botões da overlay já têm `stopPropagation`.
4. **`src/components/ai-tools/creations/MyCreationsGrid.tsx`** — gerencia `selectedCreation` e monta o lightbox.
5. **`src/pages/UpscalerArcanoTool.tsx`** — `useEffect` mount: se `location.state?.prefillImageUrl`, faz `urlToFile` → chama `handleFileSelect(file)` existente. Limpa state com `navigate(pathname, { replace: true })`. Try/catch.
6. **`src/pages/GerarImagemTool.tsx`** — mesmo padrão → `processFiles([file])`.
7. **`src/pages/GerarVideoTool.tsx`** — `setSelectedModel('veo3.1-fast')` + `setGenerationMode('with_frames')` + popular `startFrame` via handler existente.
8. **`src/pages/VideoUpscalerTool.tsx`** — pré-carrega vídeo via handler existente (sem disparar upscale). UI de trim aparece naturalmente se >10s.
9. **`src/pages/Index.tsx`** — `APP_BUILD_VERSION` → `1.3.5`.

### Garantias de segurança
- Mudanças nas ferramentas são **somente aditivas** (novo `useEffect` que só age quando `location.state` está presente).
- Nada toca em créditos, RPCs, edge functions, filas ou lógica de geração.
- Reaproveita 100% dos handlers de upload manual já testados.
- `try/catch` em todo fetch + limpeza de `location.state` para evitar reprefill em F5.
- Navegação para a rota correta verificada em `App.tsx` antes de codar.
