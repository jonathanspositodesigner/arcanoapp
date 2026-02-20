

## Botao "Refinar" no Arcano Cloner (30 creditos)

### Resumo
Adicionar um botao "Refinar" ao lado de "Nova" e "Baixar HD" que permite ao usuario modificar o resultado gerado usando a API do Google Gemini (edge function `generate-image` que ja existe). O custo sera fixo em 30 creditos para todos os usuarios.

### Funcionalidades
1. Botao "Refinar" aparece ao lado de "Nova" e "Baixar HD" quando o resultado esta pronto
2. Ao clicar, os inputs do lado esquerdo mudam para mostrar:
   - Campo de upload de imagem (opcional) - para enviar referencia extra
   - Campo de prompt (textarea) com placeholder "Escreva aqui o que vc quer modificar na imagem"
   - Botao "Enviar Refinamento" (30 creditos) e botao "Cancelar" para voltar ao modo normal
3. Ao submeter, o sistema:
   - Busca a imagem atual do resultado como base64
   - Envia para a edge function `generate-image` com o prompt do usuario + imagem atual como referencia + imagem extra (se tiver)
   - Mostra loading no visor enquanto processa
4. Novo resultado substitui o anterior no visor
5. Linha do tempo horizontal embaixo do visor com thumbnails de cada versao (Original, Refinamento 1, 2, etc.)
6. Clicar em qualquer thumbnail mostra aquela versao no visor e o "Baixar HD" baixa a selecionada
7. Todos os refinamentos ficam salvos automaticamente em "Minhas Criacoes" (a edge function `generate-image` ja salva na tabela `image_generator_jobs`)

### Detalhes Tecnicos

**Arquivo principal:** `src/pages/ArcanoClonerTool.tsx`

Novos estados:
- `refineMode` (boolean) - controla se o painel de refinamento esta ativo
- `refinePrompt` (string) - texto do prompt de refinamento
- `refineReferenceFile` (File | null) - imagem extra opcional
- `refineReferencePreview` (string | null) - preview da imagem extra
- `isRefining` (boolean) - loading do refinamento
- `refinementHistory` (array de `{ url: string, label: string }`) - timeline de versoes
- `selectedHistoryIndex` (number) - qual versao esta selecionada no visor

Logica `handleRefine`:
1. Verifica creditos (30)
2. Busca imagem atual como base64 (fetch + canvas)
3. Se tiver imagem extra, converte para base64 tambem
4. Chama `supabase.functions.invoke('generate-image')` com:
   - `prompt`: texto do usuario
   - `model`: "pro" (usa Gemini Pro para melhor qualidade de refinamento)
   - `aspect_ratio`: mesmo do resultado atual
   - `reference_images`: array com a imagem atual + imagem extra (se tiver)
5. Ao receber resposta com sucesso:
   - Adiciona `output_url` ao `refinementHistory`
   - Atualiza `outputImage` para o novo resultado
   - Sai do `refineMode`
   - Atualiza creditos

**Novo componente:** `src/components/arcano-cloner/RefinePanel.tsx`
- Textarea para o prompt
- Upload de imagem opcional
- Botao "Refinar" com custo (30 creditos)
- Botao "Cancelar"

**Novo componente:** `src/components/arcano-cloner/RefinementTimeline.tsx`
- Lista horizontal scrollavel de thumbnails
- Thumbnail selecionado tem borda destacada (fuchsia)
- Labels: "Original", "Refinamento 1", "Refinamento 2"...
- Ao clicar, atualiza o visor e o botao de download

**Custo:** 30 creditos fixo para todos (hardcoded por enquanto, sem entrada em `ai_tool_settings`)

**Salvamento:** Automatico via edge function `generate-image` que ja cria registro em `image_generator_jobs` com `output_url`, e a RPC `get_user_ai_creations` ja lista esses registros em "Minhas Criacoes"

