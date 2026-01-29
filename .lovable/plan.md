
## Correção: Acesso ao Upscaler Arcano v1 para Assinantes Unlimited

### O que está acontecendo

O cliente `Emerson.DeathStroke@gmail.com` tem o plano **Arcano Unlimited** ativo (confirmado no banco de dados), mas ao tentar acessar as aulas do Upscaler Arcano v1, a página mostra "Você ainda não tem acesso a esta ferramenta".

### Causa do problema

A página de aulas (`ToolVersionLessons`) verifica apenas se o usuário comprou o pack do Upscaler separadamente, mas **não verifica** se ele tem o plano Unlimited (que também dá direito ao acesso).

Em outras palavras:
- A tela de seleção de versão reconhece o plano Unlimited ✓
- A tela de aulas **não reconhece** o plano Unlimited ✗

### Impacto

Todos os **72 assinantes ativos do plano Arcano Unlimited** estão sendo bloqueados das aulas do Upscaler quando entram pela rota direta.

### Solução

Adicionar a mesma verificação de acesso que já existe na tela de seleção de versão:

```
Se (usuário tem plano Unlimited) OU (usuário comprou pack Upscaler)
   → Liberar acesso às aulas
```

### Arquivos que serão alterados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/ToolVersionLessons.tsx` | Adicionar verificação do plano Unlimited do PromptClub |

### Detalhes técnicos

1. Importar o hook `usePremiumStatus` (que já existe e é usado em outras páginas)
2. Verificar se `planType === 'arcano_unlimited'`
3. Combinar com a verificação existente: `hasAccess = hasUnlimitedAccess || hasAccessToPack(toolSlug)`

### Resultado esperado

Após a correção, o cliente `Emerson.DeathStroke@gmail.com` e todos os outros 72 assinantes Unlimited conseguirão acessar as aulas do Upscaler Arcano v1 normalmente.
