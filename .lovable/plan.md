
Objetivo
- Para usuário com email existente e password_changed = false (primeiro acesso), o fluxo deve levar o usuário para “cadastrar nova senha” (/change-password) e não para “esqueceu sua senha”.
- Manter o comportamento atual “ideal”: quando a senha temporária (email = senha) funciona, o usuário entra automaticamente e cai direto na tela de criar senha.
- Quando a senha temporária falhar (casos quebrados/misturados), ainda assim não mandar para a tela “esqueceu senha”; em vez disso, disparar um fluxo de “criar senha” com link seguro e direcionar esse link para /change-password.

Diagnóstico (estado atual)
- HomeAuthModal.tsx:
  - Se exists && !password_changed: tenta signInWithPassword(email, email).
  - Se falha, hoje redireciona para /forgot-password?email=...
- UserLogin.tsx:
  - Se exists && !password_changed: tenta signInWithPassword(email, email).
  - Se falha, abre um modal explicando para tentar “email como senha” (não garante que o usuário vá para criar senha).
- UserLoginArtes.tsx e UserLoginArtesMusicos.tsx:
  - Se exists && !password_changed: tenta signInWithPassword(email, email).
  - Se falha, só dá toast de erro genérico.
- Ponto técnico importante:
  - A página /change-password (e as variantes) depende de sessão autenticada para conseguir setar senha via updateUser.
  - Se o auto-login falha, não existe sessão; então “mandar direto para /change-password” sem mais nada não funciona. A alternativa correta (sem gambiarra no banco) é iniciar um fluxo de criação/redefinição via link que cria uma sessão de recovery e então /change-password consegue setar a nova senha.

Estratégia de correção (sem “gambiarra de banco”)
1) Manter o auto-login (email/email) quando password_changed=false:
   - Se funcionar: redireciona para /change-password?redirect=...
2) Se o auto-login falhar:
   - Em vez de jogar para /forgot-password, vamos iniciar automaticamente um “link de criar senha” (resetPasswordForEmail) e:
     - Mostrar um “Primeiro acesso – crie sua senha” (tela/estado dentro do modal/página de login), sem mencionar “esqueceu senha”.
     - O link enviado por email deve redirecionar para /change-password (ou variante) para o usuário cadastrar a senha e então seguir para o redirect.
   - Resultado: o usuário não cai na página de “esqueceu senha” e ainda chega na página “cadastrar senha” do jeito certo (após clicar no link).

3) Robustez de detecção do email:
   - Atualizar a função check_profile_exists para normalizar (trim + lower) internamente antes de comparar, evitando casos de email com espaços/casing que causam falso “não encontrado”.

Mudanças no backend (banco de dados)
A) Atualizar a RPC public.check_profile_exists(check_email text)
- Ajustes:
  - Normalizar: check_email := lower(trim(check_email))
  - Rodar validações e comparação usando o valor normalizado
- Observação de segurança:
  - Não criar policy “USING (true)” em profiles. Isso seria permissivo demais.
  - A função já é SECURITY DEFINER e é a forma correta de expor somente “existe/não existe” e o flag password_changed.

