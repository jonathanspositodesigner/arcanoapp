
## Substituir "DEBUG IA" por "API GOOGLE" no admin do PromptClub

### O que muda

O item "DEBUG IA" no menu lateral do admin PromptClub sera substituido por "API GOOGLE". A rota `/admin-prompts/debug-ia` sera substituida por `/admin-prompts/api-google`. A pagina de Debug IA sera removida e no lugar sera criada uma pagina de gerenciamento da API Google.

### Nova pagina: API Google

A pagina tera:

1. **Barra de gasto** - Mostra quanto ja foi gasto dos R$ 1.900,00 de creditos Google, com barra de progresso e porcentagem. O calculo e baseado nos jobs concluidos nas tabelas `image_generator_jobs` e `video_generator_jobs`:
   - Nano Banana (model=normal): R$ 0,20 por imagem
   - Nano Banana Pro (model=pro): R$ 0,69 por imagem
   - Veo 3.1 Fast: R$ 0,78 x duracao_segundos por video

2. **Campo para trocar a chave API** - Input para inserir nova chave Google Gemini, com botao de salvar que atualiza o secret `GOOGLE_GEMINI_API_KEY` via edge function dedicada

3. **Resumo de uso** - Cards mostrando quantidade de geracoes por tipo e custo total

### Passos tecnicos

#### 1. Criar tabela `google_api_config` (migration)
- `id`, `total_budget` (default 1900.00), `updated_at`
- Armazena o budget total configuravel (R$ 1.900)

#### 2. Criar edge function `admin-update-google-key`
- Recebe a nova chave API
- Verifica se o usuario e admin
- Atualiza o secret `GOOGLE_GEMINI_API_KEY` via Supabase Management API (usando SUPABASE_ACCESS_TOKEN e VITE_SUPABASE_PROJECT_ID)

#### 3. Criar pagina `src/pages/admin/PromptsApiGoogle.tsx`
- Card com barra de progresso do budget (R$ 1.900)
- Calcula gasto total via query nas tabelas de jobs completados
- Input mascarado para trocar a chave API
- Cards resumo: total imagens (normal/pro), total videos, custo por tipo

#### 4. Atualizar `AdminSidebarPlatform.tsx`
- Trocar "DEBUG IA" por "API GOOGLE"
- Trocar icone `Bug` por icone adequado (ex: `Key` ou `Cloud`)
- Trocar path de `debug-ia` para `api-google`

#### 5. Atualizar `App.tsx`
- Remover import/rota do `PromptsDebugIA`
- Adicionar import/rota do `PromptsApiGoogle` em `/admin-prompts/api-google`
- Manter redirect de `/admin-prompts/debug-ia` para `/admin-prompts/api-google` (evitar links quebrados)

### O que NAO muda

- Nenhuma edge function de geracao (generate-image, generate-video) sera alterada
- Nenhuma outra pagina admin sera alterada
- O contexto AIDebugContext continua existindo (pode ser usado por quem quiser, so perde a pagina de admin)
- Todas as outras ferramentas continuam identicas
