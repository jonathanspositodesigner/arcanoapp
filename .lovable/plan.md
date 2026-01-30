

# Plano: Configurar Motor Light do Upscaler

## O que descobri na documentação

A versão Light tem os **mesmos campos** da PRO, só muda:
1. O **WEBAPP_ID**: `2017030861371219969`
2. O **nodeId da Resolução**: `75` (na PRO é `73`)

| Campo | PRO | Light |
|-------|-----|-------|
| WEBAPP_ID | 2015865378030755841 | 2017030861371219969 |
| Image | nodeId: 26 | nodeId: 26 |
| Detail Denoise | nodeId: 25 | nodeId: 25 |
| Prompt | nodeId: 128 | nodeId: 128 |
| **Resolução** | **nodeId: 73** | **nodeId: 75** |

## Mudanças no Edge Function

### Arquivo: `supabase/functions/runninghub-upscaler/index.ts`

**1. Linha 17 - Atualizar WEBAPP_ID_STANDARD:**
```typescript
const WEBAPP_ID_STANDARD = '2017030861371219969';
```

**2. Linhas 241-245 - Ajustar nodeId da resolução baseado na versão:**
```typescript
// Build node info list - resolution nodeId differs between versions
const resolutionNodeId = version === 'pro' ? "73" : "75";

const nodeInfoList: any[] = [
  { nodeId: "26", fieldName: "image", fieldValue: fileName },
  { nodeId: "25", fieldName: "value", fieldValue: detailDenoise || 0.15 },
  { nodeId: resolutionNodeId, fieldName: "value", fieldValue: String(resolution || 2048) },
];
```

## Resumo

| Mudança | De | Para |
|---------|-----|------|
| WEBAPP_ID_STANDARD | PLACEHOLDER_STANDARD_ID | 2017030861371219969 |
| Resolution nodeId PRO | 73 | 73 (mantém) |
| Resolution nodeId Light | 73 | 75 (corrigido) |

## Resultado

- Versão PRO: usa webapp `2015865378030755841` com nodeId `73` para resolução
- Versão Light: usa webapp `2017030861371219969` com nodeId `75` para resolução
- Todos os outros campos iguais nas duas versões

