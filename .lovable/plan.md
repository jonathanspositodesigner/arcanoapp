

## Diagnóstico

O card da V3 está **hardcoded** no código (linhas 283-372 do `UpscalerArcanoVersionSelect.tsx`) com um placeholder genérico (ícone Sparkles + texto), em vez de usar os dados que você configurou no admin (capa, badges, nome, etc.) que estão salvos no `tool_versions` do banco.

Os dados da V3 já existem no banco com `slug: v3`, `name: v3.0`, cover_url, badges (NOVO, EDITA EM LOTE, +RÁPIDO, + FIEL), e aulas configuradas.

## Plano

### 1. Alterar a busca de versões para incluir V3
- Atualmente o código filtra `is_visible` e só pega versões do pack `upscaller-arcano`
- Mudar para buscar **todas** as versões (incluindo V3 mesmo se `is_visible: false`) e tratar a visibilidade no render

### 2. Substituir o card V3 hardcoded pela renderização dinâmica
- Remover o bloco hardcoded do V3 (linhas 283-372)
- No loop de versões, identificar V3 pelo `slug === 'v3'`
- Se for V3:
  - Usar `cover_url`, `badges`, `name` do banco (o que você configurou no admin)
  - Se **não tem** pack `upscaller-arcano-v3`: card em grayscale, badge "Em Breve", botão **desativado** (disabled)
  - Se **tem** pack: card colorido normal, botão "Acessar V3" que leva ao `/upscaler-selection`

### 3. Botão desativado para V3 sem acesso
- Botão com `disabled={true}`, visual cinza, texto "Em Breve"
- Sem link para compra por enquanto (você vai definir depois)

## Arquivo a alterar
- `src/pages/UpscalerArcanoVersionSelect.tsx`

