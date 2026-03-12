

# Duas correções para o Meta Pixel

## Explicação simples da primeira correção (event_time)

**O que é:** Quando alguém paga, o Pagar.me demora uns minutos pra avisar nosso sistema. Hoje, quando avisamos o Facebook da venda, mandamos o horário que *nosso sistema processou*, não o horário que *o cliente pagou*. O Facebook reclama porque parece que o evento está atrasado.

**O que vou fazer:** Pegar o horário exato que o cliente pagou (que o Pagar.me informa) e mandar esse horário pro Facebook.

**Pode marcar venda sem pagar como paga?** NÃO. Absolutamente nada muda na lógica de pagamento. O evento de Purchase **só é enviado quando o Pagar.me confirma que foi pago** (status `paid`). A única mudança é o *horário* que vai no evento — em vez de "22:55" (quando processamos), vai "22:51" (quando o cliente realmente pagou). Nenhuma lógica de verificação de pagamento é alterada.

---

## Segunda correção: Correspondência Avançada (screenshot)

**O que o Meta está pedindo:** Quando o Pixel é inicializado no navegador, passar o email do usuário logado para melhorar a taxa de correspondência (match quality) dos eventos.

**O que é hoje:**
```
fbq('init', '1162356848586894');
```

**O que vai ficar (quando o usuário estiver logado):**
```
fbq('init', '1162356848586894', { em: 'email@usuario.com' });
```

Isso melhora o match rate do Pixel (eventos do navegador), permitindo que o Facebook identifique melhor quem fez a ação.

## Arquivos a modificar

1. **`index.html`** — não dá pra passar email aqui pois é estático (antes do React carregar), mantém como está
2. **`src/pages/PackAgendas.tsx`** — passar email do usuário logado no `fbq('init')`
3. **Criar um componente/hook de Pixel** que re-inicializa o `fbq` com email quando o usuário loga — aplicável em todas as páginas via `App.tsx`
4. **`supabase/functions/meta-capi-event/index.ts`** — aceitar `event_time` opcional
5. **`supabase/functions/webhook-pagarme/index.ts`** — passar timestamp real do pagamento (`paid_at`)

## Resumo

| Correção | O que faz | Risco |
|----------|-----------|-------|
| event_time | Manda horário real do pagamento pro FB | Zero — só muda o horário, não afeta lógica de pagamento |
| Correspondência Avançada | Passa email do usuário logado pro Pixel | Zero — apenas melhora identificação do usuário no FB |

