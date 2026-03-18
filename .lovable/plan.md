
Objetivo: eliminar a lentidão no celular na troca de imagens do slider e fazer a troca instantânea (sem “buraco” entre uma e outra).

Diagnóstico encontrado no código + profiling:
1) Requisições repetidas sem parar para as imagens da galeria.
- Em `ScrollDrivenGallery.tsx`, o preload roda em `useEffect(..., [items])`.
- Em `PlanosUpscalerArcano.tsx`, o `items={[...]}` é criado inline no JSX.
- A página tem countdown com `setInterval` a cada 1s, então o componente pai re-renderiza a cada segundo, gerando novo array `items` e disparando preload novamente.
- Resultado: tempestade de downloads/decode no mobile (engasgo e atraso na próxima imagem).

2) As imagens atuais da galeria estão em PNG (pesadas para full-screen mobile/tablet).
- Mesmo com preload, arquivos grandes + decode em dispositivos móveis causam atraso perceptível.

3) A seção da galeria ainda está dentro de `LazySection rootMargin="100px"`, ou seja, começa tarde demais para quem chega rápido nela.

Plano de implementação:
1) Parar o preload repetitivo (correção principal)
- Em `PlanosUpscalerArcano.tsx`: criar `galleryItems` com `useMemo` (ou constante fora do componente), em vez de array inline.
- Em `ScrollDrivenGallery.tsx`: mudar preload para depender de uma assinatura estável de URLs (não do objeto/array por referência) e manter `Set` em `useRef` para garantir preload “uma vez por URL”.

2) Deixar preload realmente “one-shot” e previsível
- No `ScrollDrivenGallery`, preload com `new Image()` + `decode()` apenas para URLs ainda não pré-carregadas.
- Remover reexecução desnecessária por re-render de estado não relacionado (contador, animações etc.).

3) Troca instantânea sem tela vazia
- Adicionar controle de readiness por slide (before+after carregadas).
- Ao avançar de índice, só ativar o slide novo quando o par daquele índice estiver pronto; até lá mantém o anterior visível.
- Isso elimina o efeito “handle anda e imagem nova aparece depois”.

4) Reduzir peso das imagens da galeria (mobile-first)
- Converter os 10 PNG da galeria para WebP otimizados (alvo: ~300–700KB por imagem, ajustando qualidade).
- Atualizar imports em `PlanosUpscalerArcano.tsx` para os novos `.webp`.
- (Opcional) adicionar versões mobile menores via `srcSet/sizes` se necessário.

5) Antecipar carregamento da seção
- Aumentar `rootMargin` da `LazySection` da galeria (ex.: 1200px no mobile/tablet) ou remover lazy dessa seção específica para iniciar mais cedo.
- Manter o restante da página lazy para não piorar performance geral.

Arquivos a alterar:
- `src/pages/PlanosUpscalerArcano.tsx`
- `src/components/upscaler/ScrollDrivenGallery.tsx`
- `src/assets/upscaler/*` (substituição para versões WebP otimizadas)

Validação (aceite):
1) No mobile (390x844), rolar pela galeria e confirmar: terminou uma imagem, próxima aparece na hora (sem delay visual).
2) Verificar no network: imagens da galeria não ficam sendo requisitadas continuamente a cada segundo.
3) Confirmar fluidez em tablet (ex.: 768x1024) com o mesmo comportamento.
4) Confirmar que layout continua full-screen e sem labels extras.
