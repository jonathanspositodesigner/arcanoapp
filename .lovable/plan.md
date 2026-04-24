## Plano: Decomissionar Gemini Lite (Veo 3.1 Lite via Google)

Vídeos agora rodam 100% via RunningHub. Gemini Lite está causando jobs travados em "processing" no MovieLed Maker. Remoção completa.

### 1. Limpeza de banco (migration + insert)
- **Insert** (data ops): marcar como `failed` jobs travados:
  - `UPDATE movieled_maker_jobs SET status='failed', error_message='Engine descontinuado' WHERE engine='gemini-lite' AND status IN ('processing','pending','queued')`
  - `UPDATE video_generation_queue SET status='failed', error_message='Engine descontinuado' WHERE provider='gemini' AND status IN ('pending','processing','queued')`
- **Migration** (schema): remover cron `reconcile_stuck_gemini_video_jobs` e droppar a função.

### 2. Frontend — remover engine
- **`src/pages/GerarVideoTool.tsx`**: remover `gemini-lite` da lista de engines, do mapa de durações, do mapa de custos, dos badges. Remover hook `useGeminiVideoQueue` e bloco "GEMINI LITE PATH". Remover `geminiChannelRef`.
- **`src/pages/MovieLedMakerTool.tsx`**: remover engine `gemini-lite`. Default volta a ser `wan2.2`. Remover toda lógica do path Gemini, `geminiChannelRef`, subscriptions e cleanup relacionados.
- **`src/components/admin/AdminAIToolsUsageTab.tsx`**: remover entradas/colunas referentes a `gemini` / `gemini-lite`.

### 3. Deletar código morto
- Deletar `src/hooks/useGeminiVideoQueue.ts`.
- Deletar pasta `supabase/functions/generate-video-gemini/` e remover do deploy via `delete_edge_functions(["generate-video-gemini"])`.
- Remover entrada `[functions.generate-video-gemini]` do `supabase/config.toml` (se existir).

### 4. Verificação
- `tsc` para garantir que não restou referência ao hook/engine.
- `rg "gemini-lite|useGeminiVideoQueue|generate-video-gemini"` para confirmar limpeza.
- Incrementar `APP_BUILD_VERSION` em `Index.tsx` antes de finalizar (regra do projeto).

### 5. Memória
- Atualizar `mem://architecture/ai-tools/gemini-lite-queue-system-v2` marcando como descontinuado (ou remover do index).

Vou executar tudo isso assim que sair do modo plano.