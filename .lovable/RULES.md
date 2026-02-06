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

---

## 🚨 PROIBIDO: APIs Incompatíveis com Deno

As Edge Functions rodam em ambiente **Deno/Supabase**. APIs de outros runtimes causam CRASH TOTAL.

### APIs que NUNCA podem ser usadas:

| API Proibida | Runtime | Erro Causado |
|--------------|---------|--------------|
| `EdgeRuntime.waitUntil()` | Vercel | 404 em todas as funções |
| `context.waitUntil()` | Cloudflare | 404 em todas as funções |
| `process.env` | Node.js | Usar `Deno.env.get()` |
| `require()` | Node.js | Usar `import` |
| `__dirname` / `__filename` | Node.js | Não existe em Deno |

### Regra obrigatória

Se a IA identificar código com essas APIs:
1. **PARAR** imediatamente
2. **NÃO** fazer deploy
3. **REMOVER** o código incompatível
4. **USAR** alternativa Deno nativa

---

## 🚨 PROIBIDO: Modificar Edge Functions sem Verificação

### ANTES de qualquer mudança:
1. Verificar se a função está online (não retorna 404)
2. Testar endpoint com curl/fetch
3. Confirmar que retorna resposta (mesmo 400/401 é OK)

### DEPOIS de qualquer mudança:
1. Aguardar deploy automático completar
2. Testar novamente o endpoint
3. Confirmar que ainda responde (não 404)

### SE quebrar (404):
1. **REVERTER** a mudança imediatamente
2. **REDEPLOYAR** as funções afetadas
3. **NÃO** fazer mudanças adicionais até confirmar restauração
4. **INFORMAR** o usuário sobre o problema

---

## 📜 Histórico de Incidentes Críticos

### Incidente 06/02/2026 - Crash Total de Edge Functions

- **Causa**: Uso de `EdgeRuntime.waitUntil()` (API Vercel) em ambiente Deno
- **Impacto**: 36 funções offline (erro 404)
- **Funções afetadas**: Webhooks de pagamento, ferramentas de IA, admin
- **Solução**: Remoção do código incompatível + redeploy total
- **Tempo de indisponibilidade**: ~2 horas
- **Lição**: NUNCA usar APIs de outros runtimes sem verificar compatibilidade
