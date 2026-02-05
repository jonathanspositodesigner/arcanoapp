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
