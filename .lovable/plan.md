

## Resumo do que entendi

Você quer 3 mudanças:

### 1. Novo card "Upscaler Arcano Vitalício" na Home
- **Visível apenas** para quem comprou o Upscaler Arcano (pack_slug `upscaller-arcano` em `user_pack_purchases`)
- Aparece na seção "Suas Compras" com visual verde (PurchasedCard)
- Oculto para todos os outros usuários
- Ao clicar, leva direto para `/ferramenta-ia-artes/upscaller-arcano/v2`

### 2. Ferramentas de IA — mudar regra de acesso
- Ter o pack `upscaller-arcano` **não** dá mais acesso ao card "Ferramentas de IA" na home
- Acesso às ferramentas de IA só para quem:
  - Tem créditos **comprados** (lifetime > 0), ou
  - Tem plano Planos2 pago
- Créditos mensais de conta free **não contam**

### 3. Página UpscalerArcanoV2 — layout standalone
- Remover menu lateral (AppSidebar) e menu superior (AppTopBar) desta página
- Manter apenas o conteúdo central (videoaulas)
- Adicionar botão "Voltar para Home" e botão "Login/Minha Conta"

---

## Plano técnico

### Arquivo: `src/pages/Index.tsx`

**Card do Upscaler Vitalício:**
- Detectar `hasUpscalerPack = userPacks.some(p => p.pack_slug === 'upscaller-arcano')`
- Criar um card adicional com id `upscaler-vitalicio`, imagem do Upscaler, rota `/ferramenta-ia-artes/upscaller-arcano/v2`
- Inserir no array `purchasedCards` quando `hasUpscalerPack` é true

**Regra de acesso Ferramentas de IA:**
- Alterar `hasToolAccess` para excluir `upscaller-arcano` dos TOOL_SLUGS que concedem acesso
- Mudar a condição de créditos: usar `creditsBreakdown.lifetime > 0` em vez de `creditsBreakdown.total > 0` (ignora créditos mensais free)

### Arquivo: `src/pages/UpscalerArcanoV2.tsx`

- Remover o wrapper `AppLayout` (se usado) ou garantir que a página renderize sem sidebar/topbar
- Adicionar header mínimo com:
  - Botão "← Voltar para Home" (`navigate('/')`)
  - Botão "Login" (se não logado) ou "Minha Conta" (se logado)
- Manter todo o conteúdo central das videoaulas

