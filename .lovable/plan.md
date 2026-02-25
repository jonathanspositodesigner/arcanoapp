

# Slider Antes/Depois no Modal de Resultado dos Jobs

## Resumo
Ao clicar em um job no dashboard de Custos IA, o modal vai mostrar um slider de antes/depois usando o componente `BeforeAfterSlider` ja existente, com botao de zoom (que abre o `FullscreenModal`). A imagem "antes" e a imagem que o usuario fez upload, e a "depois" e o resultado gerado. Ambas expiram em 24h -- se qualquer uma falhar ao carregar, mostra mensagem "Expirado".

## Mapeamento de campos por ferramenta

```text
Ferramenta            | Campo "Antes" (input)       | Campo "Depois" (output)
---------------------|-----------------------------|------------------------
Upscaler Arcano      | input_url                   | output_url
Arcano Cloner        | user_image_url              | output_url
Pose Changer         | person_image_url            | output_url
Veste AI             | person_image_url            | output_url
Gerador Avatar       | front_image_url             | output_url
Flyer Maker          | reference_image_url         | output_url
Video Upscaler       | (video - sem slider)        | output_url
Gerar Imagem         | (sem input - texto)         | output_url
Gerar Video          | start_frame_url             | output_url (video)
```

## O que sera feito

### 1. Alterar o fetch no `handleJobClick`
- Em vez de buscar apenas `output_url`, buscar tambem o campo de input correspondente ao tipo da ferramenta
- Novo estado: `jobInputUrl` para armazenar a URL da imagem original
- Funcao helper `getInputColumn(toolName)` que retorna o nome do campo de input

### 2. Logica de exibicao no modal

**Caso 1 - Tem antes E depois (maioria das ferramentas):**
- Mostrar o `BeforeAfterSlider` com as duas imagens
- Botao de zoom que abre o `FullscreenModal` em tela cheia

**Caso 2 - So tem depois (Gerar Imagem, ou input nao disponivel):**
- Mostrar apenas a imagem resultado como esta hoje

**Caso 3 - Video (Video Upscaler, Gerar Video):**
- Manter o player de video como esta hoje (sem slider)

**Caso 4 - Expirado:**
- Se qualquer imagem falhar ao carregar (onError), mostrar mensagem "Resultado expirado (mais de 24h)"

### 3. Integrar componentes existentes
- Importar `BeforeAfterSlider` de `@/components/upscaler/BeforeAfterSlider`
- Importar `FullscreenModal` de `@/components/upscaler/FullscreenModal`
- Novo estado `showFullscreen` para controlar o modal de zoom
- O `BeforeAfterSlider` ja tem prop `onZoomClick` que sera conectado ao fullscreen

### 4. Deteccao de expiracao
- Antes de mostrar o slider, tentar carregar ambas as URLs via `new Image()` com Promise
- Se qualquer uma falhar, marcar como expirado
- Isso evita o slider aparecer quebrado

### Detalhes tecnicos

**Arquivo modificado:** `src/components/admin/AdminAIToolsUsageTab.tsx`

**Novos estados:**
- `jobInputUrl: string | null`
- `showFullscreen: boolean`

**Fetch atualizado:**
```text
select('output_url, <input_column>')  -- campo dinamico por ferramenta
```

**Nenhuma migracao SQL necessaria** -- as policies de admin SELECT ja foram criadas na migracao anterior para todas as tabelas de jobs.
