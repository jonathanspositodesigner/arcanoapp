

## Plano: Desativar checkout do Mercado Pago

### O que será feito

Modificar a Edge Function `create-mp-checkout` para retornar erro imediatamente, sem processar nenhum checkout. Isso bloqueia qualquer tentativa de compra via Mercado Pago (inclusive de páginas cacheadas), sem mexer em nada do Pagar.me.

### Alteração

**Arquivo: `supabase/functions/create-mp-checkout/index.ts`**

Adicionar um retorno imediato de erro 403 logo após o CORS check, antes de qualquer processamento:

```typescript
// Logo após o OPTIONS check:
return new Response(JSON.stringify({ 
  error: 'Checkout Mercado Pago desativado temporariamente' 
}), {
  status: 403,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
})
```

Isso garante que:
- Nenhum checkout MP é criado
- Nenhuma ordem é inserida no banco
- O webhook do MP (`webhook-mercadopago`) continua intacto para processar pagamentos já em andamento
- Nada do Pagar.me é tocado

