

## Objetivo
Criar regras permanentes para **proibir QUALQUER migração** nas Edge Functions sem autorização explícita do usuário - seja Deno.serve, mudança de imports, ou qualquer outra alteração de padrão.

## O que será feito

### 1. Criar arquivo de regras do projeto

Arquivo: `.lovable/RULES.md`

```markdown
# REGRAS CRÍTICAS DO PROJETO - NÃO VIOLAR

## 🚨 PROIBIDO: Qualquer Migração nas Edge Functions

As Edge Functions deste projeto estão em um padrão estável e testado.
**NENHUMA MIGRAÇÃO** é permitida sem autorização explícita do usuário.

### Padrão atual (MANTER SEMPRE):
- ✅ `import { serve } from "https://deno.land/std@0.168.0/http/server.ts"`
- ✅ `import { createClient } from 'npm:@supabase/supabase-js@2'`
- ✅ `serve(async (req) => { ... })`

### Migrações PROIBIDAS (lista não exaustiva):
- ❌ `Deno.serve()` - NUNCA
- ❌ Mudança de versão do std (ex: 0.168.0 para 0.200.0)
- ❌ Mudança de `npm:` para `esm.sh` ou vice-versa
- ❌ Mudança de estrutura de imports
- ❌ Qualquer "modernização" ou "atualização de padrão"
- ❌ Qualquer refatoração de bootstrap/servidor

### Regra obrigatória

Se a IA identificar qualquer sugestão de migração:
1. **PARAR** imediatamente
2. **INFORMAR** ao usuário qual migração seria feita
3. **PERGUNTAR** explicitamente se autoriza
4. **AGUARDAR** confirmação por escrito
5. **SÓ PROSSEGUIR** após "SIM" explícito

### Histórico
- Data da regra: 05/02/2026
- Motivo: Incidente crítico - migração para Deno.serve() quebrou 22 funções,
  incluindo webhooks de vendas (Greenn/Hotmart), causando perda de clientes.
```

### 2. Adicionar aviso em todas as funções críticas (webhooks)

Comentário no topo de cada webhook:

```typescript
/**
 * ⚠️ ATENÇÃO - REGRA CRÍTICA DO PROJETO ⚠️
 * 
 * NÃO FAZER NENHUMA MIGRAÇÃO NESTE ARQUIVO:
 * - NÃO mudar para Deno.serve()
 * - NÃO alterar imports (std, npm:, etc)
 * - NÃO "modernizar" ou "atualizar" padrões
 * 
 * Qualquer alteração de padrão requer autorização EXPLÍCITA.
 * Regras completas em: .lovable/RULES.md
 */
```

Arquivos que receberão este aviso:
- `webhook-greenn-artes/index.ts`
- `webhook-greenn/index.ts`
- `webhook-greenn-musicos/index.ts`
- `webhook-greenn-creditos/index.ts`
- `webhook-hotmart-artes/index.ts`

## Resultado
- Regra documentada cobrindo TODAS as migrações
- Avisos visíveis nas funções mais críticas
- Proteção contra qualquer alteração não autorizada

