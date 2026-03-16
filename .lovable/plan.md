

## Plano: Checkout em 2s com Fallback Reserva

### Diagnóstico Confirmado
- O checkout Pagar.me funciona (17 pagamentos pagos nas últimas 24h, zero falhas no banco)
- O problema é **latência**: a Edge Function tem timeout de 25s + 2 retries = até 75s no pior caso
- O erro "Erro ao criar checkout" acontece quando o Edge Function excede o timeout do Supabase (~150s) ou o gateway demora demais
- O `PreCheckoutModal.tsx` não tem nenhum mecanismo de timeout ou fallback no frontend

### Solução: Race com Timeout de 2s + Checkout Reserva

#### 1. Frontend - `PreCheckoutModal.tsx` (principal)
Implementar um **race** entre a chamada real e um timeout de 2s:
- Iniciar `supabase.functions.invoke('create-pagarme-checkout')` normalmente
- Após **2 segundos** sem resposta, mostrar botão "Abrir Checkout Reserva" que leva o usuário a um link Pagar.me pré-gerado (fallback)
- Se a resposta chegar antes, redirecionar normalmente (comportamento atual)
- Se a resposta chegar DEPOIS do fallback aparecer e o usuário ainda não clicou, redirecionar automaticamente
- O erro genérico `alert('Erro ao criar checkout')` será substituído por mensagem detalhada com `error_code` do backend

#### 2. Edge Function - `create-pagarme-checkout/index.ts` (otimização)
Reduzir timeout para acelerar o fluxo normal:
- Reduzir `timeoutMs` de 25s para **8s** (a maioria dos checkouts retorna em 1-3s)
- Reduzir `maxRetries` de 2 para **1** (se deu timeout em 8s, retry 1x é suficiente)
- Pular validação de CPF (Módulo 11) quando `billing_type === 'PIX'` (Pagar.me já valida)
- Total worst case: 8s + 1.5s backoff + 8s = ~17s (vs 75s atual)

#### 3. Fallback Checkout Reserva
Para o produto `upscaller-arcano-vitalicio`, usar um link de checkout Pagar.me pré-criado como fallback:
- Criar uma tabela de mapeamento `product_slug → fallback_checkout_url` embutida no frontend
- O fallback é um link genérico do Pagar.me que funciona sem personalização (o webhook ainda processa o pagamento)
- Alternativa: redirecionar para o link Greenn que já existe em `artes_packs.checkout_link_vitalicio`

#### 4. Mensagens de Erro Detalhadas
Substituir `alert('Erro ao criar checkout')` por um toast com informação útil:
- Se `error_code === 'RATE_LIMITED'`: "Muitas tentativas, aguarde 1 minuto"
- Se `error_code === 'GATEWAY_UNREACHABLE'`: "Gateway de pagamento indisponível. Use o checkout reserva"
- Se `error_code === 'INVALID_CPF'`: "CPF inválido, verifique os dígitos"
- Default: mostrar `error_code` e `request_id` para debug

### Arquivos Modificados
1. **`src/components/upscaler/PreCheckoutModal.tsx`** - Race timeout 2s, botão fallback, mensagens detalhadas
2. **`supabase/functions/create-pagarme-checkout/index.ts`** - Reduzir timeouts
3. **Páginas que usam checkout direto** (`PlanosArtes.tsx`, `PlanosArtesMembro.tsx`, `Planos2.tsx`) - Mesmo padrão de fallback

### Fluxo Visual
```text
Usuário clica "Finalizar e Pagar"
  ├── t=0s: Inicia chamada Edge Function + mostra "Gerando checkout..."
  ├── t=2s: Se não respondeu → mostra botão "⚡ Checkout Reserva" (link direto)
  │         (chamada continua em background)
  ├── t<2s: Resposta OK → redireciona para checkout_url ✅
  ├── t>2s: Resposta OK → redireciona automaticamente ✅
  └── Erro: Mostra mensagem detalhada com error_code
```

