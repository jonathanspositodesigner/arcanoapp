Corrigir exatamente a área que você apontou: `/admin-hub` > painel de colaboradores do admin, nas abas **Visão Geral**, **Ranking** e **Extrato por Colaborador**.

Plano:

1. Confirmar a fonte única de verdade dos ganhos
- Padronizar o Admin Hub para calcular os valores sempre a partir dos registros reais de ganhos e saques:
  - ganhos por cópia de prompt
  - ganhos por uso em ferramentas de IA
  - bônus de ranking
  - saques pagos
- Remover qualquer dependência visual de saldo agregado que possa estar desatualizado.

2. Corrigir a inconsistência real encontrada no banco
- Há pelo menos um colaborador com saldo agregado divergente do total real dos lançamentos:
  - Denilson está com `collaborator_balances.total_earned = R$ 0,32`
  - mas os lançamentos reais somam `R$ 0,16`
- Vou aplicar uma reconciliação para alinhar os saldos agregados aos lançamentos reais e evitar que essa divergência continue contaminando outras telas.

3. Blindar o cálculo do Admin Hub
- Revisar `PartnerEarningsAdminContent.tsx` para garantir que:
  - **Visão Geral** liste saldo bruto, disponível, prompts copiados e jobs IA com os totais reais
  - **Ranking** ordene pelos mesmos totais reais
  - **Extrato por Colaborador** some exatamente os mesmos lançamentos exibidos na lista
- Garantir que os três lugares usem a mesma regra de cálculo, sem diferenças entre abas.

4. Corrigir bug estrutural que pode inflar saldo no futuro
- Remover a atualização manual de `collaborator_balances.total_earned` no fluxo de bônus da gamificação/admin, porque ela pode somar em duplicidade quando já existe automação no banco para isso.
- Manter um único mecanismo de atualização de saldo para evitar contagem dobrada.

5. Fazer auditoria completa dos ganhos por ferramentas de IA
- Validar cobertura das ferramentas hoje rastreadas para colaboradores.
- Confirmar quais tools realmente geram earning por prompt de parceiro e quais não devem gerar.
- Verificar se há jobs concluídos com prompt de parceiro sem earning registrado.

6. Sincronizar também o painel do colaborador
- Onde ainda houver leitura de saldo agregado no painel do colaborador, trocar para soma real dos lançamentos para evitar divergência entre “o que o admin vê” e “o que o colaborador vê”.

7. Publicar correção e atualizar versão
- Subir a correção com bump de `APP_BUILD_VERSION` para forçar atualização do frontend.

Achados já confirmados
- O local correto é mesmo o que você descreveu: `Admin Hub` > `Colaboradores`.
- O cálculo real hoje no banco é:
  - Hérica: `R$ 1,28` total (`R$ 0,12` em cópias + `R$ 1,16` em ferramentas, 8 jobs IA)
  - Denilson: `R$ 0,16` total (1 job IA)
  - Jonathan: `R$ 0,05` total (1 cópia)
- Existe divergência agregada real no banco para pelo menos um colaborador.
- Existe um ponto de código que pode gerar saldo duplicado em bônus futuros.

Detalhes técnicos
- Arquivos principais:
  - `src/components/admin/PartnerEarningsAdminContent.tsx`
  - `src/pages/PartnerEarnings.tsx`
  - `src/pages/PartnerDashboard.tsx`
  - `src/components/admin/PartnerGamificationAdmin.tsx`
- Ajustes de banco:
  - reconciliar `collaborator_balances` com os lançamentos reais
  - manter automação de saldo sem incrementos manuais duplicados

Se você aprovar, eu parto para corrigir exatamente esse painel do admin e a consistência dos saldos por trás dele.