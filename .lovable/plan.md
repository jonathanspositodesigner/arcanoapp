
Resultado da verificação urgente (feito agora, no banco)

- Eu verifiquei **todos os casos um por um** que estão com `premium_users.is_active = true` e `expires_at < now()`.
- Total encontrado: **69 usuários** nesse estado.
- Em **Planos 2** (`planos2_subscriptions`), casos equivalentes: **0**.

Confirmação dos dois usuários marcados no print

- `diego_17drumeri@hotmail.com`  
  - legacy `is_active=true`, mas `expires_at=2026-01-30` (vencido)  
  - sem assinatura ativa em `planos2_subscriptions`  
  - **acesso premium efetivo: NÃO**
- `olavonetoantonio@gmail.com`  
  - legacy `is_active=true`, mas `expires_at=2026-01-30` (vencido)  
  - sem assinatura ativa em `planos2_subscriptions`  
  - **acesso premium efetivo: NÃO**

Diagnóstico principal (por que aparece “Ativo”)

1) O painel admin está exibindo status errado visualmente  
- Em `src/pages/AdminPremiumDashboard.tsx`, o badge “Ativo/Inativo” usa **só** `user.is_active` (linhas do bloco de tabela onde renderiza status), sem considerar vencimento (`expires_at`).
- Então quem está vencido, mas com `is_active=true`, aparece “Ativo” no painel.

2) Não existe rotina automática para desligar `is_active` na tabela legada `premium_users` ao vencer  
- Há função de expiração para **Planos 2** (`expire_planos2_subscriptions`), mas não há equivalente para `premium_users`.
- No webhook (`supabase/functions/webhook-greenn/index.ts`), a desativação ocorre apenas quando chegam eventos tipo `canceled/unpaid/refunded/chargeback`.
- Se o provedor não enviar esses eventos (ou não enviar no timing esperado), `is_active` fica true mesmo vencido.

Se esses 69 ainda têm acesso premium real

- Pelo critério oficial de acesso (`is_premium()`), que exige `is_active=true` **e** `expires_at` válido, esses 69 estão sem premium efetivo.
- Validação consolidada:
  - `total_legacy_expired_active = 69`
  - `still_effectively_premium = 0`
  - `no_effective_premium_access = 69`

Ponto crítico adicional encontrado (bug real de privilégio em custo de IA)

- Em backend de geração:
  - `supabase/functions/generate-image/index.ts`
  - `supabase/functions/generate-video/index.ts`
- A checagem de “IA Unlimited” usa `premium_users.is_active=true` sem validar `expires_at`.
- Isso pode manter benefício de custo reduzido para usuário vencido com row “ativa”.
- Evidência no banco:
  - **36 jobs de imagem** com custo reduzido após vencimento (todos do usuário admin `jonathan@admin.com`).
  - Vídeo reduzido após vencimento: **0** casos encontrados.

Lista dos 69 casos verificados (1 por 1)

