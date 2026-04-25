Vou corrigir a página de Conquistas para não depender apenas do registro em `partner_badges` quando o badge pode ser derivado dos dados reais do parceiro.

O que encontrei:
- O parceiro `jonathan.lifecazy@gmail.com` existe com 16 prompts aprovados e já tem `first_prompt` no banco.
- Mesmo assim, a UI pode continuar mostrando desativado se a leitura de `partner_badges` falhar, vier atrasada/cacheada, ou se algum perfil tiver estado legado inconsistente.
- A página hoje marca badge conquistado somente com `badges.some(...)`, sem conferir o requisito real do badge.

Plano de correção:

1. Atualizar `src/pages/PartnerConquistas.tsx`
   - Buscar contagens reais do parceiro logado junto com os dados atuais:
     - prompts aprovados e não rejeitados
     - ganhos totais
     - quantidade de jobs em ferramentas
     - quantidade de jobs Seedance
   - Criar uma função única de estado do badge que combine:
     - registro existente em `partner_badges`
     - regra derivada dos dados reais
   - Para `first_prompt`, considerar conquistado sempre que o parceiro tiver `approved = true` e `rejected != true` em pelo menos 1 prompt.
   - Para `diamond`, considerar conquistado com 50+ prompts aprovados e não rejeitados.
   - Para `millionaire`, `legendary`, `ai_master` e `seedance_star`, também derivar do saldo/nível/contagens já disponíveis.

2. Ajustar o visual dos badges conquistados
   - Manter os badges bloqueados clarinhos/grayscale.
   - Forçar badges conquistados com contraste alto, borda/ring dourada, selo de check e texto “Conquistado”.
   - Isso garante que um badge ativo nunca pareça desativado.

3. Corrigir o banco para consistência geral
   - Fazer um backfill de dados, não mudança estrutural:
     - inserir `first_prompt` para todo parceiro com 1+ prompt aprovado e não rejeitado que ainda não tenha o badge;
     - inserir `diamond` para todo parceiro com 50+ prompts aprovados e não rejeitados que ainda não tenha o badge.
   - Usar conflito ignorado para não duplicar nada.

4. Corrigir a regra futura de concessão automática
   - Atualizar a função/trigger de aprovação para contar somente prompts aprovados e não rejeitados.
   - Garantir que `first_prompt` seja concedido quando o parceiro atingir 1+ prompt aprovado, não apenas quando a contagem for exatamente 1.
   - Isso evita falha em casos legados ou reaprovação.

5. Versionar a atualização
   - Incrementar `APP_BUILD_VERSION` em `src/pages/Index.tsx` para forçar atualização do app conforme a regra do projeto.

Resultado esperado:
- Qualquer parceiro com pelo menos 1 prompt aprovado e não rejeitado verá “Primeira Contribuição” ativo na página de Conquistas.
- A correção vale para todos os perfis, não só para um usuário específico.
- A UI fica resiliente mesmo se algum registro de badge estiver faltando ou atrasado.