Mudanças no frontend (fluxo)
B) Home (modal de autenticação)
Arquivo: src/components/HomeAuthModal.tsx
- Alterar o bloco do primeiro acesso:
  - Hoje: se auto-login falha -> redirect /forgot-password
  - Novo: se auto-login falha -> chamar resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/change-password?redirect=/` }) e então:
    - Exibir estado de “Email enviado para criar senha” (dentro do modal)
    - Incluir botão “Já abri o email” (fecha modal) e texto curto orientando o usuário
- Garantir que o texto/UX não use “Esqueceu senha”, e sim “Criar senha / Primeiro acesso”.

C) Página de login padrão (/login)
Arquivo: src/pages/UserLogin.tsx
- No fluxo exists && !password_changed:
  - Se auto-login falhar:
    - Trocar “showFirstAccessModal (só instrução)” por uma ação clara:
      - botão “Enviar link para criar senha”
      - ao clicar: resetPasswordForEmail com redirectTo apontando para /change-password?redirect=${redirectTo}
      - mostrar confirmação de envio (sem encaminhar para /forgot-password)
- Opcional: se você quiser fluxo 100% automático, pode disparar o envio do link imediatamente ao falhar (sem depender do clique), mas manter o botão “Reenviar” e feedback.

D) Login Artes e Músicos
Arquivos:
- src/pages/UserLoginArtes.tsx
- src/pages/UserLoginArtesMusicos.tsx
- Hoje: no auto-login fail -> toast erro
- Novo:
  - No auto-login fail:
    - disparar resetPasswordForEmail com redirectTo apontando para:
      - /change-password-artes?redirect=${redirectTo}
      - /change-password-artes-musicos?redirect=${redirectTo}
    - mostrar UI/alert de “Link enviado para criar sua senha”
    - sem mandar para /forgot-password-*

E) Garantir que /change-password lide bem com usuário não autenticado
Arquivo: src/pages/ChangePassword.tsx
- Hoje ele não checa sessão antes; se a pessoa cair ali sem sessão, pode gerar erro/confusão.
- Ajustar para seguir o padrão do ChangePasswordArtes:
  - checar session no mount
  - se não tiver session: redirecionar para /login?redirect=...
- Isso evita que alguém caia “seco” no /change-password e fique preso.

F) RedirectTo: parar de hardcode de domínio em fluxos de senha (qualidade)
Arquivos:
- src/pages/ForgotPassword.tsx (e variantes Artes/Músicos, se aplicável)
- Trocar redirectTo hardcoded para `${window.location.origin}/reset-password...` quando fizer sentido.
- Mesmo que a gente passe a não usar /forgot-password no primeiro acesso, isso previne bugs em preview/produção.

Detalhes técnicos (como ficará o fluxo)
- Primeiro acesso (normal):
  1) Email existe e password_changed=false
  2) signInWithPassword(email, email) funciona
  3) redirect /change-password?redirect=...
  4) usuário cria senha, password_changed vira true, segue

- Primeiro acesso (auto-login falha):
  1) Email existe e password_changed=false
  2) signInWithPassword(email, email) falha
  3) app dispara resetPasswordForEmail com redirectTo=/change-password?redirect=...
  4) usuário abre email e clica no link
  5) entra em sessão de recovery, abre /change-password e define senha
  6) segue para redirect, sem passar por “esqueceu senha”

Checklist de testes (end-to-end)
1) Conta recém-criada via admin/webhook (senha = email, password_changed=false):
   - Email check -> auto-login -> /change-password -> salvar -> login ok
2) Conta “quebrada” (password_changed=false, mas senha não é email):
   - Email check -> auto-login falha -> “link enviado” -> clicar link no email -> /change-password -> salvar -> login ok
3) Email inexistente:
   - cair no signup/fluxo de criar conta como hoje
4) Acessar /change-password direto sem sessão:
   - deve redirecionar para /login com mensagem adequada
5) Repetir em /login-artes e /login-artes-musicos:
   - mesmos cenários acima, com rotas change-password-* corretas

Arquivos que serão alterados (resumo)
- Backend (migração SQL): função public.check_profile_exists
- Frontend:
  - src/components/HomeAuthModal.tsx
  - src/pages/UserLogin.tsx
  - src/pages/UserLoginArtes.tsx
  - src/pages/UserLoginArtesMusicos.tsx
  - src/pages/ChangePassword.tsx
  - (Opcional hardening) src/pages/ForgotPassword*.tsx para redirectTo via window.location.origin

Riscos e como vamos mitigar
- “Não quero email”: tecnicamente, sem sessão autenticada, não dá para setar senha diretamente na tela /change-password. O único caminho seguro é criar sessão de recovery via link.
  - Mitigação: deixar o envio do link transparente e com wording “Criar senha / Primeiro acesso”, sem “Esqueci minha senha”.
- Traduções/strings: adicionar chaves novas (i18n) ou usar fallback strings onde necessário.

Critério de sucesso
- Nenhum caso de primeiro acesso redireciona para /forgot-password.
- Usuários com password_changed=false sempre acabam em /change-password (via auto-login ou via link) e conseguem setar senha e entrar na plataforma.