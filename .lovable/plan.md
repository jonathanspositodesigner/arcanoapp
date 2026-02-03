
Objetivo (o que vai mudar de verdade)
- Quando o usuário existe e `password_changed = false` (primeiro acesso), ele deve cair no fluxo de “cadastrar nova senha” (/change-password ou variantes) e nunca ser jogado para “Esqueci minha senha”.
- Se o login automático (email = senha temporária) falhar, o sistema pode até precisar mandar um link por email (isso é inevitável sem sessão), mas:
  1) a UX não pode parecer “recuperação de senha”
  2) o usuário deve ser direcionado para a tela de “cadastrar senha” imediatamente, com uma tela/estado “Aguardando link no email” dentro do /change-password (sem redirecionar para /forgot-password)

Diagnóstico do que está acontecendo agora (com base no código)
1) O comportamento “Enviamos um link para criar sua senha…” é disparado quando:
   - `check_profile_exists` retorna exists=true e password_changed=false
   - o auto-login `signInWithPassword(email, email)` falha
   - então o frontend chama `resetPasswordForEmail(...)` e mostra toast de “link enviado”
   Isso está correto tecnicamente, mas a experiência está “parecendo forgot password”.

2) Existe um segundo problema real no app: páginas de “primeiro acesso” fora do login principal ainda estão desatualizadas:
   - `src/pages/BibliotecaArtes.tsx` e `src/pages/FerramentasIA.tsx`/`FerramentasIAES.tsx`
   - Nelas, quando o auto-login falha, hoje elas mandam o usuário para `/login-artes` ou só dão erro, em vez de iniciar o fluxo de criar senha por link e direcionar corretamente.

3) No banco (ambiente de teste), o perfil do email `aliados.sj@gmail.com` existe com `password_changed=false`. A função `check_profile_exists` também está correta e normalizando com `lower(trim(...))`.
   - Então o “Email não encontrado” visto no print provavelmente veio de um fluxo específico (BibliotecaArtes) e/ou de ambiente diferente (Preview x Publicado). Vamos deixar isso robusto em todos os pontos de entrada, e também melhorar a UX para eliminar a confusão.

Decisão técnica importante (sem “gambiarra”)
- Não existe como “cair no /change-password e já trocar a senha” quando o auto-login falha, porque **sem sessão não dá** para chamar `updateUser` de forma segura.
- O caminho correto é:
  - enviar link seguro (recovery) que cria uma sessão
  - depois que o usuário clica, ele chega no /change-password já autenticado e consegue definir senha

Ajuste que vai te entregar o que você pediu na prática
- Após falhar o auto-login, nós vamos:
  1) enviar o link de criação de senha (recovery)
  2) navegar imediatamente para `/change-password?...` (ou variante) com um parâmetro `sent=1&email=...`
  3) a página `/change-password` (ou variante) vai mostrar uma tela “Primeiro acesso: verifique seu email para cadastrar sua senha” enquanto não houver sessão
  4) quando o usuário clicar no link do email, ele volta para `/change-password` (sem `sent=1`), agora com sessão, e aí aparece o formulário de cadastrar senha

Plano de implementação (frontend)
1) Criar um helper único para “primeiro acesso”
   - Novo util/hook (ex.: `src/lib/firstAccess.ts`) para centralizar:
     - normalização de email (`trim().toLowerCase()`)
     - tentativa de auto-login `signInWithPassword(email,email)`
     - fallback: `resetPasswordForEmail(email, { redirectTo: origin + changePasswordRoute + '?redirect=...' })`
     - retorno de status (`AUTOLOGIN_OK`, `LINK_SENT`, `EMAIL_NOT_FOUND`, `ERROR`)
   Benefício: para de existir comportamento diferente entre Home, /login, Biblioteca, Ferramentas.

2) Ajustar TODOS os pontos de entrada que checam `check_profile_exists`
   2.1) Home modal (rota “/”)
   - Arquivo: `src/components/HomeAuthModal.tsx`
   - Mudança: quando auto-login falhar e link for enviado:
     - em vez de só fechar o modal + toast, redirecionar para:
       `/change-password?redirect=/&sent=1&email=<email>`
     - e manter wording “Primeiro acesso / Criar senha” (sem “recuperar”)

   2.2) Login padrão
   - Arquivo: `src/pages/UserLogin.tsx`
   - Mudança: no fallback de auto-login falho:
     - após enviar link, navegar para:
       `/change-password?redirect=<redirectTo>&sent=1&email=<email>`

   2.3) Login Artes e Login Músicos
   - Arquivos:
     - `src/pages/UserLoginArtes.tsx`
     - `src/pages/UserLoginArtesMusicos.tsx`
   - Mudança: após enviar link:
     - Artes: `/change-password-artes?redirect=<redirectTo>&sent=1&email=<email>`
     - Músicos: `/change-password-artes-musicos?redirect=<redirectTo>&sent=1&email=<email>`

   2.4) Biblioteca de Artes (onde está o modal do print “Comprar Pack / Email não encontrado”)
   - Arquivo: `src/pages/BibliotecaArtes.tsx`
   - Mudança crítica:
     - no bloco `profileExists && !passwordChanged`:
       - se auto-login OK: `navigate('/change-password-artes?redirect=/biblioteca-artes')`
       - se auto-login falhar: chamar `resetPasswordForEmail` com `redirectTo` apontando para `/change-password-artes?redirect=/biblioteca-artes`
       - e então `navigate('/change-password-artes?redirect=/biblioteca-artes&sent=1&email=<email>')`
     - isso remove o comportamento atual de “falhou => vai pra /login-artes”

   2.5) Ferramentas IA (e ES)
   - Arquivos:
     - `src/pages/FerramentasIA.tsx`
     - `src/pages/FerramentasIAES.tsx`
   - Mesma mudança do item acima:
     - falhou auto-login => manda link => navega para `/change-password-artes?...&sent=1&email=...`
     - usando redirect coerente (`/ferramentas-ia` ou `/ferramentas-ia-es`)

