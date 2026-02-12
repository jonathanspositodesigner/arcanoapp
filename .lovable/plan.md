
## Corrigir o loop infinito do modal de atualizacao

### Problema

O botao "Forcar Update" incrementou a versao no banco para `5.3.1`, mas o `APP_VERSION` no codigo continua `5.3.0`. Como a comparacao e `dbVersion !== APP_VERSION`, o modal aparece sempre, mesmo depois de atualizar. E um loop sem saida.

### Solucao

Trocar a logica de comparacao de versao por comparacao de **timestamp**. Funciona assim:

1. O botao "Forcar Update" salva um `force_update_at` no banco (ja faz isso)
2. O app compara esse timestamp com um valor salvo no `localStorage`
3. Se o timestamp do banco for mais recente que o do localStorage (ou se nao houver nada no localStorage), mostra o modal
4. Quando o usuario clica "Atualizar Agora", salva o timestamp no localStorage ANTES de recarregar
5. No proximo reload, o timestamp ja bate e o modal nao aparece mais

### Mudancas

#### 1. Corrigir valor no banco
- Resetar `app_settings.app_version` para `latest_version: "5.3.0"` (para parar o loop imediatamente)

#### 2. Reescrever `ForceUpdateModal.tsx`
- Remover comparacao de versao (`APP_VERSION !== dbVersion`)
- Usar comparacao de timestamp: buscar `force_update_at` do banco, comparar com `localStorage.getItem('last_force_update')`
- Se `force_update_at` for mais recente, mostrar modal
- Manter export do `APP_VERSION` para outros usos

#### 3. Atualizar `UpdateAvailableModal.tsx`
- No `performUpdate()`, antes de limpar tudo, salvar o timestamp no localStorage: `localStorage.setItem('last_force_update', forceUpdateAt)`
- Isso garante que depois do reload o modal nao aparece de novo

#### 4. Atualizar `AdminHub.tsx` - botao "Forcar Update"
- Simplificar: nao precisa mais incrementar versao
- Apenas atualizar o `force_update_at` com timestamp atual no banco
- Manter o `latest_version` como informativo

### Fluxo corrigido

```text
Admin clica "Forcar Update"
        |
        v
Salva force_update_at = agora no banco
        |
        v
Usuario abre o app
        |
        v
ForceUpdateModal busca force_update_at do banco
        |
        v
Compara com localStorage.last_force_update
        |
        v
Banco mais recente? -> Mostra modal
        |
        v
Usuario clica "Atualizar"
        |
        v
Salva timestamp no localStorage -> Limpa cache -> Reload
        |
        v
Proximo load: timestamps batem -> Modal NAO aparece
```

### O que NAO muda
- Componente UpdateAvailableModal visual continua igual
- Service Worker config (skipWaiting, controllerchange) continua igual
- Nenhuma edge function alterada
- Nenhuma rota alterada
