
# Mostrar imagem/video resultado ao clicar no job no dashboard de Custos IA

## Resumo
Ao clicar em uma linha da tabela de jobs no dashboard de Custos IA, abrir um modal mostrando a imagem/video resultado daquele job. As URLs dos resultados ficam armazenadas nas tabelas de jobs (`output_url`) e expiram em 24h no servidor externo. Se a imagem estiver expirada, mostrar mensagem "Expirado".

## O que sera feito

### 1. Modificar `AdminAIToolsUsageTab.tsx`

**Novo estado:**
- `selectedJob`: o job clicado (com `id`, `tool_name`, `status`)
- `jobOutputUrl`: a URL do resultado carregada do banco
- `isLoadingOutput`: loading state
- `outputError`: se deu erro ao carregar
- `isOutputExpired`: se a imagem retornou erro 404/403 (expirada)

**Linha da tabela clicavel:**
- Adicionar `cursor-pointer` e `onClick` em cada `TableRow`
- Ao clicar, buscar o `output_url` diretamente na tabela especifica do job (ex: `upscaler_jobs`, `pose_changer_jobs`, etc.) usando o `id` e o mapeamento `getTableName(tool_name)`
- So buscar se o status for `completed` -- jobs que falharam/estao na fila nao tem resultado

**Modal de resultado:**
- Dialog/modal simples com:
  - Header: nome da ferramenta + email do usuario + data
  - Se `status != completed`: mostrar "Este job nao gerou resultado"
  - Se `output_url` esta null: mostrar "Resultado nao disponivel"
  - Se a URL retornar erro ao carregar a imagem (onError): mostrar "Resultado expirado (mais de 24h)"
  - Se carregar com sucesso: mostrar a imagem/video
  - Para ferramentas de video (`Video Upscaler`, `Gerar Video`): renderizar `<video>` ao inves de `<img>`
  - Botao para abrir a URL em nova aba (se nao expirada)

**Fetch da output_url:**
- Query direta na tabela do job: `supabase.from(tableName).select('output_url').eq('id', jobId).single()`
- Isso funciona porque o admin ja tem RLS policies de SELECT nessas tabelas (via `has_role(auth.uid(), 'admin')`)

### 2. Nenhuma migracao SQL necessaria
- As tabelas de jobs ja tem `output_url`
- O admin ja tem policies de SELECT nas tabelas de jobs
- Nenhuma RPC precisa ser alterada

### 3. Deteccao de expiracao
- A imagem e carregada no `<img>` tag com `onError` handler
- Se der erro (404/403 do CDN externo apos 24h), mostrar badge "Expirado" com icone
- Se carregar com sucesso (`onLoad`), mostrar a imagem normalmente

### Detalhes tecnicos
- Apenas o arquivo `src/components/admin/AdminAIToolsUsageTab.tsx` sera modificado
- Usaremos o componente `Dialog` do shadcn/ui ja disponivel no projeto
- A busca do `output_url` e feita sob demanda (ao clicar) para nao sobrecarregar a query principal
- Nenhum custo adicional de edge functions -- e uma query direta ao banco
