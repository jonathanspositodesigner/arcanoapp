
# Plano: Prévia de Email + Mover Monitor para Sidebar

## Resumo

Duas alterações solicitadas:
1. **Prévia do email**: Ao clicar em um email enviado na tabela, mostrar um modal com a prévia HTML do email recebido
2. **Mover para sidebar**: Retirar o monitor da home e adicionar como item na barra lateral

---

## Mudanças no Banco de Dados

### Nova coluna `email_content`

A tabela `welcome_email_logs` atualmente não armazena o HTML do email enviado. Preciso adicionar:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `email_content` | `TEXT` | HTML completo do email enviado |

```sql
ALTER TABLE welcome_email_logs 
ADD COLUMN IF NOT EXISTS email_content TEXT;
```

---

## Arquivos a Modificar

### 1. `supabase/functions/resend-pending-emails/index.ts`

Salvar o HTML gerado na nova coluna `email_content`:

```typescript
await supabaseAdmin.from("welcome_email_logs").insert({
  // ... campos existentes
  email_content: emailHtml, // ← NOVO: salvar HTML
});
```

### 2. `supabase/functions/webhook-greenn-artes/index.ts` (e outros webhooks)

Também precisam salvar o conteúdo do email para compras novas.

### 3. `src/components/AdminHubSidebar.tsx`

Adicionar novo item no menu:

```typescript
{
  id: "emails" as const,
  label: "EMAILS DE BOAS-VINDAS",
  icon: Mail,
  description: "Monitoramento de envios"
}
```

Atualizar o tipo `HubViewType`:

```typescript
export type HubViewType = "home" | "dashboard" | "marketing" | "email-marketing" | 
                          "push-notifications" | "partners" | "abandoned-checkouts" | 
                          "admins" | "emails"; // ← NOVO
```

### 4. `src/pages/AdminHub.tsx`

**Remover** o `WelcomeEmailsMonitor` da view "home":

```tsx
case "home":
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* REMOVIDO: WelcomeEmailsMonitor */}
      
      {/* Platform Selection */}
      <div className="text-center">...
```

**Adicionar** case para a nova view:

```tsx
case "emails":
  return <WelcomeEmailsMonitor />;
```

### 5. `src/components/WelcomeEmailsMonitor.tsx`

Adicionar funcionalidade de prévia:

**Novos estados:**
```typescript
const [selectedEmail, setSelectedEmail] = useState<PurchaseEmailStatus | null>(null);
const [emailContent, setEmailContent] = useState<string | null>(null);
const [isLoadingContent, setIsLoadingContent] = useState(false);
```

**Atualizar query para buscar `email_content`:**
```typescript
const { data: emailLogs } = await supabase
  .from('welcome_email_logs')
  .select('email, platform, status, sent_at, error_message, email_content') // ← adicionar
```

**Handler de clique na linha:**
```typescript
const handleEmailClick = async (purchase: PurchaseEmailStatus) => {
  if (purchase.email_status !== 'sent') return;
  
  setSelectedEmail(purchase);
  setIsLoadingContent(true);
  
  // Buscar conteúdo do email
  const { data } = await supabase
    .from('welcome_email_logs')
    .select('email_content')
    .eq('email', purchase.email.toLowerCase())
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  setEmailContent(data?.email_content || null);
  setIsLoadingContent(false);
};
```

**Modal de prévia:**
```tsx
<Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
  <DialogContent className="max-w-4xl max-h-[90vh]">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <Mail className="h-5 w-5" />
        Prévia do Email Enviado
      </DialogTitle>
      <DialogDescription>
        Enviado para: {selectedEmail?.email}
      </DialogDescription>
    </DialogHeader>
    
    <div className="border rounded-lg overflow-hidden bg-white">
      {isLoadingContent ? (
        <div className="p-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      ) : emailContent ? (
        <iframe 
          srcDoc={emailContent}
          className="w-full h-[500px] border-0"
          title="Prévia do email"
        />
      ) : (
        <div className="p-8 text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>Conteúdo do email não disponível</p>
          <p className="text-sm mt-1">
            Emails enviados antes desta atualização não têm o conteúdo salvo.
          </p>
        </div>
      )}
    </div>
  </DialogContent>
</Dialog>
```

**Tornar linha clicável (apenas para enviados):**
```tsx
<tr 
  key={purchase.id} 
  className={cn(
    "hover:bg-muted/30",
    purchase.email_status === 'sent' && "cursor-pointer hover:bg-muted/50"
  )}
  onClick={() => handleEmailClick(purchase)}
>
```

---

## Fluxo Visual

```text
+------------------------------------------+
|           BARRA LATERAL                   |
+------------------------------------------+
| HOME                                      |
| DASHBOARD GERAL                           |
| MARKETING GERAL                           |
| GERENCIAR PARCEIROS                       |
| REMARKETING                               |
| ADMINISTRADORES                           |
| ▶ EMAILS DE BOAS-VINDAS  ← NOVO          |
+------------------------------------------+
```

Ao clicar em "EMAILS DE BOAS-VINDAS", o monitor aparece na área de conteúdo.

---

## Modal de Prévia (Wireframe)

```text
+--------------------------------------------------+
|  ✉️ Prévia do Email Enviado              [X]     |
|  Enviado para: cliente@email.com                 |
+--------------------------------------------------+
|                                                  |
|   +------------------------------------------+   |
|   |                                          |   |
|   |   🤖 ¡Tu Herramienta de IA está         |   |
|   |         Activada!                        |   |
|   |                                          |   |
|   |   Hola Cliente!                          |   |
|   |   Tu compra fue confirmada...            |   |
|   |                                          |   |
|   |   📋 Datos de acceso:                    |   |
|   |   Email: cliente@email.com               |   |
|   |   Contraseña: cliente@email.com          |   |
|   |                                          |   |
|   |   [🚀 Acceder Ahora]                     |   |
|   |                                          |   |
|   +------------------------------------------+   |
|                                                  |
+--------------------------------------------------+
```

---

## Resumo de Arquivos

| Arquivo | Ação |
|---------|------|
| `welcome_email_logs` (DB) | Adicionar coluna `email_content` |
| `resend-pending-emails/index.ts` | Salvar `email_content` ao enviar |
| `webhook-greenn-artes/index.ts` | Salvar `email_content` ao enviar |
| `webhook-greenn-musicos/index.ts` | Salvar `email_content` ao enviar |
| `webhook-hotmart-artes/index.ts` | Salvar `email_content` ao enviar |
| `AdminHubSidebar.tsx` | Adicionar item "EMAILS DE BOAS-VINDAS" |
| `AdminHub.tsx` | Remover monitor da home, adicionar case "emails" |
| `WelcomeEmailsMonitor.tsx` | Adicionar modal de prévia e handler de clique |

---

## Resultado Esperado

1. O monitor de emails fica acessível pela sidebar (não mais na home)
2. Ao clicar em um email ENVIADO, abre um modal com a prévia do HTML
3. Emails antigos (sem `email_content`) mostram mensagem informativa
4. Novos emails terão o conteúdo salvo automaticamente
