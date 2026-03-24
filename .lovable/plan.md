
Diagnóstico (10:01 São Paulo)

- Convertendo horário: **10:01 BRT = ~13:01 UTC**.
- No banco, nesse intervalo (**12:55–13:05 UTC**) encontrei:
  - apenas **1 job Arcano Cloner às 13:04:48 UTC** (sucesso),
  - e os uploads de storage correspondentes também só às **13:04:47/13:04:48 UTC**.
- Não há evidência de execução do processamento (fila/webhook) exatamente em 13:01 UTC.
- Isso indica falha **antes** de iniciar o job (fase de upload/insert), compatível com o erro do print:  
  **“new row violates row-level security policy”**.

Causa mais provável

- O Arcano Cloner usa RLS estrita:
  - `storage.objects` (bucket `artes-cloudinary`) só aceita upload se o caminho tiver o `auth.uid()` correto.
  - `arcano_cloner_jobs` só aceita insert se `user_id = auth.uid()`.
- Se a UI tiver `user.id` em memória, mas o token real da sessão estiver ausente/expirado/dessincronizado, o backend enxerga como anônimo ou UID diferente e bloqueia com RLS.
- Portanto, o erro não é do modelo de IA; é de **estado de autenticação vs RLS** na criação do processamento.

Plano de correção (definitivo, sem afrouxar segurança)

1) Revalidar autenticação imediatamente antes de processar (Arcano Cloner)
- Em `handleProcess`, buscar `supabase.auth.getUser()` na hora do clique.
- Usar **somente** esse `authUser.id` validado (não o `user.id` do estado React) para:
  - path do upload no storage,
  - `user_id` do insert em `arcano_cloner_jobs`,
  - payload enviado para a função de processamento.
- Se não houver `authUser`, bloquear execução e abrir fluxo “faça login novamente”.

2) Retry controlado de sessão (1 tentativa)
- Quando erro de upload/insert for de RLS/401/403:
  - tentar `supabase.auth.refreshSession()` uma vez,
  - repetir a operação uma única vez.
- Se falhar de novo, abortar com mensagem amigável (sem loop infinito).

3) Mensagem de erro clara para usuário final
- Mapear erro de RLS em `getAIErrorMessage` para algo tipo:
  - “Sua sessão expirou. Faça login novamente para gerar a imagem.”
- Evitar exibir mensagem técnica crua no toast.

4) Blindagem adicional no trial (preventivo)
- Em `ClonerTrialSection`, antes do insert:
  - se houver usuário autenticado, não inserir `user_id: null`; usar fluxo compatível com sessão atual (ou redirecionar para fluxo normal).
- Isso evita outro cenário clássico de RLS quando usuário logado cai no trial.

5) Observabilidade para não ficar no escuro
- Adicionar logs estruturados no frontend por etapa (`upload_user`, `upload_reference`, `insert_job`) com `error.code/message`.
- Assim fica claro se a falha aconteceu no storage ou no insert do job.

Arquivos para ajustar

- `src/pages/ArcanoClonerTool.tsx`  
  (revalidação auth em tempo real, uso de `authUser.id`, retry de sessão)
- `src/components/arcano-cloner/trial/ClonerTrialSection.tsx`  
  (compatibilizar insert com usuário autenticado)
- `src/utils/errorMessages.ts`  
  (mapa específico para erro de RLS/sessão expirada)

Detalhes técnicos

- Manter as políticas RLS atuais (estão corretas e seguras); o problema é de fluxo/sessão no cliente.
- Não abrir policy para permitir `user_id` divergente ou nulo em fluxo autenticado.
- Critério de sucesso após correção:
  1) com sessão válida: upload + insert sempre passam;
  2) com sessão expirada: usuário recebe orientação de relogin (sem erro técnico cru);
  3) nenhum caso volta a mostrar “new row violates row-level security policy” no fluxo normal.
