

## Entendimento

Você quer separar o Upscaler Arcano em dois produtos independentes:
- **V2** (produto atual `upscaller-arcano-vitalicio`): quem já comprou continua com acesso apenas à V2
- **V3** (novo produto `upscaler-arcano-v3`): será um produto separado. Quem comprar V3 ganha acesso à V3 **e** à V2. Quem tem só V2 **não** ganha V3 automaticamente

Na tela de ferramentas e na seleção de versão, quem tem V2 verá o card da V3 com visual "em breve" (preto e branco) e botão para adquirir com desconto. A V3 fica bloqueada até que o usuário compre ou você conceda acesso manualmente.

---

## Plano de Implementação

### 1. Criar produto V3 no banco (`mp_products`)
- Inserir novo registro: slug `upscaler-arcano-v3`, title "Upscaler Arcano V3", type `pack`, pack_slug `upscaller-arcano-v3`, price (a definir por você), access_type `vitalicio`

### 2. Atualizar Webhooks (Mercado Pago + Pagar.me)
- Adicionar lógica para o slug `upscaler-arcano-v3`:
  - Conceder acesso ao pack `upscaller-arcano-v3` (novo pack)
  - **Também** conceder acesso ao pack `upscaller-arcano` (V2) como bônus
  - Aplicar bônus de créditos se necessário (mesma lógica do vitalício atual ou diferente, conforme sua decisão)
- Adicionar lógica de estorno para revogar ambos os packs

### 3. Atualizar `UpscalerArcanoVersionSelect` (página de seleção de versão)
- Verificar acesso V3 via `hasAccessToPack('upscaller-arcano-v3')`
- Para V2 (versões v1 e v2): manter acesso normal para quem tem pack `upscaller-arcano`
- Adicionar **card da V3**:
  - Se tem acesso V3: card colorido com botão "Acessar"
  - Se **não** tem V3: card em preto e branco, badge "Em Breve", botão "Adquirir com Desconto" que leva à página de compra

### 4. Atualizar `UpscalerSelectionPage` (página Imagem/Vídeo da V3)
- Adicionar verificação de acesso ao pack `upscaller-arcano-v3`
- Se não tem acesso: redirecionar para planos ou mostrar bloqueio

### 5. Atualizar `FerramentasIAAplicativo` (página inicial de ferramentas)
- Quando o usuário clica no card Upscaler Arcano com pack V2:
  - Navegar para `UpscalerArcanoVersionSelect` (que agora mostrará V2 ativa e V3 para comprar)
- O modal `UpscalerChoiceModal` no fluxo "Versão Ilimitada" deve levar para a seleção de versão em vez de direto à ferramenta

### 6. Atualizar `usePremiumArtesStatus` / verificações de acesso
- As verificações em `UpscalerArcanoTool` e `UpscalerSelectionPage` devem checar `upscaller-arcano-v3` para a V3
- As verificações em `UpscalerArcanoV1/V2` continuam checando `upscaller-arcano` para a V2

---

## Arquivos a Alterar
- **Migration SQL**: inserir produto `upscaler-arcano-v3` na `mp_products`
- **`supabase/functions/webhook-mercadopago/index.ts`**: lógica V3 (conceder V3 + V2, estorno)
- **`supabase/functions/webhook-pagarme/index.ts`**: mesma lógica V3
- **`src/pages/UpscalerArcanoVersionSelect.tsx`**: adicionar card V3 com estado bloqueado/em breve
- **`src/pages/UpscalerSelectionPage.tsx`**: verificar acesso V3 antes de permitir uso
- **`src/pages/FerramentasIAAplicativo.tsx`**: ajustar navegação do card upscaler
- **`src/components/ferramentas/UpscalerChoiceModal.tsx`**: ajustar navegação "Versão Ilimitada" para ir à seleção de versão

## Dados
- O produto V3 será inserido com preço que você definir (posso deixar um placeholder)
- A concessão de acesso manual será feita por você via interface do banco, inserindo `user_pack_purchases` com `pack_slug = 'upscaller-arcano-v3'`

