
## Botão "Nova" - Manter fotos e gerar novamente

### Problema
Atualmente, o botão "Nova" reseta **tudo**, incluindo as 4 fotos que o usuário já enviou. O comportamento correto é manter as fotos e apenas limpar o resultado para permitir uma nova tentativa com as mesmas imagens.

### Solução
Alterar a função `handleReset` no arquivo `src/pages/GeradorPersonagemTool.tsx` para **não** limpar os estados das fotos (`frontImage`, `profileImage`, `semiProfileImage`, `lowAngleImage` e seus respectivos `File`).

### Detalhes técnicos

**Arquivo:** `src/pages/GeradorPersonagemTool.tsx` (linhas 341-356)

Antes:
```typescript
const handleReset = () => {
  endSubmit();
  setFrontImage(null); setFrontFile(null);
  setProfileImage(null); setProfileFile(null);
  setSemiProfileImage(null); setSemiProfileFile(null);
  setLowAngleImage(null); setLowAngleFile(null);
  setOutputImage(null);
  setStatus('idle');
  // ...
};
```

Depois:
```typescript
const handleReset = () => {
  endSubmit();
  // Mantém as fotos para permitir nova tentativa
  setOutputImage(null);
  setStatus('idle');
  setProgress(0);
  setZoomLevel(1);
  setJobId(null);
  setQueuePosition(0);
  setCurrentStep(null);
  setDebugErrorMessage(null);
  clearGlobalJob();
};
```

Apenas remove as 4 linhas que limpam as imagens e arquivos. O usuário ainda pode trocar fotos individualmente se quiser, mas ao clicar "Nova", as fotos permanecem prontas para uma nova geração.
