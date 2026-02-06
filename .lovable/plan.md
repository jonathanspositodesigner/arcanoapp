
## Objetivo (sem mexer em mais nada do que o necessário)
Fazer o aviso aparecer **sempre que qualquer ação tentar sair da página enquanto um job de IA estiver em andamento** — incluindo o botão **Voltar** do header (que hoje está escapando).

Vou fazer isso com **uma única alteração** (1 arquivo): `src/hooks/useNavigationGuard.ts`.

---

## O que está acontecendo (causa exata)
Hoje o `useNavigationGuard` só intercepta:
- `navigator.push(...)`
- `navigator.replace(...)`

Mas o botão “Voltar” que você usa nas ferramentas vem do `useSmartBackNavigation()` e chama:
- `navigate(-1)` → internamente vira `navigator.go(-1)`

Como `go(-1)` **não está interceptado**, ele volta direto sem mostrar o modal.

Além disso, o `shouldBlock` está bloqueando só quando o status global está em `starting`/`running`. Se no momento do clique ainda estiver `pending` (ou `queued`), também pode passar sem aviso.

---

## Mudança mínima que vou aplicar (1 arquivo)
### Arquivo: `src/hooks/useNavigationGuard.ts`

1) **Bloquear também em `pending` e `queued`**
- Ajustar `shouldBlock` para bloquear em qualquer status “ativo” do contexto global (pending/queued/starting/running), em vez de apenas starting/running.
- Isso garante que o aviso apareça assim que o job é registrado (antes mesmo de virar “running”).

2) **Interceptar o “voltar” de verdade**
Além de `push`/`replace`, também interceptar:
- `navigator.go` (pega `navigate(-1)` e `navigate(1)`)
- `navigator.back` e `navigator.forward` (se existirem)

O comportamento será:
- Se `shouldBlock` estiver ativo e alguém chamar `go/back/forward/push/replace`, a navegação **não acontece**.
- Abre o modal.
- Se clicar “Sair e Perder Créditos”, executa a navegação pendente.
- Se clicar “Continuar Esperando”, cancela e fica na página.

3) **Garantia anti-quebra**
- Manter o mesmo padrão que já está funcionando (o “monkey patch” do navigator).
- Restaurar todos os métodos originais no cleanup do `useEffect`, para não “contaminar” o app depois que o job terminar.

---

## Testes que vou fazer (pra garantir que não quebra mais nada)
### Cenário principal (Upscaler)
1. Entrar no Upscaler
2. Iniciar um job (ficar em pending/queued/starting/running)
3. Clicar:
   - Botão **Voltar** do header
   - Botão **Home** do header
   - Qualquer botão que navegue para outra rota
4. Confirmar que:
   - O modal aparece sempre
   - “Continuar esperando” não navega
   - “Sair e perder créditos” navega

### Outras ferramentas
Repetir o teste rápido em:
- Pose Changer
- Veste AI
- Video Upscaler

### Pós-job
- Quando o job terminar (completed/failed/cancelled), confirmar que a navegação volta ao normal (sem modal).

---

## Resultado esperado
- Você não consegue mais “escapar” do aviso clicando no **Voltar** (nem em nenhum botão de navegação) enquanto o job estiver em andamento.
- O comportamento fica consistente em todas as ferramentas que usam o header e o contexto global.

---

## Escopo (pra respeitar seu pedido)
- Vou mexer **somente** em: `src/hooks/useNavigationGuard.ts`
- Não vou alterar layout, páginas, banco, nem fluxo de job.
