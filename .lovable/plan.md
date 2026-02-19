
## Problema
O email enviado na compra do Arcano Cloner é o mesmo template genérico de "créditos adicionados" — não menciona o produto comprado, não explica o que é a ferramenta, não causa impacto.

## O que será feito

### Arquivo: `supabase/functions/webhook-greenn-creditos/index.ts`

**1. Criar uma função dedicada `sendArcanoClonnerEmail`** (separada da função genérica `sendWelcomeEmail`) com um template totalmente novo, focado no produto:

**Estrutura do novo email:**
- Header: "Você comprou o Arcano Cloner!" com identidade visual dark (roxa/dourada)
- Bloco principal: Explicação clara do que é o produto — "Ferramenta de IA para criar fotos com alta fidelidade ao seu rosto"
- Bloco de créditos: Destacar os 4.200 créditos vitalícios incluídos na compra
- Credenciais de acesso (email + senha temporária)
- Botão CTA: "Acessar o Arcano Cloner agora"
- Aviso de troca de senha

**2. Lógica de desvio por produto (linha ~547):** Verificar se `productId === 159713` e chamar o novo template ao invés do genérico:

```typescript
// Na linha ~547, substituir:
await sendWelcomeEmail(supabase, email, clientName, creditAmount, isNewUser, requestId, userLocale)

// Por:
if (productId === 159713) {
  await sendArcanoClonnerEmail(supabase, email, clientName, creditAmount, isNewUser, requestId)
} else {
  await sendWelcomeEmail(supabase, email, clientName, creditAmount, isNewUser, requestId, userLocale)
}
```

**3. Conteúdo do novo template `sendArcanoClonnerEmail`:**

```
ASSUNTO: 🎉 Seu Arcano Cloner está ativado! Comece a criar agora

HEADER: Arcano Cloner ativado com sucesso!

CORPO:
"Parabéns pela sua compra! Você agora tem acesso ao Arcano Cloner
— a ferramenta de IA para criar fotos com alta fidelidade
ao seu rosto e aparência."

[BOX DESTAQUE - O QUE É O ARCANO CLONER]
"Envie uma foto sua + uma imagem de referência e a IA recria
você na cena com precisão e criatividade ajustável."

[BOX CRÉDITOS]
"+4.200 créditos vitalícios incluídos na sua compra"
"= 42 gerações disponíveis (100 créditos por geração)"

[BOX CREDENCIAIS]
Email: iris-dolores@...
Senha temporária: [email]
⚠️ Troque sua senha no primeiro acesso

[BOTÃO CTA]
🚀 Acessar o Arcano Cloner agora

[RODAPÉ]
Link direto: arcanoapp.voxvisual.com.br
```

**Visual:** Dark mode com tons roxo (#8b5cf6) e dourado (#d4af37), igual ao estilo do app.

### Impacto
- Apenas o template do email é alterado — zero impacto na lógica de créditos ou banco
- Funciona apenas para produto 159713 (Arcano Cloner)
- Todos os outros produtos continuam recebendo o email genérico de créditos
