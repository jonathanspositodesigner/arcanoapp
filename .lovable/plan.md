
Objetivo: corrigir o bug do cadastro de senha e destravar a Ingrid para ela conseguir entrar na plataforma.

O que eu já confirmei no cadastro dela:
- existe pedido pago para `ingridperondicosta@hotmail.com`;
- já existe conta de autenticação para ela;
- já existe profile vinculado;
- o e-mail dela já está confirmado;
- ela ainda está no estado `password_changed = false` e `last_sign_in_at = null`.

Conclusão prática:
- o problema não é falta de compra;
- o problema não é “email inexistente”;
- o bug está no fluxo de primeiro acesso/definição de senha, que deixa a cliente num estado incompleto e ainda devolve erro genérico na interface.

Plano de correção:
1. Ajustar o backend de finalização de acesso (`complete-purchase-onboarding`) para tratar corretamente o caso “pedido pago + usuário já existente + ainda sem acesso concluído”, sem quebrar quando a cliente já tiver conta criada pelo pagamento.
2. Padronizar a validação da compra entre a checagem inicial e a etapa final de criação de senha, para não acontecer o cenário “passa na verificação do email” e falha na hora de salvar a senha.
3. Mover a confirmação final do primeiro acesso para o backend: quando a senha for gravada com sucesso, o sistema já deve marcar o acesso como concluído, sem depender só do login automático do frontend.
4. Corrigir o frontend das telas que fazem esse fluxo (`SucessoCompra`, `SucessoUpscalerArcano` e `ChangePassword`) para:
   - parar de mostrar erro genérico;
   - usar a resposta real do backend;
   - concluir o login/redirecionamento corretamente depois da senha salva.
5. Validar especificamente o caso da Ingrid após a correção, simulando exatamente o estado atual dela: pedido pago, usuário existente, e-mail confirmado e primeiro login ainda não concluído.
6. Fazer teste ponta a ponta nos 3 cenários críticos:
   - cliente novo;
   - cliente com conta já criada pelo pagamento mas sem senha concluída;
   - cliente que já tem conta ativa e só precisa entrar.

Resultado esperado:
- a Ingrid consegue cadastrar a senha e acessar a plataforma;
- esse bug para de acontecer com clientes que já tiveram o usuário criado antes de concluir o primeiro acesso.

Detalhes técnicos:
- arquivos principais: `supabase/functions/complete-purchase-onboarding/index.ts`, `src/pages/SucessoCompra.tsx`, `src/pages/SucessoUpscalerArcano.tsx`, `src/pages/ChangePassword.tsx`;
- se houver divergência entre a checagem de compra e a finalização do onboarding, eu vou unificar a lógica para usar o mesmo critério nos dois lados.
