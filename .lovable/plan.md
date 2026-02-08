
Objetivo (o que você está pedindo)
- Você quer que o bloco de instruções dentro dos cards (“Arraste ou clique / Ctrl+V…” e “Escolher da biblioteca / Ou envie…”) fique exatamente no MEIO da área clicável (o quadrado/retângulo do upload), e não “caído” mais pra baixo.

O que eu vi no código atual (por que pode estar acontecendo)
- Hoje os dois cards usam um container com `h-32` e tentam centralizar com `flex items-center justify-center`.
- Isso deveria centralizar, mas na prática pode ficar visualmente “mais embaixo” por causa da forma como o conteúdo interno está ocupando espaço (padding, line-height, e o fato de o bloco estar no fluxo normal). Em alguns tamanhos de tela isso dá a sensação de estar “colado embaixo”, mesmo com flex.
- A correção mais “à prova de bala” é tirar o bloco informativo do fluxo normal e centralizar ele por overlay (`absolute inset-0`), garantindo centro matemático em qualquer viewport.

Mudanças que vou fazer (implementação)
1) Garantir centralização real no ImageUploadCard (“Sua Foto”)
   - Arquivo: `src/components/pose-changer/ImageUploadCard.tsx`
   - No estado SEM imagem (`!image`):
     - Renderizar o bloco de instruções dentro de um wrapper:
       - `absolute inset-0 grid place-items-center`
       - `pointer-events-none` (para não atrapalhar click/drag/drop no container)
     - Manter o container principal com `relative h-32 ...` e os handlers de `onDrop/onDragOver/onClick` exatamente no container principal.
   - Resultado: o bloco de instruções fica centrado perfeito no retângulo clicável.

2) Garantir centralização real no ReferenceImageCard (“Foto de Referência”)
   - Arquivo: `src/components/arcano-cloner/ReferenceImageCard.tsx`
   - Mesma estratégia do item (1):
     - Estado SEM imagem: bloco de “Escolher da biblioteca…” vira overlay absoluto centralizado (grid + place-items-center) com `pointer-events-none`.
     - Container continua com o `onClick` para abrir a biblioteca.
   - Resultado: texto/ícone ficam no meio exato, independente de header e de qualquer variação de altura.

3) Checagens para não quebrar interação
   - Confirmar que:
     - Clique em qualquer lugar do retângulo abre seletor (no “Sua Foto”) e abre modal (na “Referência”).
     - Drag & drop continua funcionando (o overlay não pode capturar eventos; por isso `pointer-events-none`).
     - “X” (remover) continua clicável quando houver imagem (esse botão é `absolute` e não deve herdar `pointer-events-none`).

4) Prova visual (o “print” que você pediu)
   - Depois de aplicar as mudanças, eu vou:
     - Abrir `/arcano-cloner-tool` com os cards vazios
     - Tirar screenshot em desktop
     - Tirar screenshot em mobile
   - Só vou considerar “feito” quando o print mostrar os dois blocos realmente no meio do retângulo.

Arquivos que serão alterados
- `src/components/pose-changer/ImageUploadCard.tsx`
- `src/components/arcano-cloner/ReferenceImageCard.tsx`

Risco/observações
- Se o overlay não estiver com `pointer-events-none`, ele pode atrapalhar drop/click. Por isso essa parte é obrigatória na implementação.
- Essa mudança também melhora automaticamente Pose Changer e Veste AI (porque eles usam o mesmo `ImageUploadCard`).
