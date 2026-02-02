
# Plano: Corrigir Sistema de Emails Hotmart + Reenvio

## Problemas Identificados

### 1. Template Faltando
**Causa raiz do erro de reenvio**
```
⚠️ Template não encontrado para ferramentas_ia/es
```
A tabela `welcome_email_templates` não tem um registro para `platform='ferramentas_ia'` + `locale='es'`.

### 2. Incompatibilidade de Formato
- **Webhook Hotmart**: Usa HTML hardcoded com template literals (`${name}`)
- **Resend-pending-emails**: Espera HTML com placeholders (`{{name}}`)

### 3. Provider Diferente
- **Webhooks**: SendPulse
- **Reenvio**: Resend

Suas respostas indicam padronizar tudo em SendPulse.

---

## Solução em 3 Partes

### Parte 1: Criar Template ES para Ferramentas IA

Inserir template compatível com a nova lógica:

```sql
INSERT INTO welcome_email_templates (
  platform, locale, subject, sender_name, sender_email, 
  content, is_active
) VALUES (
  'ferramentas_ia',
  'es', 
  '🤖 ¡Bienvenido! Tu compra fue confirmada',
  'Herramientas IA Arcanas',
  'contato@voxvisual.com.br',
  -- HTML completo com placeholders {{name}}, {{email}}, {{product}}
  '<html>...</html>',
  true
);
```

### Parte 2: Atualizar `resend-pending-emails` para Usar SendPulse

Trocar de Resend para SendPulse, replicando a mesma lógica do `webhook-hotmart-artes`:

```typescript
// ANTES (Resend)
const emailResponse = await fetch("https://api.resend.com/emails", {...})

// DEPOIS (SendPulse)
const tokenResponse = await fetch("https://api.sendpulse.com/oauth/access_token", {...})
const emailResponse = await fetch("https://api.sendpulse.com/smtp/emails", {...})
```

**Também ajustar a lógica de template:**
- Para clientes NOVOS: Email com dados de acesso (senha = email)
- Para clientes ANTIGOS: Email sem senha (você escolheu "Sem senha")

### Parte 3: Implementar Deduplicação por Transação no Webhook Hotmart

Você escolheu "1 email por compra", então:

```typescript
// Antes de enviar, verificar se já enviou para esta transaction
const { data: existing } = await supabase
  .from('welcome_email_logs')
  .select('id')
  .eq('product_info', `Hotmart:${transaction}`)
  .eq('status', 'sent')
  .maybeSingle()

if (existing) {
  console.log('Email já enviado para esta transação')
  return
}
```

### Parte 4: Atualizar Monitor para Mostrar Motivo Real

O componente `WelcomeEmailsMonitor` vai mostrar:
- "Template não encontrado" quando for o caso
- "Recompra (cliente antigo)" quando aplicável
- Link para verificar logs da transação

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `welcome_email_templates` (DB) | Inserir template ES |
| `resend-pending-emails/index.ts` | Trocar Resend→SendPulse, ajustar lógica |
| `webhook-hotmart-artes/index.ts` | Adicionar dedup por transaction, usar dedup_key |
| `WelcomeEmailsMonitor.tsx` | Melhorar mensagens de erro |

---

## Resultado Esperado

1. Hotmart emails funcionarão no webhook (com dedup)
2. Botão "Reenviar" funcionará usando SendPulse
3. Clientes antigos receberão email sem senha temporária
4. Monitor mostrará motivos reais das falhas

---

## Detalhes Técnicos

### Template HTML para Hotmart ES (Clientes Novos)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: sans-serif; background: #f4f4f4; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; }
    h1 { color: #d4af37; text-align: center; }
    .cta-button { display: block; background: linear-gradient(135deg, #d4af37, #b8962e); color: white; text-align: center; padding: 16px; border-radius: 8px; text-decoration: none; margin: 20px 0; }
    .credentials { background: #fefce8; padding: 20px; border-radius: 8px; border: 1px solid #fde68a; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🤖 ¡Tu Herramienta de IA está Activada!</h1>
    <p>Hola {{name}},</p>
    <p>Tu compra de <strong>{{product}}</strong> fue confirmada. ¡Ya puedes usar tu herramienta!</p>
    <div class="credentials">
      <h3>📋 Datos de acceso:</h3>
      <p><strong>Email:</strong> {{email}}</p>
      <p><strong>Contraseña temporal:</strong> {{email}}</p>
      <p>⚠️ Por seguridad, deberás cambiar tu contraseña en el primer acceso.</p>
    </div>
    <a href="https://arcanoapp.voxvisual.com.br/ferramentas-ia-es" class="cta-button">🚀 Acceder Ahora</a>
  </div>
</body>
</html>
```

### Template HTML para Clientes Antigos (Sem Senha)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>...</style>
</head>
<body>
  <div class="container">
    <h1>🎉 ¡Compra Confirmada!</h1>
    <p>Hola {{name}},</p>
    <p>Tu compra de <strong>{{product}}</strong> fue confirmada exitosamente.</p>
    <p>Ya tienes acceso en tu cuenta. Usa tu email y contraseña actuales para ingresar.</p>
    <a href="https://arcanoapp.voxvisual.com.br/ferramentas-ia-es" class="cta-button">🚀 Acceder Ahora</a>
    <p style="text-align:center;color:#666;font-size:13px;">¿Olvidaste tu contraseña? <a href="https://arcanoapp.voxvisual.com.br/forgot-password">Recuperar aquí</a></p>
  </div>
</body>
</html>
```

### Estrutura da Função de Reenvio Atualizada

```typescript
// resend-pending-emails/index.ts

// 1. Detectar se é cliente novo ou antigo
const isNewUser = await checkIfNewUser(supabase, customer.email)

// 2. Buscar template correto
const templateSuffix = isNewUser ? '' : '_returning'
const { data: template } = await supabase
  .from('welcome_email_templates')
  .select('*')
  .eq('platform', templateConfig.platform)
  .eq('locale', templateConfig.locale)
  .eq('is_active', true)
  .maybeSingle()

// 3. Substituir placeholders
let html = template.content
  .replace(/\{\{name\}\}/g, customer.name)
  .replace(/\{\{email\}\}/g, customer.email)
  .replace(/\{\{product\}\}/g, productName)

// 4. Se cliente antigo, remover seção de credenciais
if (!isNewUser) {
  html = removeCredentialsSection(html)
}

// 5. Enviar via SendPulse
const token = await getSendPulseToken()
await sendViaSendPulse(token, customer.email, template.subject, html)
```
