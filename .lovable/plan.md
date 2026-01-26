
Objetivo (sem “moda”, sem função nova, sem debugger)
- Corrigir APENAS os links (URLs) que estão errados na página **/combo-artes-arcanas**, copiando exatamente do site **https://voxvisual.com.br/combo3em1/**, especificamente:
  1) **Seção ARTES DE CAVALGADA** (1 imagem ainda quebrada segundo você)
  2) **Seção MOTIONS FLYERS** (quase todas as miniaturas e vídeos)

O que eu já verifiquei no seu código (estado atual)
- Cavalgada está vindo de: `src/components/combo-artes/FlyersGallerySection.tsx` (array `categories`, bloco “ARTES DE CAVALGADA”).
- Motions está vindo de: `src/components/combo-artes/MotionsGallerySection.tsx` (array `motions` com `thumbnail` e `video`).

Problema claro encontrado (Motions)
- Hoje, no seu `MotionsGallerySection.tsx`, as posições 4–10 estão usando **thumbnails antigos** (`/2024/11/FLYER-EVENTO-....webp`).
- No site, as miniaturas corretas dessas posições são arquivos **MOTION-Flyer-... .webp** em `/2025/11/` (ou seja: os nomes estão diferentes e por isso quebram).

Solução (o que será feito em modo de edição)
A) Corrigir MOTIONS: substituir todas as miniaturas (thumbnails) pelas do site (sem inventar)
1. Editar `src/components/combo-artes/MotionsGallerySection.tsx`.
2. Substituir os thumbnails das posições 4 a 10 para exatamente estes (na ordem):
   - `https://voxvisual.com.br/wp-content/uploads/2025/11/MOTION-Flyer-Sertanejo-Stories-Social-Media.webp`
   - `https://voxvisual.com.br/wp-content/uploads/2025/11/MOTION-Flyer-Forro-Eletronica-Stories-Social-Media.webp`
   - `https://voxvisual.com.br/wp-content/uploads/2025/11/MOTION-Flyer-Funk-Baile-Stories-Social-Media.webp`
   - `https://voxvisual.com.br/wp-content/uploads/2025/11/MOTION-Flyer-Reveillon-Stories-Social-Media.webp`
   - `https://voxvisual.com.br/wp-content/uploads/2025/11/MOTION-Flyer-Sao-Joao-Stories-Social-Media.webp`
   - `https://voxvisual.com.br/wp-content/uploads/2025/11/MOTION-Flyer-Halloween-Stories-Social-Media.webp`
   - `https://voxvisual.com.br/wp-content/uploads/2025/11/MOTION-Flyer-Country-Stories-Social-Media.webp`

B) Corrigir MOTIONS: trocar os vídeos (.mp4) pelos URLs reais do próprio site (sem chute)
Importante: o HTML “estático” do WordPress nem sempre expõe os MP4 diretamente. Então, para continuar seguindo sua regra de “pegar do site”, eu vou usar a própria base do WordPress via endpoint público de mídia (que também é “do site”):
- `https://voxvisual.com.br/wp-json/wp/v2/media?...` filtrando por `media_type=video`

Passos:
1. Identificar no WordPress Media (via `/wp-json/wp/v2/media`) os `source_url` que terminam em `.mp4` e correspondem a cada motion do grid.
2. Atualizar `video:` no array `motions` para cada item com o MP4 exato encontrado.
   - Já temos confirmado (do próprio WordPress media) pelo menos:
     - HallowGrill: `https://voxvisual.com.br/wp-content/uploads/2025/11/MOTION-Flyer-HallowGrill-Stories-Social-Media.mp4`
     - MC Pedrinho: `https://voxvisual.com.br/wp-content/uploads/2025/11/MOTION-ATRACAO-CONFIRMADA-MC-PEDRINHO-1.mp4`
     - Agenda Henrique e Juliano: `https://voxvisual.com.br/wp-content/uploads/2025/11/MOTION-AGENDA-HERIQUE-E-JULIANO-1.mp4` (observação: no WordPress está “HERIQUE” mesmo)
3. Para os demais (Sertanejo/Forró/Funk/Reveillon/São João/Halloween/Country), vou preencher com os MP4 que estiverem cadastrados no media library com `media_type=video`. Se algum não existir lá, eu paro e te trago exatamente quais títulos não retornaram MP4 (porque aí não tem como “copiar do site” um arquivo que não está publicado).

C) Corrigir CAVALGADA: garantir que a imagem quebrada está com o mesmo arquivo do site
1. Revalidar a lista da seção “ARTES DE CAVALGADA” no `src/components/combo-artes/FlyersGallerySection.tsx` contra o site.
2. Substituir somente a(s) URL(s) divergente(s) (se existir divergência).
   - Hoje o bloco está com 8 URLs e inclui `CAVALGADA-DOS-GIGANTES-scaled.webp`. Se a sua “faltando consertar uma URL” for outra, a correção vai ser pontual dentro desse array.

Validação (sem adicionar nada no app)
- Recarregar `/combo-artes-arcanas` e conferir:
  - Cavalgada: 8 imagens carregando
  - Motions: 10 miniaturas carregando e, ao clicar, vídeos abrindo/tocando

Arquivos que serão alterados
- `src/components/combo-artes/MotionsGallerySection.tsx`
  - Atualizar `thumbnail` (posições 4–10) para MOTION-Flyer-*.webp
  - Atualizar `video` (.mp4) para os `source_url` corretos do WordPress
- `src/components/combo-artes/FlyersGallerySection.tsx`
  - Ajuste pontual no array de “ARTES DE CAVALGADA” caso alguma URL esteja diferente do site

Limite assumido (para evitar “chute”)
- Eu não vou “deduzir” nomes de MP4. Se o MP4 não estiver publicado no media library do WordPress (endpoint `/wp-json/wp/v2/media`), eu vou te mostrar exatamente qual item não retornou e aí você me diz o arquivo correto (ou confirma que o WordPress não tem esse MP4 mesmo).
