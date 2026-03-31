

## O que entendi do pedido

Você quer configurar os 4 botões de checkout na página `/upscalerarcanov3`:

### Botões Starter, Pro e Ultimate
- Usam os **mesmos slugs** que já existem na página `/planos-upscaler-arcano-69`:
  - **Starter** → slug `upscaler-arcano-starter` (R$24,90)
  - **Pro** → slug `upscaler-arcano-pro` (R$37,00)
  - **Ultimate** → slug `upscaler-arcano-ultimate` (R$79,90)
- Liberam **exatamente as mesmas coisas** que já liberam na página 69 (créditos conforme o plano, acesso ao pack upscaler-arcano, etc.)
- Checkout via Mercado Pago com modal de coleta de dados (Nome, Email, CPF)

### Botão Ilimitado (Garantir Vitalício)
- Usa o slug **`upscaler-arcano-v3`** (R$99,90) — produto que **já existe** no banco e nos webhooks
- Libera:
  - Acesso ao pack **`upscaller-arcano-v3`** (V3)
  - Acesso ao pack **`upscaller-arcano`** (V2) como bônus
  - **Não** concede 10k créditos (diferente do V2 antigo)
  - **Não** concede image/video generation
- E-mail de boas-vindas específico do V3 (já implementado no webhook)
- Estorno revoga V3 + bônus V2 atomicamente (já implementado)

### O que será feito

**1. Integrar `useMPCheckout` na página `UpscalerArcanoV3.tsx`**
- Importar o hook e renderizar `<MPCheckoutModal />`
- Substituir os 4 `<a href="#">` por `<button>` com `onClick={() => openCheckout(slug)}`

**2. Mapear slugs nos botões:**

| Card | Slug | Preço |
|------|------|-------|
| Starter | `upscaler-arcano-starter` | R$24,90 |
| Pro | `upscaler-arcano-pro` | R$37,00 |
| Ultimate | `upscaler-arcano-ultimate` | R$79,90 |
| Ilimitado | `upscaler-arcano-v3` | R$99,90 |

**3. Nenhuma alteração necessária no backend** — todos os produtos e lógicas de webhook já existem e funcionam.

### Resumo do que cada botão libera

- **Starter/Pro/Ultimate**: Mesma lógica da página 69 — créditos proporcionais ao plano, acesso ao upscaler, features conforme configurado no `mp_products`
- **Ilimitado (V3)**: Acesso vitalício completo ao Upscaler V3 + V2, sem créditos bônus de 10k, e-mail de boas-vindas customizado V3

