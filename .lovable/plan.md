
Objetivo: corrigir o checkout normal (sem mexer no fluxo de 1 clique), garantir que o botão da seção “Melhorado com Upscaler Arcano” gere o checkout vitalício sem erro, e acelerar a abertura dos checkouts em geral.

1) Diagnóstico já confirmado
- O erro de “circular JSON” vem do botão da galeria em `PlanosUpscalerArcano.tsx`:
  - Hoje está `CTAButton onClick={handlePurchase}`.
  - `handlePurchase` aceita parâmetro opcional (`productSlug`), então o evento de clique acaba sendo passado como argumento.
  - Esse objeto de evento cai no payload e quebra no `JSON.stringify` em `invokeCheckout`.
- Os slugs no banco estão corretos (Starter/Pro/Ultimate exclusivos + Vitalício 99,90).
- O backend de checkout está respondendo rápido em execuções normais (~500ms nos logs); a lentidão percebida está concentrada no lado cliente/cold-start/retries.

2) Plano de correção (escopo exato que você pediu)
- Sem inventar fluxo novo, sem alterar compra 1 clique.

A. Corrigir o botão vitalício da seção “Melhorado com Upscaler Arcano”
- Arquivo: `src/pages/PlanosUpscalerArcano.tsx`
- Trocar a CTA da galeria para chamada explícita do slug vitalício:
  - de `onClick={handlePurchase}`
  - para `onClick={() => handlePurchase("upscaller-arcano-vitalicio")}`
- Tipar/blindar `handlePurchase` para aceitar apenas slug string válido (com fallback seguro para vitalício se vier algo inválido).

B. Blindagem do checkout normal contra payload inválido
- Arquivo: `src/components/upscaler/PreCheckoutModal.tsx`
- Antes de enviar, validar slug com regra forte:
  - `typeof productSlug === "string" && productSlug.trim().length > 0`
- Se inválido, bloquear envio com erro amigável (sem crash).

C. Aceleração da abertura de checkout (para todos os fluxos que usam `invokeCheckout`)
- Arquivo: `src/lib/checkoutFetch.ts`
- Adicionar:
  - `AbortController` com timeout configurável (padrão global),
  - `try/catch` no `JSON.stringify(body)` para erro controlado,
  - parse robusto de resposta (inclusive quando backend não devolver JSON perfeito).
- Manter contrato `{ data, error }` para não quebrar páginas existentes.

D. Reduzir espera desnecessária no PreCheckout (normal)
- Arquivo: `src/components/upscaler/PreCheckoutModal.tsx`
- Ajustar estratégia full → lightweight:
  - só executar fallback quando fizer sentido (timeout/rede/erro recuperável),
  - evitar “dupla tentativa” em erros que não se beneficiam de fallback.
- Resultado esperado: menos casos de espera longa antes do redirecionamento.

E. Pré-aquecimento orientado à intenção (sem custo excessivo)
- Arquivos: `src/pages/PlanosUpscalerArcano.tsx` e/ou `src/components/upscaler/PreCheckoutModal.tsx`
- Manter prewarm de 3s já existente e adicionar prewarm ao abrir o modal/ao clicar em comprar (fire-and-forget), para reduzir cold start quando o usuário clica rápido.

3) Detalhes técnicos (seção dedicada)
```text
Fluxo corrigido:

CTA galeria (vitalício) -> handlePurchase("upscaller-arcano-vitalicio")
-> setCheckoutProductSlug
-> PreCheckoutModal valida slug estritamente
-> invokeCheckout(full, timeout curto)
   -> sucesso: redirect imediato
   -> timeout/erro recuperável: tenta lightweight
   -> erro não recuperável: mostra erro sem duplicar espera
```

4) Validação após implementar
- Vitalício (seção “Melhorado com Upscaler Arcano”):
  - clicar CTA, abrir modal, finalizar checkout sem erro de JSON circular.
  - request deve sair com `product_slug: "upscaller-arcano-vitalicio"`.
- Starter:
  - abrir, preencher, finalizar.
  - request com `product_slug: "upscaler-arcano-starter"`.
  - tempo de abertura melhor e sem “travamento”.
- Regressão:
  - sem alteração no fluxo de 1 clique.
  - sem mudança de preços/slugs já aplicados.
