

# Plano: Integrar Créditos no webhook-greenn-artes

## Resumo

Modificar o `webhook-greenn-artes` para detectar produtos de créditos no início do processamento e tratá-los de forma especial, sem interferir no fluxo normal de artes.

## Mapeamento de Produtos de Créditos

| Product ID | Créditos |
|------------|----------|
| 156946 | +1.500 |
| 156948 | +4.200 |
| 156952 | +10.800 |

## Mudanças Necessárias

### Arquivo: `supabase/functions/webhook-greenn-artes/index.ts`

**1. Adicionar constante de mapeamento de créditos (linha ~37)**
```typescript
// Mapeamento de produtos de CRÉDITOS
const CREDITS_PRODUCT_MAPPING: Record<number, { amount: number; name: string }> = {
  156946: { amount: 1500, name: 'Pacote +1.500 Créditos' },
  156948: { amount: 4200, name: 'Pacote +4.200 Créditos' },
  156952: { amount: 10800, name: 'Pacote +10.800 Créditos' }
}
```

**2. Adicionar função `processCreditsWebhook` (~linha 385)**

Nova função para processar compras de créditos:
- Verificar blacklist
- Criar usuário se não existe (email = senha)
- Upsert profile
- Chamar `add_lifetime_credits` RPC
- Enviar email de boas-vindas com template específico para créditos
- Atualizar log com sucesso

**3. Modificar `processGreennArtesWebhook` (dentro do bloco `paid/approved`)**

No início do bloco `if (status === 'paid' || status === 'approved')` (linha ~446), adicionar verificação:

```typescript
// VERIFICAR SE É PRODUTO DE CRÉDITOS
const creditsProduct = productId ? CREDITS_PRODUCT_MAPPING[productId] : null
if (creditsProduct) {
  console.log(`   ├─ 🎫 PRODUTO DE CRÉDITOS DETECTADO: ${creditsProduct.amount} créditos`)
  await processCreditsWebhook(supabase, payload, logId, requestId, creditsProduct)
  return  // Não continuar para processamento de artes
}
```

**4. Modificar logging na entrada (linha ~722)**

Ajustar plataforma no log inicial para identificar créditos:
```typescript
platform: creditsProduct ? 'creditos' : (fromApp ? 'app' : 'artes-eventos')
```

## Fluxo de Decisão

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    webhook-greenn-artes                             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                          ┌───────┴───────┐
                          │ product_id em │
                          │ CREDITS_MAP?  │
                          └───────┬───────┘
                                  │
                     ┌────────────┴────────────┐
                     │                         │
                    SIM                       NÃO
                     │                         │
                     ▼                         ▼
          ┌─────────────────┐      ┌─────────────────────┐
          │ Processar como  │      │ Processar como      │
          │ CRÉDITOS        │      │ ARTES (fluxo atual) │
          │                 │      │                     │
          │ - Criar/buscar  │      │ - Pack/Promoção     │
          │   usuário       │      │ - user_pack_        │
          │ - add_lifetime_ │      │   purchases         │
          │   credits()     │      │                     │
          │ - Email créditos│      │                     │
          └─────────────────┘      └─────────────────────┘
```

## Email para Créditos

Template diferenciado:
- Título: "🎫 Seus Créditos foram Adicionados!"
- Corpo: quantidade de créditos + ferramentas disponíveis (Upscaler, Forja 3D, etc)
- CTA: Link para página de ferramentas IA

## Vantagens desta Abordagem

1. **Sem duplicação de código**: Reutiliza toda a infraestrutura existente (logging, blacklist, criação de usuário, email)
2. **Mesma URL**: Não precisa mudar nada na Greenn
3. **Fácil manutenção**: Toda a lógica de webhook em um só lugar
4. **Isolado**: O fluxo de créditos retorna cedo, não interfere em nada do fluxo de artes
5. **Logs separados**: Platform = 'creditos' no webhook_logs

## Arquivos Modificados

| Arquivo | Ação |
|---------|------|
| `supabase/functions/webhook-greenn-artes/index.ts` | **MODIFICAR** |

