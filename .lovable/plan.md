

## Funcionalidade "Refinar" no Gerador de Avatar

### Resumo

Apos o resultado ficar pronto, um novo botao "Refinar" aparece ao lado dos botoes existentes (Nova, Salvar, Baixar HD). Ao clicar, um painel de selecao de numeros (1 a 9) aparece, permitindo escolher quais imagens trocar. O botao "Trocar Imagens" envia um novo job para o WebApp 2021009449481150465 com as 4 fotos originais, o resultado atual e os numeros selecionados como texto.

### Etapas

#### 1. Componente RefineSelector

Novo arquivo: `src/components/character-generator/RefineSelector.tsx`

- Grid de 9 botoes numerados (1 a 9), estilo toggle (selecionado/nao selecionado)
- Texto "Escolha as imagens que quer trocar"
- Campo visual mostrando os numeros selecionados separados por virgula (ex: "1, 3, 5, 9")
- Botao "Trocar Imagens" com icone e custo de 75 creditos
- Botao "Cancelar" para voltar ao estado de resultado
- Props: `onSubmit(selectedNumbers: string)`, `onCancel()`, `creditCost`, `isProcessing`, `disabled`

#### 2. Novo endpoint `/refine` na edge function

Arquivo: `supabase/functions/runninghub-character-generator/index.ts`

Adicionar handler `handleRefine(req)` que:
- Recebe: `jobId`, `frontImageUrl`, `profileImageUrl`, `semiProfileImageUrl`, `lowAngleImageUrl`, `resultImageUrl`, `selectedNumbers` (string tipo "1, 3, 5, 9"), `userId`, `creditCost`
- Faz download e upload das 5 imagens para RunningHub (4 originais + resultado)
- Consome creditos (75)
- Chama o WebApp `2021009449481150465` com:
  - Node 39 = imagem 1 (Frente)
  - Node 40 = imagem 2 (Semi-perfil)
  - Node 41 = imagem 3 (Perfil)
  - Node 42 = imagem 4 (Debaixo p/ Cima)
  - Node 45 = resultado anterior (imagem)
  - Node 47 = texto com numeros selecionados (ex: "1, 3, 5, 9")
- Webhook, fila e fluxo de creditos identicos ao `/run` existente
- Cria novo registro em `character_generator_jobs` para o job de refinamento

Adicionar roteamento no `serve()`:
```
else if (path === 'refine') return await handleRefine(req);
```

#### 3. Integracao no GeradorPersonagemTool.tsx

Mudancas no arquivo `src/pages/GeradorPersonagemTool.tsx`:

**Novos estados:**
- `showRefinePanel` (boolean) -- mostra/esconde o seletor de numeros
- `isRefining` (boolean) -- indica que esta processando refinamento

**Novo botao "Refinar":**
- Aparece na barra de botoes quando `status === 'completed'` (ao lado de Nova, Salvar, Baixar HD)
- Icone de Sparkles ou Wand
- Ao clicar, seta `showRefinePanel = true`

**Fluxo de refinamento:**
1. Usuario clica "Refinar" -> `showRefinePanel = true`
2. RefineSelector aparece sobrepondo ou abaixo do resultado
3. Usuario seleciona numeros (1-9) e clica "Trocar Imagens"
4. `handleRefine()` e chamado:
   - Verifica creditos (75)
   - Verifica job ativo
   - Cria novo job em `character_generator_jobs`
   - Chama edge function `runninghub-character-generator/refine`
   - Envia as 4 URLs das fotos originais (ja armazenadas nos estados `frontImage`, etc.)
   - Envia a URL do resultado atual (`outputImage`)
   - Envia os numeros selecionados como string
5. Processamento segue o mesmo fluxo visual (spinner, progresso, fila)
6. Ao completar, novo resultado substitui o anterior

**Botao "Nova" no refinamento:**
- O `handleNewImage` (ja existente) funciona normalmente para resetar e permitir nova geracao do zero

#### 4. Custo de creditos

O custo do refinamento sera lido da tabela `ai_tool_settings` com nome "Refinar Avatar" (fallback 75). Inserir novo registro na migration.

### Detalhes Tecnicos

**Migration SQL:**
```sql
INSERT INTO ai_tool_settings (tool_name, credit_cost, has_api_cost, api_cost)
VALUES ('Refinar Avatar', 75, true, 0.12)
ON CONFLICT (tool_name) DO NOTHING;
```

**Mapeamento de nodes no WebApp 2021009449481150465:**

| Node ID | Campo | Conteudo |
|---------|-------|----------|
| 39 | image | Foto Frente |
| 40 | image | Foto Semi-perfil |
| 41 | image | Foto Perfil |
| 42 | image | Foto Debaixo p/ Cima |
| 45 | image | Resultado anterior |
| 47 | text | Numeros selecionados (ex: "1, 3, 5, 9") |

**Edge function -- handleRefine (resumo):**
- Validacao de inputs (jobId, 4 URLs + resultUrl + selectedNumbers + userId + creditCost)
- Download e upload das 5 imagens para RunningHub
- Consumo de creditos via RPC `consume_upscaler_credits`
- Criacao de novo registro em `character_generator_jobs` com campo indicando que e refinamento
- Chamada ao WebApp `2021009449481150465` via API v2
- Webhook e fila via queue-manager (mesmo fluxo do `/run`)

**RefineSelector -- comportamento:**
- Numeros 1-9 como botoes toggle em grid 3x3
- Pelo menos 1 numero deve ser selecionado para habilitar o botao "Trocar Imagens"
- Preview dos numeros selecionados: "1, 3, 5, 9"
- Botao desabilitado durante processamento

### Arquivos criados/modificados

| Arquivo | Acao |
|---------|------|
| `src/components/character-generator/RefineSelector.tsx` | Novo componente |
| `supabase/functions/runninghub-character-generator/index.ts` | Novo endpoint `/refine` |
| `src/pages/GeradorPersonagemTool.tsx` | Integrar botao Refinar + painel + handler |
| Migration SQL | Inserir "Refinar Avatar" em `ai_tool_settings` |

