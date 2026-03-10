

## Plano: PIX 1-Clique + PreCheckoutModal com slug dinâmico por produto

### Problema atual

O `PreCheckoutModal` e o `pagarme-one-click` têm o slug `upscaller-arcano-vitalicio` hardcoded. Isso significa que qualquer compra feita via esse modal registra como se fosse o produto do Upscaler Arcano, independente do que o usuário está comprando. Os pacotes de créditos avulsos na Planos2 ainda usam links da Greenn.

### Alterações

**1. Migração SQL — Inserir produtos de créditos avulsos na `mp_products`**

```sql
INSERT INTO mp_products (title, slug, price, is_active) 
VALUES 
  ('1.500 Créditos Avulsos', 'creditos-1500', 19.90, true),
  ('4.200 Créditos Avulsos', 'creditos-4200', 29.90, true),
  ('14.000 Créditos Avulsos', 'creditos-14000', 79.90, true);
```

**2. `PreCheckoutModal.tsx` — Adicionar prop `productSlug`**

- Nova prop: `productSlug?: string` (default: `'upscaller-arcano-vitalicio'`)
- Usar `productSlug` no `handleSubmit` e no `handleOneClickBuy` em vez do slug hardcoded
- Isso mantém compatibilidade total com a página de planos do Upscaler Arcano (que não passa a prop, usa o default)

**3. `Planos2.tsx` — Substituir links Greenn por PreCheckoutModal**

- Importar `PreCheckoutModal` e hooks de auth (`useAuth` ou `supabase.auth`)
- Adicionar estado para controlar qual pacote está sendo comprado (`selectedCreditSlug`)
- Para cada pacote de créditos avulsos, mapear o slug correto:
  - 1.500 → `creditos-1500`
  - 4.200 → `creditos-4200`  
  - 14.000 → `creditos-14000`
- No botão "Comprar Agora":
  - Se logado com perfil completo (name, phone, cpf) → chamar `create-pagarme-checkout` direto com PIX + dados do perfil → redirecionar
  - Se logado sem perfil completo → abrir `PreCheckoutModal` com o `productSlug` correto
  - Se não logado → abrir `PreCheckoutModal` com o `productSlug` correto
- Remover os links da Greenn (`payfast.greenn.com.br/156946...`, etc.)

**4. Garantir que webhook processa créditos para novos produtos**

- Verificar se `webhook-pagarme` já trata produtos do tipo créditos via `mp_products` — se a lógica usa o slug/produto da `asaas_orders` para conceder créditos, os novos produtos precisarão de tratamento no webhook (adicionar `credits_amount` na tabela ou tratar por slug no webhook)

### Fluxo resumido

```text
Usuário logado + perfil completo:
  Clica "Comprar" no pacote 1.500 → busca perfil → create-pagarme-checkout(slug='creditos-1500', PIX) → QR Code direto

Usuário logado + perfil incompleto:
  Clica "Comprar" → PreCheckoutModal(productSlug='creditos-1500') → preenche → checkout

Não logado:
  Clica "Comprar" → PreCheckoutModal(productSlug='creditos-1500') → preenche → checkout

Página Upscaler Arcano (sem mudança):
  PreCheckoutModal sem prop → usa default 'upscaller-arcano-vitalicio'
```

### Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | INSERT 3 produtos de créditos na `mp_products` |
| `PreCheckoutModal.tsx` | Prop `productSlug` dinâmico (default: `upscaller-arcano-vitalicio`) |
| `Planos2.tsx` | Lógica PIX 1-clique + PreCheckoutModal por pacote + remover links Greenn |
| `webhook-pagarme` (se necessário) | Garantir tratamento de créditos por produto |

