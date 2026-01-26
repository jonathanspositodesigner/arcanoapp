
Contexto (o que o seu print prova)
- Não está “correto” e não está “pronto”: no seu print todas as miniaturas dos carrosséis estão falhando (ícone de imagem quebrada).
- O código atual está renderizando <img src="https://voxvisual.com.br/wp-content/uploads/..."> diretamente. Se o servidor do WordPress:
  1) estiver com hotlink protection (bloqueio por Referer/origin), ou
  2) os arquivos tiverem sido renomeados/removidos (404),
  então vai quebrar exatamente como no seu print.
- Eu já consegui evidência objetiva de pelo menos um caso de 404 real em um flyer específico, então “URL certa no código” ainda não garante que o arquivo exista de verdade no servidor.

Problema real (definição precisa)
- O app depende de mídia externa (voxvisual.com.br). Hoje, parte significativa desses arquivos não carrega no contexto do seu domínio (arcanoapp/lovable), seja por bloqueio/hotlink ou por inexistência/404.
- Enquanto a mídia estiver sendo buscada diretamente do WordPress, você vai continuar vendo “tudo quebrado” mesmo com layout/sections corretos.

Solução (para garantir que “sempre vai aparecer”)
Vou implementar duas coisas complementares:

A) “Proxy de Mídia” pelo backend (para acabar com hotlink e estabilizar o carregamento)
- Criar uma função de backend (exposta como endpoint) do tipo /media-proxy?url=ENCODED_URL que:
  - Só permite proxy de URLs em allowlist (ex: voxvisual.com.br/wp-content/uploads/…).
  - Faz fetch do arquivo no servidor e devolve a resposta para o navegador.
  - Repassa Content-Type, e suporta Range header (crítico para MP4 tocar sem travar).
  - Define Cache-Control adequado para reduzir custo/latência.
  - Opcional: seta headers como Referer: https://voxvisual.com.br/ (quando necessário) para contornar hotlink por referer.
Resultado: as imagens e vídeos deixam de depender das regras de embed do WordPress e passam a carregar como se fossem do “seu” domínio.

B) Auditor “zero erros” dentro da própria página (pra eu só dizer “pronto” quando estiver realmente pronto)
- Implementar modo de auditoria via query param /combo-artes-arcanas?audit=1 (no seu navegador real; a ferramenta de screenshot do sandbox pode não respeitar query).
- O auditor:
  - Registra cada mídia esperada (todas as URLs das arrays de Flyers/Bônus/Selos/Motions).
  - Marca success/fail por onLoad/onError (imagens) e eventos de carregamento (vídeos).
  - Mostra um painel flutuante com:
    - total esperado
    - total carregado
    - lista dos que falharam (com a seção e a URL)
- Critério de “pronto”: auditor com 0 falhas em desktop e mobile depois de rolar a página inteira.

Mudanças previstas (arquivos e pontos exatos)
1) Backend
- Criar função de backend: media-proxy
  - Validação de URL (host e path)
  - Suporte a Range para MP4
  - Forward de headers essenciais
  - Cache-Control

2) Frontend (Combo Artes Arcanas)
- Criar helper utilitário (ex: src/lib/mediaProxy.ts):
  - export function proxiedMediaUrl(url: string): string
  - Se url for voxvisual.com.br/wp-content/uploads → retorna endpoint do proxy
  - Caso contrário → retorna a url original
- Atualizar todos os componentes do combo para usar proxiedMediaUrl():
  - src/components/combo-artes/FlyersGallerySection.tsx (todas as imagens)
  - src/components/combo-artes/BonusFimDeAnoSection.tsx
  - src/components/combo-artes/Selos3DSection.tsx
  - src/components/combo-artes/MotionsGallerySection.tsx (thumbnails + mp4 + badges)
  - src/components/combo-artes/HeroSectionCombo.tsx / AreaMembrosSection.tsx (se também estiverem falhando)
- (Bônus de compatibilidade) adicionar referrerPolicy="no-referrer" nos <img> externos (mesmo com proxy, isso ajuda se algum ainda ficar direto).

3) Auditor UI
- Implementar um MediaAuditPanel (somente quando audit=1) dentro de:
  - src/pages/ComboArtesArcanas.tsx
- Ele vai consumir as arrays de URLs dos componentes (ou centralizar todas as URLs em um “manifest” único para garantir 1:1 e auditor simples).

Validação (o que eu vou checar antes de falar “pronto”)
1) Abrir /combo-artes-arcanas?audit=1 em Desktop:
- Rolar até o final
- Auditor deve ficar com 0 falhas

2) Abrir /combo-artes-arcanas?audit=1 em Mobile:
- Rolar até o final
- Auditor deve ficar com 0 falhas

3) Se ainda existirem falhas
- A lista do auditor vai mostrar exatamente quais URLs retornam erro.
- A partir daí existem apenas dois casos:
  - Bloqueio/hotlink: proxy resolve (deve zerar)
  - Arquivo realmente não existe no servidor (404): aí vou precisar que você me mande a URL correta (ou o arquivo) para substituir, porque não tem como “inventar” um arquivo que foi removido do WordPress.

Riscos/Trade-offs (importante você saber)
- Proxy de mídia aumenta tráfego no seu backend (mas com cache forte fica estável e econômico).
- Alternativa “mais definitiva” (se você preferir depois): baixar e hospedar tudo no seu próprio armazenamento (mais trabalho, porém zero dependência do WordPress).

Resultado esperado
- Os carrosséis deixam de mostrar imagem quebrada (porque o carregamento não depende mais do embed direto no voxvisual.com.br).
- Você ganha um auditor objetivo: 0 erros = página realmente pronta (desktop + mobile).
