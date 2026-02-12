

## Problema atual

O `CreditsProvider` esta DENTRO do `AppLayout`. Porem, `GerarImagemTool` e `GerarVideoTool` chamam `useCredits()` no corpo do componente, **antes** de renderizar o `AppLayout`. Resultado: o hook nao encontra o Provider e retorna o fallback com `balance: 0`, causando o modal "Sem Creditos".

```text
GerarImagemTool       <-- useCredits() chamado AQUI (sem Provider!)
  └── return <AppLayout>
        └── <CreditsProvider>   <-- Provider so existe AQUI, abaixo
```

As outras ferramentas (UpscalerArcano, VesteAI, ArcanoClonerTool, VideoUpscalerTool, PoseChangerTool, GeradorPersonagem, ProfileSettings, CreditHistory, BibliotecaPrompts, FerramentasIA) usam `useUpscalerCredits` diretamente com instancia local propria -- funcionam normalmente e **nao serao tocadas**.

## Solucao

Mover o `CreditsProvider` para o `App.tsx`, envolvendo todas as rotas. Assim `useCredits()` funciona em qualquer pagina. **Nenhuma outra ferramenta sera alterada.**

## Mudancas (apenas 2 arquivos)

### 1. App.tsx

- Criar um componente interno `CreditsWrapper` que consome `useAuth()` (ja disponivel no contexto) e passa `user?.id` para o `CreditsProvider`
- Envolver o conteudo DENTRO do `AuthProvider` com esse wrapper
- Nenhuma rota muda, nenhum import de pagina muda

```text
AuthProvider
  └── CreditsWrapper (NOVO - pega user do useAuth)
        └── CreditsProvider userId={user?.id}
              └── AIDebugProvider
                    └── ... rotas (tudo igual)
```

### 2. AppLayout.tsx

- Remover o import e o wrapping de `CreditsProvider`
- O AppLayout volta a ser apenas layout (sidebar + topbar + children)
- Como o `CreditsProvider` ja esta acima, o `AppTopBar` e o `CreditsPreviewPopover` continuam funcionando via `useCredits()` sem nenhuma mudanca

### O que NAO muda

- Nenhuma outra pagina de ferramenta (Upscaler, VesteAI, Cloner, VideoUpscaler, PoseChanger, GeradorPersonagem) -- todas usam `useUpscalerCredits` local e continuam identicas
- ProfileSettings, CreditHistory, BibliotecaPrompts, FerramentasIA -- mesma coisa, instancia local
- Nenhuma edge function, nenhuma RPC, nenhuma tabela
- AppTopBar, CreditsPreviewPopover -- ja usam `useCredits()`, continuam funcionando
- GerarImagemTool e GerarVideoTool -- ja usam `useCredits()`, so que agora o Provider vai existir acima deles

