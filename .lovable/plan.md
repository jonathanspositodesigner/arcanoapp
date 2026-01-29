

## Corrigir Vídeos Mostrando "Arquivo não encontrado" Intermitentemente

### Problema Identificado

O componente `SecureVideo` em `src/components/SecureMedia.tsx` tem lógica de retry muito restrita para vídeos:

```typescript
// Linha 141-150
const handleVideoError = () => {
  // Only retry once to avoid long waits for missing files
  if (retryCount < 1) {
    setTimeout(() => {
      setRetryCount(prev => prev + 1);
    }, 500);  // Apenas 500ms de espera
  } else {
    setError(true);  // Mostra "Arquivo não encontrado"
  }
};
```

**Problemas:**
1. **Timeout muito curto (500ms)** - Vídeos maiores ou conexões lentas não conseguem carregar metadata a tempo
2. **Apenas 1 retry** - Se o primeiro carregamento falha, só tenta mais uma vez
3. **preload="metadata"** pode falhar em conexões instáveis antes do vídeo realmente tentar carregar
4. **Eventos de load conflitantes** - `onLoadedData`, `onLoadedMetadata`, `onCanPlay` podem disparar em ordens diferentes

### Verificação no Banco

Os vídeos existem no storage:
- São João: `8b0efec9-5ae5-4337-8000-a8626ac1758a-1766250848461.mp4` ✓
- Rave Cyberpunk: `fcae1799-7ab9-46c3-b345-0c3fe0c8ba75-1766250846930.mp4` ✓
- Pizeiro: `740af081-193c-4035-bc1a-df023d099493-1766250845884.mp4` ✓
- Noite Chuvosa: `ad2bfcc7-adde-4cfb-a084-73484bde1be1-1766250844513.mp4` ✓

**Conclusão**: O problema é de carregamento/timeout, não de arquivos ausentes.

---

### Solução

Melhorar a robustez do componente `SecureVideo`:

1. **Aumentar retries para 3**
2. **Aumentar delay entre retries para 1000ms**
3. **Adicionar verificação se vídeo já está em cache**
4. **Adicionar timeout para evitar loading infinito**

---

### Mudanças no Código

**Arquivo:** `src/components/SecureMedia.tsx`

#### Alterar handleVideoError (linhas 141-150):

```typescript
const handleVideoError = () => {
  // Retry up to 3 times with increasing delays for videos
  if (retryCount < 3) {
    const delay = 1000 * (retryCount + 1); // 1s, 2s, 3s
    setTimeout(() => {
      setRetryCount(prev => prev + 1);
    }, delay);
  } else {
    setError(true);
  }
};
```

#### Adicionar verificação de cache mais robusta (linhas 128-135):

```typescript
// Check if video is already loaded from cache
useEffect(() => {
  if (videoRef.current && !videoLoaded && !error) {
    const video = videoRef.current;
    // readyState >= 2 means has current data
    if (video.readyState >= 2) {
      setVideoLoaded(true);
    } else if (video.readyState === 0 && video.networkState === 3) {
      // Network error - trigger retry
      handleVideoError();
    }
  }
}, [videoLoaded, error, retryCount]);
```

#### Alterar preload para "auto" quando em página admin (linha 516 do AdminManageArtes):

```typescript
<SecureVideo 
  src={arte.image_url} 
  className="w-full h-48 object-cover" 
  isPremium={arte.is_premium || false} 
  autoPlay 
  muted 
  loop 
  preload="auto"  // Força carregamento completo no admin
/>
```

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/SecureMedia.tsx` | Aumentar retries (1→3), aumentar delay (500ms→1-3s progressivo), verificação de cache melhorada |
| `src/pages/AdminManageArtes.tsx` | Usar `preload="auto"` para vídeos no admin |

---

### Resultado Esperado

- Vídeos terão até 3 tentativas de carregar (com delays de 1s, 2s, 3s)
- Total de até 6 segundos antes de mostrar erro
- Melhor detecção de vídeos em cache
- Menos falsos positivos de "Arquivo não encontrado"
- Admin panel carrega vídeos de forma mais confiável

