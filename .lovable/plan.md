

## Plano: Liberar Upscaler App para todos + Remover créditos vitalícios da usuária

### Contexto
O Upscaler versão aplicativo (a ferramenta que processa imagens) está restrito por `hasAccessToPack('upscaller-arcano')` na lista de ferramentas e nas páginas de versões/aulas. Mas o Cloner, Veste AI, Pose Changer etc. são livres para todos. O objetivo é igualar — todos podem usar o Upscaler app, e as versões vitalícias com vídeo-aulas continuam restritas por pack.

### Alterações

**1. `src/pages/FerramentasIAAplicativo.tsx`**
- Na função `checkToolAccess`, adicionar `if (slug === "upscaller-arcano") return true;` — igual ao cloner, flyer-maker e remover-fundo
- Remover a lógica do modal de escolha de versão que depende de `hasUpscalerPack` — ao clicar no Upscaler, ir direto para a rota de acesso (`/ferramenta-ia-artes/upscaller-arcano` ou `/upscaler-arcano-tool`)
- O botão sempre aparece verde "Acessar" para o Upscaler, sem verificação de pack

**2. `src/pages/UpscalerArcanoVersionSelect.tsx`**
- Remover o gate `if (!hasAccess)` que bloqueia a página inteira — todos podem ver as versões
- Manter a distinção entre V2/V3 com pack (aulas vitalícias) vs sem pack (apenas app)
- Cards de versões vitalícias (V1, V2, V3 com aulas) continuam restritos por pack — quem não tem pack vê "Comprar" ou "Em Breve"
- O botão "Usar Aplicativo" (que leva ao `/upscaler-arcano-tool`) fica disponível para todos

**3. Dados da usuária gs.arq@hotmail.com.br**
- Remover 1.500 créditos vitalícios (lifetime_balance: 1500 → 0)
- Ajustar balance total de 5.700 → 4.200
- Registrar transação no log

### Arquivos alterados
- `src/pages/FerramentasIAAplicativo.tsx`
- `src/pages/UpscalerArcanoVersionSelect.tsx`
- Inserção de dados: update credits + transaction log

