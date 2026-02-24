

## Sistema de Indique e Ganhe - Implementacao com dominio correto

O link de referral vai usar o dominio de producao: `https://arcanoapp.voxvisual.com.br/?ref=CODIGO`

---

### Resumo simples

1. Cada usuario logado ganha um link unico: `https://arcanoapp.voxvisual.com.br/?ref=abc123`
2. Quem se cadastra pelo link ganha **300 creditos vitalicios**
3. Quem indicou ganha **150 creditos vitalicios**
4. Botao "Indique e Ganhe" aparece no menu lateral, abaixo de "Grupo do WhatsApp"
5. Modal explica como funciona + botao de copiar o link

---

### Detalhes tecnicos

#### 1. Migracao SQL (banco de dados)

**Tabela `referral_codes`**
- `id` uuid PK
- `user_id` uuid UNIQUE (referencia profiles)
- `code` text UNIQUE (8 caracteres)
- `created_at` timestamptz

**Tabela `referrals`**
- `id` uuid PK
- `referrer_id` uuid (quem indicou)
- `referred_id` uuid UNIQUE (quem se cadastrou - so pode ser indicado 1 vez)
- `referral_code` text
- `credits_given_referrer` integer (150)
- `credits_given_referred` integer (300)
- `created_at` timestamptz

**RPC `get_or_create_referral_code(p_user_id uuid)`**
- Retorna o codigo existente ou gera um novo (8 chars alfanumericos)
- Seguranca: usuario so pode gerar/ver seu proprio codigo

**RPC `process_referral(p_referred_user_id uuid, p_referral_code text)`**
- Valida que o codigo existe
- Valida que o usuario nao ja foi referido
- Valida que nao e auto-referral
- Adiciona 300 creditos vitalicios ao novo usuario
- Adiciona 150 creditos vitalicios ao indicador
- Registra na tabela `referrals`
- Usa advisory lock para evitar duplicatas

**RLS**: usuarios so leem seus proprios registros

#### 2. Frontend

| Arquivo | Acao |
|---------|------|
| `src/components/ReferralModal.tsx` | NOVO - modal com explicacao + botao copiar link usando `https://arcanoapp.voxvisual.com.br/?ref=CODIGO` |
| `src/components/layout/AppSidebar.tsx` | Adicionar botao "Indique e Ganhe" com icone Gift abaixo de "Grupo do WhatsApp" (so para logados) |
| `src/hooks/useUnifiedAuth.ts` | Apos signup com sucesso, verificar localStorage por referral code e chamar `process_referral` |
| `src/pages/Index.tsx` | Capturar `?ref=CODIGO` da URL e salvar no localStorage |
| `src/components/HomeAuthModal.tsx` | Capturar `?ref=CODIGO` da URL e salvar no localStorage (para signup via modal) |

#### 3. Dominio do link de referral

O link sempre sera gerado com o dominio de producao oficial:

```
https://arcanoapp.voxvisual.com.br/?ref=abc123
```

Nunca usara `lovable.app` ou `window.location.origin`. O dominio e hardcoded como constante.