1. brunoowbrunoow@gmail.com (-35d)  
2. jonathan@admin.com (-34d)  
3. gladyston-20@hotmail.com (-33d)  
4. meggavox@gmail.com (-31d)  
5. djmiguelcupira@gmail.com (-29d)  
6. ewandro.mov@gmail.com (-25d)  
7. diego_17drumeri@hotmail.com (-25d)  
8. olavonetoantonio@gmail.com (-25d)  
9. jefersonbarbante@hotmail.com (-25d)  
10. bpagliotti@me.com (-24d)  
11. crislmachado@yahoo.com.br (-19d)  
12. topdesingne@gmail.com (-18d)  
13. nacaronaoficial@gmail.com (-18d)  
14. luanzito291@gmail.com (-18d)  
15. thaillon.k@gmail.com (-18d)  
16. artemidia2011@hotmail.com (-18d)  
17. renato@nubatuque.com.br (-18d)  
18. gcheatdown@gmail.com (-18d)  
19. luanhenriquesevero0@gmail.com (-17d)  
20. andremonaro38@gmail.com (-17d)  
21. bandaforlex@hotmail.com (-17d)  
22. lucianoserv.obras@gmail.com (-17d)  
23. majida.hamia@gmail.com (-17d)  
24. henriqueeedcarlos@gnail.com (-17d)  
25. paulo.neres@live.com (-16d)  
26. raphaelworkproducoes@gmail.com (-16d)  
27. leovibeoficial@gmail.com (-16d)  
28. zoxdigital.oficial@gmail.com (-15d)  
29. iran_mello@hotmail.com (-15d)  
30. marcospauloac97@gmail.com (-15d)  
31. fcarloslive@gmail.com (-15d)  
32. renilsonsilvadesigner@gmail.com (-14d)  
33. eliesio.contato@gmail.com (-12d)  
34. malualvescantora@gmail.com (-12d)  
35. bastoskellyson13@gmail.com (-12d)  
36. gabriel_ramiro.santos@hotmail.com (-11d)  
37. andreydossantos199@gmail.com (-11d)  
38. guttinho2021@icloud.com (-11d)  
39. bruninhopromocoes@gmail.com (-11d)  
40. gustavosaandes@gmail.com (-10d)  
41. luan.o.lima42@gmail.com (-10d)  
42. franciscob13k12@gmail.com (-10d)  
43. santosdejesuscarloshenrique@gmail.com (-10d)  
44. contat.vibecampinas@gmail.com (-10d)  
45. maidaproducao@gmail.com (-9d)  
46. rhuannfarri@gmail.com (-9d)  
47. ruancarlostt1@gmail.com (-9d)  
48. augusto-rigueira@outlook.com (-9d)  
49. v.g2017.13@gmail.com (-9d)  
50. mauricioiluminadoroficial@gmail.com (-9d)  
51. ofrancadesigner@gmail.com (-9d)  
52. pablo_henriquecaires@hotmail.com (-7d)  
53. oialecs@hotmail.com (-5d)  
54. rogeriorealsom@gmail.com (-5d)  
55. allan.contato2@gmail.com (-5d)  
56. otalagado@gmail.com (-4d)  
57. estudiomarcelao@gmail.com (-4d)  
58. joaovitoohbarbosa@gmail.com (-4d)  
59. brenorisso@gmail.com (-4d)  
60. emilyeddy2018@gmail.com (-3d)  
61. djrodomixhotmail.com@gmail.com (-3d)  
62. henrique.nirdo@icloud.com (-3d)  
63. djsapaooficial@gmail.com (-2d)  
64. mixtonni@gmail.com (-2d)  
65. brucenho@hotmail.com (-2d)  
66. clemisonsouza@gmail.com (-1d)  
67. juniordjfunkyou027@gmail.com (-1d)  
68. lawrencolw@gmail.com (-1d)  
69. ipcosta01@gmail.com (-0d)

Plano objetivo para corrigir de vez (próxima execução, após sua aprovação)

1. Corrigir exibição no Admin Premium Dashboard  
- Status “Ativo” deve considerar também `expires_at > now()`.
- Métricas de cards (Ativos/Inativos/Expirando) idem.

2. Blindar backend de geração de imagem/vídeo  
- `generate-image` e `generate-video` devem validar expiração, não só `is_active`.
- Usar o mesmo critério unificado de acesso premium.

3. Higienizar base legada automaticamente  
- Criar rotina para desativar (`is_active=false`) registros de `premium_users` vencidos.
- Rodar inicialmente para limpar os 69 casos já vencidos.

4. Monitoramento  
- Painel/admin com indicador: “vencidos com flag ativa” para não voltar a acontecer.

Resumo final, direto:
- Você estava certo: o painel está marcando como ativo um monte de vencido.
- Nos 69 casos analisados, o premium efetivo não está ativo pela regra principal.
- Mas existe sim um bug real em ferramentas de geração que pode manter benefício de custo para vencido se a flag ficar ativa.
