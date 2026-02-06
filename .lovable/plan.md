

# Plano: Adicionar Regra Máxima de Proteção de Edge Functions

## Objetivo
Expandir o arquivo `.lovable/RULES.md` com uma regra absoluta que previna qualquer alteração que possa quebrar as Edge Functions existentes.

---

## O que será adicionado

### Nova seção: APIs Incompatíveis

Uma lista explícita de APIs que **NUNCA** podem ser usadas porque não funcionam no ambiente Deno/Supabase:

| API Proibida | Motivo |
|--------------|--------|
| `EdgeRuntime.waitUntil()` | API exclusiva da Vercel |
| `context.waitUntil()` | API exclusiva da Cloudflare |
| `process.env` | Node.js - usar `Deno.env.get()` |

### Nova seção: Verificação Obrigatória

Antes de qualquer modificação em Edge Functions:
1. Verificar se a função está online (não 404)
2. Após mudança, testar se ainda responde
3. Se quebrar, reverter imediatamente

### Nova seção: Histórico de Incidentes

Documentar o incidente de 06/02/2026 para referência futura:
- Causa: uso de `EdgeRuntime.waitUntil()` 
- Impacto: 36 funções offline (404)
- Solução: redeploy total

---

## Arquivo a modificar

| Arquivo | Ação |
|---------|------|
| `.lovable/RULES.md` | Adicionar novas seções de proteção |

---

## Resultado esperado

O arquivo RULES.md terá regras claras que impedem:
1. Uso de APIs incompatíveis com Deno
2. Modificações sem verificação prévia
3. Repetição do incidente que causou 404 em massa

