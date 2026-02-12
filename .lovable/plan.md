

## Forçar Update via botão admin + detecção automática no app

### Como vai funcionar

1. Voce clica em **"Forçar Update"** no AdminHub
2. O botao incrementa a versao no banco de dados (tabela `app_settings`, registro `app_version`) e salva um timestamp `force_update_at`
3. Quando qualquer usuario abrir o app (pagina inicial), o `ForceUpdateModal` compara a versao do banco com o `APP_VERSION` do codigo
4. Se forem diferentes, aparece um modal bonito dizendo "Nova versao disponivel!"
5. O usuario clica em "Atualizar" e o app limpa cache, remove Service Workers e recarrega

### Mudancas tecnicas

#### 1. Atualizar o registro `app_version` no `app_settings`
O registro ja existe no banco. Vamos padronizar o formato do `value` para incluir `latest_version` e `force_update_at`:

```text
{
  "latest_version": "5.3.0",
  "force_update_at": "2026-02-12T..."
}
```

Isso sera feito via data update (INSERT tool), nao migration.

#### 2. Atualizar `AdminHub.tsx` - botao "Forçar Update"
O botao deixa de enviar push notification e passa a:
- Buscar a versao atual do `app_settings`
- Incrementar o patch version (ex: 5.3.0 -> 5.3.1)
- Salvar nova versao + timestamp no banco
- Mostrar toast de confirmacao com a nova versao

#### 3. Reativar `ForceUpdateModal.tsx`
- Criar hook inline que consulta `app_settings` onde `id = 'app_version'`
- Comparar `latest_version` do banco com `APP_VERSION` hardcoded no codigo
- Se forem diferentes, renderizar o modal de atualizacao
- O modal tera botao "Atualizar Agora" e botao "Depois"

#### 4. Criar `UpdateAvailableModal.tsx`
- Modal com design escuro (estilo do app)
- Icone de refresh, titulo "Nova versao disponivel!"
- Texto explicando que ha uma atualizacao
- Botao "Atualizar Agora" que executa a limpeza de cache e hard reload (mesma logica do `ForceUpdate.tsx`)
- Botao "Depois" que fecha o modal (volta a aparecer no proximo reload)

#### 5. Logica de atualizacao (performUpdate)
Reutiliza a logica ja existente no `ForceUpdate.tsx`:
- Limpa localStorage e sessionStorage
- Deleta todos os caches do browser
- Desregistra todos os Service Workers
- Hard reload com cache-busting

#### 6. Integrar no App
O `ForceUpdateModal` ja esta importado no `App.tsx` (precisa confirmar). Se nao, adicionar no layout principal para rodar em todas as paginas.

### Fluxo completo

```text
Admin clica "Forçar Update"
        |
        v
Incrementa versao no banco (5.3.0 -> 5.3.1)
        |
        v
Usuario abre o app
        |
        v
ForceUpdateModal consulta banco
        |
        v
5.3.0 (codigo) != 5.3.1 (banco) -> mostra modal
        |
        v
Usuario clica "Atualizar"
        |
        v
Limpa cache + SW + hard reload
```

### Importante
- O `APP_VERSION` no codigo NAO precisa ser atualizado manualmente. A comparacao e feita contra o banco. Quando voce publicar uma nova versao do codigo, voce pode clicar "Forçar Update" de novo para que os usuarios que ainda estao na versao antiga recebam o aviso.
- O botao de push notification sera substituido por essa logica mais simples e confiavel.

