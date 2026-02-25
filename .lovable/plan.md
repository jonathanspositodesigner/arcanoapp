
# Adicionar Editar/Excluir nos Novos Assinantes (Planos 2)

## Resumo
Adicionar botoes de editar e excluir na tabela de assinantes novos (Planos 2), com modais similares aos da aba "Assinantes Antigos", mas com os 4 planos pagos (Starter, Pro, Ultimate, IA Unlimited) no seletor de plano.

## O que sera feito

### 1. Migracoes SQL - Novas policies RLS
Atualmente a tabela `planos2_subscriptions` so tem policy de SELECT para admins. Precisa de UPDATE e DELETE:

```sql
CREATE POLICY "Admins can update subscriptions"
ON planos2_subscriptions FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete subscriptions"
ON planos2_subscriptions FOR DELETE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert subscriptions"
ON planos2_subscriptions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));
```

### 2. Modificar AdminPlanos2SubscribersTab.tsx
Adicionar toda a funcionalidade de CRUD no componente:

**Estado novo:**
- Modais: isEditModalOpen, isDeleteModalOpen, isCreateModalOpen
- selectedUser para o usuario sendo editado/deletado
- Campos do formulario: formEmail, formName, formPhone, formPlanSlug, formIsActive, formExpiresInDays, formGreennProductId, formGreennContractId, formCostMultiplier, formCreditsPerMonth
- isSubmitting, isResettingPassword

**Coluna "Acoes" na tabela:**
- Botao de WhatsApp (se tiver telefone)
- Botao de Editar (abre modal)
- Botao de Excluir (abre modal de confirmacao)

**Modal de Editar:**
- Email (desabilitado)
- Nome
- Telefone/WhatsApp
- Plano (dropdown com: Starter, Pro, Ultimate, IA Unlimited) -- sem Free, pois nao faz sentido atribuir manualmente
- Expira em (dias a partir de hoje)
- Toggle Ativo
- Greenn Product ID (opcional)
- Greenn Contract ID (opcional)
- Botao "Redefinir Primeira Senha" (reutiliza a mesma logica existente)
- Salvar: faz UPDATE em planos2_subscriptions + upsert no profiles

**Modal de Excluir:**
- Confirmacao com nome/email
- DELETE na planos2_subscriptions

**Botao "Novo Usuario":**
- Formulario similar ao de editar
- Busca ou cria usuario por email (via edge function existente ou direto)
- INSERT na planos2_subscriptions

**Opcoes de plano no seletor (novos planos apenas):**
- starter = "Starter"
- pro = "Pro"
- ultimate = "Ultimate"
- unlimited = "IA Unlimited"

### 3. Creditos por plano (preenchimento automatico)
Ao selecionar o plano no modal, os creditos mensais serao preenchidos automaticamente:
- Starter: 600
- Pro: 1500
- Ultimate: 6000
- Unlimited: 999999

### 4. Detalhes tecnicos
- O componente AdminPlanos2SubscribersTab.tsx sera significativamente expandido
- Nenhum outro arquivo precisa ser modificado
- A edge function `create-premium-user` existente sera reutilizada para criar usuarios (ou uma abordagem direta se necessario)
