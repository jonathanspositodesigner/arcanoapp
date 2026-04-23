
## Plano: corrigir o erro na raiz para prompt grátis não virar premium na aprovação

### Causa raiz encontrada

O erro não está no toggle do cadastro do parceiro. O upload já salva corretamente:

- `src/pages/PartnerUpload.tsx:409` → `is_premium: !media.isFree`

Ou seja:
- se marcar grátis (`isFree = true`) grava `is_premium = false`
- se marcar premium (`isFree = false`) grava `is_premium = true`

O problema real está no banco:

- `supabase/migrations/20260423014320_c117f00d-d880-444b-8796-a18903f4577a.sql`

Essa migration criou a trigger/function:

- `auto_set_partner_prompt_premium()`
- `trg_auto_set_partner_prompt_premium`

Ela força `NEW.is_premium := true` sempre que o prompt passa de `approved = false` para `approved = true`.

Resumo:
```text
Parceiro envia grátis  -> banco grava is_premium = false
Admin aprova           -> trigger sobrescreve para true
Biblioteca lê is_premium = true
Resultado              -> aparece botão de liberar / cadeado indevidamente
```

### O que será corrigido

#### 1) Remover a lógica errada que força premium na aprovação
Criar uma migration para:

- remover a trigger `trg_auto_set_partner_prompt_premium`
- remover ou substituir a function `auto_set_partner_prompt_premium`

A aprovação do admin deve:
- aprovar o item
- nunca alterar `is_premium`

Assim o valor escolhido no cadastro permanece intacto.

#### 2) Corrigir os registros já contaminados pelo bug
Depois da correção estrutural, ajustar os prompts já afetados que ficaram premium indevidamente por causa dessa trigger.

Esse acerto será feito nos dados existentes, preservando:
- prompts que realmente foram cadastrados como premium
- prompts que foram cadastrados como grátis e depois viraram premium por erro

Como o sistema hoje não guarda explicitamente um “valor original antes da aprovação”, a correção dos registros existentes precisa ser feita com critério usando os itens testados/identificados e revisão dos afetados recentes.

#### 3) Melhorar a tela de aprovação para não ficar cego
Hoje a tela de análise de parceiros (`src/pages/AdminCommunityReview.tsx`) aprova/rejeita, mas não destaca claramente se o item foi enviado como premium ou grátis.

Vou incluir nessa tela um indicador visual do tipo do prompt:
- Premium
- Gratuito

Assim o admin consegue validar o status antes de aprovar.

#### 4) Garantir que o fluxo existente continue intacto
Nada será mexido em:
- biblioteca de prompts
- cópia/liberação de prompts
- fluxo de geração das IAs
- contabilização de earnings por uso nas ferramentas
- navegação para ferramentas

A correção é isolada no ponto certo:
- persistência do `is_premium`
- aprovação do item parceiro

### Arquivos envolvidos

#### Banco
- nova migration em `supabase/migrations/...`
  - remover trigger `trg_auto_set_partner_prompt_premium`
  - remover/substituir function `auto_set_partner_prompt_premium`

#### Frontend
- `src/pages/AdminCommunityReview.tsx`
  - exibir badge/status de “Premium” ou “Gratuito” nos prompts de parceiro

### Resultado esperado depois da correção

```text
Parceiro marca Premium  -> salva premium -> admin aprova -> continua premium
Parceiro marca Gratuito -> salva grátis  -> admin aprova -> continua grátis
```

Na biblioteca:
- prompt grátis não mostra botão “liberar prompt”
- prompt grátis não mostra cadeado
- prompt premium continua com comportamento premium normal

### Detalhes técnicos

- O bug é causado por trigger de banco, não pelo componente `Switch`
- O insert do parceiro está correto hoje
- A leitura da biblioteca também está correta; ela apenas consome `is_premium`
- A correção principal é remover a mutação automática no `BEFORE UPDATE` da tabela `partner_prompts`
- A correção de dados existentes será feita separadamente da migration estrutural

### Segurança da mudança

Baixo risco, porque:
- não altera autenticação
- não altera RLS
- não altera schema da tabela
- não altera fluxo das ferramentas de IA
- não altera créditos do usuário
- não altera earning do colaborador
- só remove uma sobrescrita indevida de dados na aprovação
