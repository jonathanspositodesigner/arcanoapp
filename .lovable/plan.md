

## Correção do Carregamento Infinito dos Vídeos do YouTube no Upscaler

### Problema Identificado

Os vídeos do YouTube nas aulas do Upscaler Arcano estão carregando indefinidamente. Após análise do código, identifiquei os seguintes problemas:

1. **Iframe sem atributos essenciais** - Faltam `loading`, `title`, e `key` que são importantes para o carregamento correto
2. **Falta de indicador visual de carregamento** - Usuário não sabe se o vídeo está carregando ou travado
3. **IIFE dentro do JSX** - Uso de função anônima invocada imediatamente pode causar re-renders
4. **Falta de tratamento de erro** - Se o vídeo falhar em carregar, não há feedback

---

### Solução

Refatorar o componente de vídeo no `ToolVersionLessons.tsx` para:

1. Adicionar `key` única baseada na URL do vídeo para forçar re-render quando a lição muda
2. Adicionar atributo `loading="lazy"` para otimização de performance  
3. Adicionar `title` para acessibilidade
4. Mostrar indicador de carregamento enquanto o iframe está sendo carregado
5. Usar `useMemo` para calcular embedUrl em vez de IIFE
6. Adicionar `referrerPolicy` e `sandbox` para maior compatibilidade

---

### Mudanças no Código

**Arquivo:** `src/pages/ToolVersionLessons.tsx`

#### 1. Adicionar estado para controlar loading do vídeo (após linha 154):

```typescript
const [videoLoading, setVideoLoading] = useState(true);
```

#### 2. Resetar loading quando a lição muda (no useMemo de lessons, adicionar useEffect):

```typescript
// Reset video loading state when lesson changes
useEffect(() => {
  setVideoLoading(true);
}, [selectedLesson]);
```

#### 3. Calcular embedUrl com useMemo (adicionar após linha 190):

```typescript
const currentEmbedUrl = useMemo(() => {
  if (!currentLesson?.videoUrl) return null;
  return getVideoEmbedUrl(currentLesson.videoUrl);
}, [currentLesson?.videoUrl]);
```

#### 4. Refatorar o bloco do vídeo (linhas 616-639):

**De:**
```typescript
{/* Video */}
<div className="aspect-video bg-black rounded-lg overflow-hidden">
  {currentLesson.videoUrl ? (
    (() => {
      const embedUrl = getVideoEmbedUrl(currentLesson.videoUrl);
      return embedUrl ? (
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
          <Play className="w-16 h-16" />
        </div>
      );
    })()
  ) : (
    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
      <Play className="w-16 h-16" />
    </div>
  )}
</div>
```

**Para:**
```typescript
{/* Video */}
<div className="aspect-video bg-black rounded-lg overflow-hidden relative">
  {currentEmbedUrl ? (
    <>
      {/* Loading indicator */}
      {videoLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}
      <iframe
        key={currentEmbedUrl}
        src={currentEmbedUrl}
        title={currentLesson?.title || 'Video'}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => setVideoLoading(false)}
      />
    </>
  ) : (
    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
      <Play className="w-16 h-16" />
    </div>
  )}
</div>
```

---

### Resumo Técnico das Mudanças

| Mudança | Motivo |
|---------|--------|
| Adicionar `key={currentEmbedUrl}` | Força re-render do iframe quando URL muda |
| Adicionar `title` | Acessibilidade (obrigatório para iframes) |
| Adicionar `loading="lazy"` | Performance - só carrega quando visível |
| Adicionar `referrerPolicy` | Compatibilidade com políticas de segurança do YouTube |
| Adicionar `onLoad` handler | Detecta quando vídeo terminou de carregar |
| Adicionar indicador de loading | Feedback visual para o usuário |
| Usar `useMemo` para embedUrl | Evita recalcular em cada render |

---

### Resultado Esperado

- Vídeos do YouTube carregam corretamente
- Usuário vê indicador de carregamento enquanto vídeo não está pronto
- Ao mudar de lição, o vídeo anterior é substituído corretamente
- Performance melhorada com lazy loading
- Melhor compatibilidade com navegadores

