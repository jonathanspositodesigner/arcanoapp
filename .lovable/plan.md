
Contexto e diagnóstico (com base no seu print + leitura do HTML do WordPress que você enviou + leitura dos componentes atuais):
- Não, não é “ok” ter imagem quebrada. Se aparece o ícone de imagem quebrada, significa que o navegador tentou buscar a URL e recebeu erro (normalmente 404), então a página NÃO está idêntica.
- O problema principal não é “faltar seção” agora; é que várias seções estão com URLs erradas (nomes diferentes do WordPress, falta de sufixo -768x1365, pastas /2025/12 vs /2025/11, etc.), então “parece que falta tudo” porque o visual fica cheio de placeholders.
- Eu não consigo “ver sua tela ao vivo”, mas consigo garantir 1:1 de forma objetiva fazendo duas coisas:
  1) usar o HTML original como “fonte da verdade” e copiar as URLs exatamente como estão lá
  2) implementar um verificador dentro da página que conte e liste qualquer imagem/vídeo que falhar (para só dizer “pronto” quando der 0 erros)

O que já está comprovadamente divergente hoje (por evidência do HTML):
1) Flyers – várias categorias estão com listas diferentes do HTML (ex: Pagode no HTML tem itens com “-768x1365” e nomes diferentes; Sertanejo no HTML é outro conjunto; Funk/Cavalgada/Variadas também têm diferenças).
2) Bônus Fim de Ano – no HTML as imagens estão em /2025/12 e com nomes diferentes; no código está apontando /2025/11 com nomes “inventados” → isso quebra.
3) Selos 3D – no HTML muitos selos estão em /2024/12 (selo-3d-1..20) e os últimos aparecem como arquivos “21-1.webp … 26-1.webp” em /2025/11; no código está tudo “selo-3d-X.webp” em /2025/11 → tende a quebrar.
4) Garantia – no HTML a garantia usa imagens específicas (ex: ICONES-GARANTIA.png e 7-DIAS-DE-GARANTIA-IC-1.png). No código está “selo-garantia-7-dias.webp” → não bate com o original.
5) Motions – os MP4 corretos do WordPress são “MOTION-Flyer-…Social-Media.mp4” em vários casos (não os nomes curtos). Isso precisa ficar exatamente como no HTML.

Objetivo desta correção:
- Zerar imagens quebradas e zerar vídeos quebrados
- Garantir que as listas (quantidade + ordem) sejam exatamente as do HTML original
- Só considerar “pronto” quando o auditor indicar 0 falhas em desktop e mobile

Plano de implementação (na próxima etapa, em modo de edição):

A) Criar um “Auditor de Mídia” dentro da própria página (para garantir sem achismo)
1. Adicionar um modo de auditoria ativado por query string, ex: /combo-artes-arcanas?audit=1
2. Implementar um pequeno “registro” global na página (em React) que:
   - para cada <img>, registra onLoad/onError (URL, seção, índice)
   - para cada vídeo (thumbnails e mp4), registra se o thumbnail carregou e faz uma checagem simples do MP4 (ex: tentar carregar metadados ou fetch HEAD quando permitido)
3. Mostrar um painel flutuante (somente quando audit=1) com:
   - Total esperado vs total carregado
   - Lista de URLs que falharam (com o nome da seção e o índice)
4. Critério para “pronto”: painel mostrando 0 falhas.

B) Corrigir as fontes (arrays) para bater 100% com o HTML original (zero “URL inventada”)
1. FlyersGallerySection.tsx
   - Substituir TODAS as listas de imagens por listas extraídas do HTML (exatamente como estão, com sufixos -768x1365 quando existirem).
   - Ajustar as categorias para terem a mesma ordem do WordPress.
   - Conferir contagem por categoria e bater com o HTML.
2. BonusFimDeAnoSection.tsx
   - Trocar o array inteiro para as 14 URLs corretas do HTML em /2025/12:
     - PROXIMOS-SHOWS-ST.webp
     - REVEILLON-NA-PRAIA-2025-ST.webp
     - HOJE-REVEILLON-ST-768x1365.webp
     - FESTA-DE-REVEILLON-ST-768x1365.webp
     - REVEILLON-PREMIUM-ST-768x1365.webp
     - ANO-NOVO-CELEBRATION-ST-768x1365.webp
     - NATAL-LUXUOSO-ST-768x1365.webp
     - NATAL-EM-FAMILIA-ST-768x1365.webp
     - BOAS-FESTAS-ST-768x1365.webp
     - NOITE-FELIZ-ST-768x1365.webp
     - PAPAI-NOEL-ST-768x1365.webp
     - FELIZ-NATAL-ST-768x1365.webp
     - FELIZ-ANO-NOVO-ST-768x1365.webp
     - REVEILLON-DOS-SONHOS-ST-768x1365.webp
3. Selos3DSection.tsx
   - Trocar o array para a lista exata do HTML:
     - /2024/12/selo-3d-1.webp ... /2024/12/selo-3d-20.webp
     - /2025/11/21-1.webp ... /2025/11/26-1.webp
   - (Sem adivinhar “selo-3d-21.webp” etc.)
4. GuaranteeSectionCombo.tsx
   - Trocar as imagens para as corretas do HTML:
     - https://voxvisual.com.br/wp-content/uploads/2024/11/ICONES-GARANTIA.png
     - https://voxvisual.com.br/wp-content/uploads/2024/11/7-DIAS-DE-GARANTIA-IC-1.png
   - Ajustar layout para ficar igual ao WordPress (se tiver faixa/strip + badge).
5. MotionsGallerySection.tsx
   - Corrigir os 10 itens para usar exatamente os MP4 do WordPress:
     - MOTION-Flyer-Sertanejo-Stories-Social-Media.mp4
     - MOTION-Flyer-Forro-Eletronica-Stories-Social-Media.mp4
     - MOTION-Flyer-Funk-Baile-Stories-Social-Media.mp4
     - MOTION-Flyer-Reveillon-Stories-Social-Media.mp4
     - MOTION-Flyer-Sao-Joao-Stories-Social-Media.mp4
     - MOTION-Flyer-Halloween-Stories-Social-Media.mp4
     - MOTION-Flyer-Country-Stories-Social-Media.mp4
     - (e os 3 que já estão corretos)
   - Corrigir o texto do CTA desse bloco para exatamente: “QUERO ESSAS ARTES AGORA!”
   - Manter os badges de compra segura como no original.
6. HeroSectionCombo.tsx (ajuste de fidelidade)
   - Conferir no HTML o texto exato do botão do Hero; hoje está “QUERO APROVEITAR A OFERTA!” e pode ser diferente do WordPress.

C) Validação final (objetiva, sem “achar que está pronto”)
1. Abrir /combo-artes-arcanas?audit=1 no modo Desktop e rolar toda a página:
   - Auditor precisa mostrar 0 falhas.
2. Abrir /combo-artes-arcanas?audit=1 no modo Mobile e rolar toda a página:
   - Auditor precisa mostrar 0 falhas.
3. Só depois disso eu confirmo “pronto”.

Entrega esperada após aplicar o plano:
- Nenhuma imagem quebrada em nenhuma categoria (incluindo as que aparecem quebradas no seu print: Forró/Sertanejo/Funk).
- Nenhum vídeo quebrado.
- Mesma quantidade e ordem de itens que o WordPress original em todas as seções.
