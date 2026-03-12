

## Plano: Auto-reload + botão "Atualizar app" na Home

### Lógica anti-loop

Usar `sessionStorage` com flag `home_cache_cleared`. O ciclo é:

1. Pessoa abre Home → flag **não existe** → seta flag → limpa caches → `reload()`
2. Página recarrega → flag **existe** → remove flag → renderiza normalmente
3. Próxima vez que abrir o app (nova aba/sessão) → flag não existe → repete 1x

`sessionStorage` morre ao fechar a aba, então cada sessão faz no máximo 1 reload.

### Alterações em `src/pages/Index.tsx`

**1) useEffect de auto-reload** (no topo, antes dos outros effects):
- Checa `sessionStorage.getItem("home_cache_cleared")`
- Se não existe: seta flag, limpa caches SW, faz `window.location.reload()`
- Se existe: remove flag, continua renderização normal
- Estado `isReloading` controla renderização (retorna `null` enquanto recarrega)

**2) Botão "Atualizar app"** no rodapé fixo (ao lado da versão):
- Botão discreto, texto pequeno, usa `forcePwaUpdate` do `src/utils/forcePwaUpdate.ts`
- Mostra toast de feedback durante atualização

### Garantia anti-loop infinito
- `sessionStorage` é por aba e morre ao fechar
- Flag é **removida** no segundo carregamento, então mesmo se a pessoa navegar de volta à home na mesma sessão, não recarrega de novo
- Pior caso: 1 reload extra por sessão, nunca loop

