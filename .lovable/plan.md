
## Mudar "Forcar Update Global" para enviar Push Notification

### O que muda

O botao "Forcar Update Global" no AdminHub vai passar a enviar uma notificacao push para TODOS os dispositivos inscritos, com titulo e mensagem de atualizacao e um link que forca o reload sem cache.

### Como funciona

1. Admin clica "Forcar Update Global"
2. O app chama a edge function `send-push-notification` (que ja existe e funciona) com:
   - **Titulo**: "Atualizacao Disponivel"
   - **Mensagem**: "Uma nova versao do ArcanoApp esta disponivel. Toque para atualizar."
   - **URL**: `/force-update` (o push-handler.js ja trata esse link especial, abrindo nova janela com cache-buster)
3. A notificacao chega no celular do usuario
4. Ao clicar, o push-handler.js detecta `/force-update` na URL e abre uma nova janela com `?force=timestamp&hard=1`, quebrando o cache

### Mudancas tecnicas

#### 1. `src/pages/AdminHub.tsx` - Botao `handleForceUpdate`

Reescrever a funcao `handleForceUpdate` para:
- Chamar `supabase.functions.invoke("send-push-notification", { body: { title, body, url } })` em vez de atualizar `app_settings`
- Titulo: "Atualizacao Disponivel"
- Body: "Uma nova versao do ArcanoApp esta disponivel. Toque para atualizar."
- URL: `/force-update`
- Mostrar toast com quantos dispositivos receberam

### O que NAO muda

- Edge function `send-push-notification` (ja funciona perfeitamente)
- `public/push-handler.js` (ja trata `/force-update` com cache-buster)
- `PushNotificationsContent.tsx` (painel de push continua igual)
- `ForceUpdateModal.tsx` e `UpdateAvailableModal.tsx` (continuam existindo como fallback)
- Nenhuma tabela, nenhuma migration, nenhuma edge function nova
