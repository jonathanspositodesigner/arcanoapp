
# Gerar Imagem e Gerar Video - Google Gemini API

## Resumo
Adicionar duas novas ferramentas de IA no menu lateral (dentro de "Ferramentas de IA"):
- **Gerar Imagem** - com escolha entre NanoBanana Normal (40 creditos) e NanoBanana Pro (60 creditos), suportando ate 5 imagens de referencia (image-to-image)
- **Gerar Video** - usando Veo 3.1 Fast (150 creditos), suportando start frame e end frame (image-to-video)

## Modelos Google utilizados
- **NanoBanana Normal**: `gemini-2.5-flash-image` (geracao de imagem mais rapida/barata)
- **NanoBanana Pro**: `gemini-3-pro-image-preview` (geracao de imagem premium)
- **Veo 3.1 Fast**: `veo-3.1-generate-preview` (geracao de video)

## Funcionalidades

### Gerar Imagem
- Campo de prompt de texto
- Seletor de modelo: NanoBanana Normal (40 cr) ou NanoBanana Pro (60 cr)
- Seletor de aspect ratio (1:1, 16:9, 9:16, 4:3, 3:4)
- Botao de attachment para ate 5 imagens de referencia (image-to-image)
- Exibicao da imagem gerada com zoom e download
- Integracao com creditos, modal auth e modal sem creditos

### Gerar Video
- Campo de prompt de texto
- Seletor de aspect ratio (16:9, 9:16)
- Seletor de duracao (5s, 8s)
- Upload de Start Frame (imagem inicial do video)
- Upload de End Frame (imagem final do video) - opcional
- Polling assincrono ate video ficar pronto
- Player de video com download
- 150 creditos por geracao

## Mudancas Tecnicas

### 1. Secret
- Adicionar `GOOGLE_GEMINI_API_KEY` via ferramenta de secrets

### 2. Database (Migrations)

**Tabela `image_generator_jobs`:**
- id (uuid), user_id, prompt, model (text), aspect_ratio, status, output_url, error_message
- reference_images (jsonb - array de URLs), user_credit_cost, credits_charged, credits_refunded
- created_at, completed_at

**Tabela `video_generator_jobs`:**
- id (uuid), user_id, prompt, aspect_ratio, duration_seconds, status, output_url, error_message
- start_frame_url, end_frame_url, operation_name (para polling Google)
- user_credit_cost, credits_charged, credits_refunded
- created_at, started_at, completed_at

**Entradas em `ai_tool_settings`:**
- `gerar_imagem` com credit_cost = 40
- `gerar_imagem_pro` com credit_cost = 60
- `gerar_video` com credit_cost = 150

**RLS policies** para ambas as tabelas (usuario so ve seus proprios jobs)

### 3. Edge Functions

**`generate-image/index.ts`:**
- Recebe: prompt, model (normal/pro), aspect_ratio, reference_images (array base64 opcional)
- Valida autenticacao e consome creditos via RPC
- Chama API Google Gemini com o modelo selecionado
- Envia imagens de referencia como partes inline (image-to-image)
- Retorna imagem gerada (faz upload para Storage, retorna URL)
- Em caso de erro, estorna creditos
- Salva registro na tabela

**`generate-video/index.ts`:**
- Recebe: prompt, aspect_ratio, duration_seconds, start_frame_url, end_frame_url
- Valida autenticacao e consome creditos via RPC
- Chama API Google Veo 3.1 (predictLongRunning)
- Cria job na tabela com operation_name
- Retorna job_id para polling

**`poll-video-status/index.ts`:**
- Recebe: job_id
- Busca operation_name do job
- Checa status na API Google
- Atualiza tabela (completed com URL ou failed com erro)
- Estorna creditos se falhou

### 4. Frontend - Novas Paginas

**`src/pages/GerarImagemTool.tsx`:**
- Layout seguindo o padrao das outras ferramentas (AppLayout, goBack, creditos)
- Toggle NanoBanana Normal / Pro
- Textarea para prompt
- Botao de attachment (ate 5 imagens) com preview em miniatura
- Seletor de aspect ratio
- Botao "Gerar Imagem" com loading
- Area de resultado com zoom (TransformWrapper) e download
- Modal AIToolsAuthModal + NoCreditsModal

**`src/pages/GerarVideoTool.tsx`:**
- Layout padrao
- Textarea para prompt
- Upload de Start Frame e End Frame (cards de upload similares ao Pose Changer)
- Seletor aspect ratio e duracao
- Botao "Gerar Video" com status de processamento
- Polling a cada 10s enquanto processa
- Player de video quando completo
- Download + modais de auth e creditos

### 5. Menu Lateral (AppSidebar.tsx)

Adicionar ao array `aiToolLinks`:
```text
{ name: "Gerar Imagem", path: "/gerar-imagem", badge: "Novo", badgeColor: "bg-green-500" }
{ name: "Gerar Video", path: "/gerar-video", badge: "Novo", badgeColor: "bg-green-500" }
```

### 6. Rotas (App.tsx)
- `/gerar-imagem` -> GerarImagemTool (lazy loaded)
- `/gerar-video` -> GerarVideoTool (lazy loaded)

### 7. Config (supabase/config.toml)
- Adicionar generate-image, generate-video, poll-video-status com verify_jwt = false

## Arquivos

### Novos:
1. `src/pages/GerarImagemTool.tsx`
2. `src/pages/GerarVideoTool.tsx`
3. `supabase/functions/generate-image/index.ts`
4. `supabase/functions/generate-video/index.ts`
5. `supabase/functions/poll-video-status/index.ts`

### Modificados:
1. `src/components/layout/AppSidebar.tsx` - novos links no menu
2. `src/App.tsx` - novas rotas lazy
3. `supabase/config.toml` - novas functions

### Database Migrations:
1. Criar tabelas image_generator_jobs e video_generator_jobs
2. Inserir entradas em ai_tool_settings
3. RLS policies para ambas as tabelas
