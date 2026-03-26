

# Redesign do Layout do Upscaler Arcano Tool

## O que muda

### 1. Painel esquerdo — Controles
- **Modo**: Renomear "Standard" → "V3 Turbo" e "PRO" → "V3 Pro" (mantendo os mesmos valores internos `standard`/`pro`)
- **Upload**: Área maior e mais escura como na imagem, com ícone de upload centralizado e texto "Arraste sua imagem aqui" + "PNG, JPEG, WEBP - Máximo 10MB"
- **Tipo de Imagem**: Trocar os toggle buttons por um `<Select>` dropdown, mantendo as mesmas opções (Pessoas, Comida/Objeto, Foto Antiga, Selo 3D, Logo/Arte)
- **Tamanho**: Toggle 2K / 4K (já existe, manter)
- **Detalhar Rosto**: Switch visível **apenas no modo V3 Pro**. Quando ativado, exibe o slider "Nível de detalhes". Quando desativado, oculta o slider. No modo V3 Turbo, este switch não aparece.
- **Botão "Gerar Upscaling"**: Gradiente azul→roxo como na imagem

### 2. Painel direito — Visualizador
- **Estado vazio (sem imagem carregada)**: Em vez do ícone de upload genérico, exibir uma **imagem de exemplo** com o slider antes/depois já funcional, para demonstrar o resultado da ferramenta
- A imagem de exemplo será embutida como asset estático (uma foto split antes/depois)
- Quando o usuário carregar uma foto, o comportamento atual é mantido

### 3. Cores e estilo
- Manter o esquema escuro atual (`#1A0A2E`), alinhado com a imagem de referência
- Cards com `border-white/20` em vez de `border-purple-500/20` para bordas mais visíveis como na imagem

## Arquivo editado
- `src/pages/UpscalerArcanoTool.tsx` — seção de controles (linhas ~750-1250) e estado vazio do visualizador (linhas ~1508-1514)

## O que NÃO muda
- Toda a lógica de processamento, webhooks, jobs, créditos
- Os prompts por categoria
- A lógica de framing (De Perto / De Longe) dentro da categoria Pessoas
- Os sliders específicos por tipo (Comida, Logo, Selo 3D, Editing Level)
- O comportamento pós-processamento (slider antes/depois com zoom)