3) Transformar /change-password (e variantes) em “duas telas”: (A) aguardando link (sem sessão) e (B) cadastrar senha (com sessão)
   3.1) ChangePassword (principal)
   - Arquivo: `src/pages/ChangePassword.tsx`
   - Atualizar lógica atual que redireciona pro login quando não tem sessão:
     - Se NÃO tem sessão E `sent=1` E `email` existe:
       - NÃO redirecionar para /login
       - Mostrar tela de instrução (Card):
         - título: “Primeiro acesso: crie sua senha”
         - texto: “Enviamos um link para seu email. Clique nele para abrir esta tela e cadastrar sua senha.”
         - botões:
           - “Reenviar link” (com cooldown de 30–60s no frontend)
           - “Trocar email” (volta pro /login)
           - “Já cliquei no link” (revalida sessão: chama `getSession()` novamente)
     - Se NÃO tem sessão e NÃO tem `sent=1`:
       - mantém o hardening atual: redireciona para /login (evita cair “seco”)

   3.2) ChangePasswordArtes e ChangePasswordArtesMusicos
   - Arquivos:
     - `src/pages/ChangePasswordArtes.tsx`
     - `src/pages/ChangePasswordArtesMusicos.tsx`
   - Mesma lógica do 3.1:
     - sem sessão + `sent=1&email=...` => mostra tela de instrução
     - sem sessão sem `sent=1` => redireciona para o login respectivo

4) Ajustar textos para parar de soar “recuperação”
   - Arquivos de tradução:
     - `src/locales/pt/auth.json` (criar `success.passwordLinkSent` e mensagens específicas de “Primeiro acesso”)
     - `src/locales/pt/index.json` (criar `auth.passwordLinkSent` etc. para o modal Home)
     - `src/locales/pt/library.json` (mensagens do modal da Biblioteca: adicionar um texto de “link enviado para criar senha” se a gente decidir mostrar algo ali, ou garantir que ao falhar ele já navega pro /change-password-artes?sent=1)
   - Regra: nenhuma mensagem desse fluxo deve usar “recuperar/redefinir” (isso fica só para quando o usuário clicar explicitamente em “Esqueci minha senha”).

5) Observabilidade (para parar o “parece que tá indo pro lugar errado”)
   - Adicionar logs pontuais (console) nos handlers de primeiro acesso:
     - email normalizado
     - retorno de `check_profile_exists`
     - status: autologin ok / link enviado / email não encontrado
   - Isso facilita confirmar em qual tela o usuário estava (Home, Biblioteca, Ferramentas, /login) e qual branch foi executado.

Plano de validação (end-to-end)
1) Cenário A (ideal): usuário com `password_changed=false` e senha temporária = email
   - Resultado: entra automático e vai direto pro formulário do /change-password (com sessão)
2) Cenário B (quebrado): `password_changed=false`, mas senha no auth não é email
   - Resultado: app vai para `/change-password(...)?sent=1&email=...` mostrando instruções
   - Usuário clica no link do email
   - Volta para /change-password com sessão e define senha
3) Repetir A e B em:
   - Home modal (/)
   - /login
   - /biblioteca-artes (modal “Comprar Pack”)
   - /ferramentas-ia e /ferramentas-ia-es
   - /login-artes e /login-artes-musicos
4) Confirmar que nenhuma dessas rotas manda o usuário para /forgot-password automaticamente (somente se ele clicar por vontade própria).

Arquivos que deverão ser alterados (resumo)
- Fluxo:
  - `src/components/HomeAuthModal.tsx`
  - `src/pages/UserLogin.tsx`
  - `src/pages/UserLoginArtes.tsx`
  - `src/pages/UserLoginArtesMusicos.tsx`
  - `src/pages/BibliotecaArtes.tsx`
  - `src/pages/FerramentasIA.tsx`
  - `src/pages/FerramentasIAES.tsx`
- Telas de senha:
  - `src/pages/ChangePassword.tsx`
  - `src/pages/ChangePasswordArtes.tsx`
  - `src/pages/ChangePasswordArtesMusicos.tsx`
- Traduções:
  - `src/locales/pt/auth.json`
  - `src/locales/pt/index.json`
  - `src/locales/pt/library.json`
- (Novo) helper compartilhado:
  - `src/lib/firstAccess.ts` (ou `src/hooks/useFirstAccessFlow.ts`)

Resultado final esperado (do jeito que você descreveu)
- Usuário “primeiro acesso” sempre é levado para a “página de cadastrar senha” (mesma rota /change-password):
  - se tiver sessão (auto-login deu certo): vê o formulário imediatamente
  - se ainda não tiver sessão (auto-login falhou): vê a tela “verifique seu email” dentro do /change-password, sem aparecer “esqueceu senha” e sem jogar para /forgot-password
