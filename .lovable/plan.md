

## Problema

O secret `META_AD_ACCOUNT_IDS` espera 3 IDs separados por vírgula numa única string, mas a interface de secrets só permite colar um valor por vez, fazendo com que apenas 1 conta seja salva. Isso impede a sincronização das 3 contas.

## Solução

Criar **3 secrets separados** — um para cada conta — e alterar o código da Edge Function para ler dos 3 secrets individuais.

### Secrets a criar

| Secret | Valor |
|---|---|
| `META_AD_ACCOUNT_ID_1` | `1415481408767657` |
| `META_AD_ACCOUNT_ID_2` | `588010967298556` |
| `META_AD_ACCOUNT_ID_3` | `578228448304621` |

O secret antigo `META_AD_ACCOUNT_IDS` pode ser mantido como fallback ou ignorado.

### Alteração no código (`supabase/functions/fetch-meta-ads/index.ts`)

Linha 20 — substituir:
```typescript
const accountIds = Deno.env.get("META_AD_ACCOUNT_IDS")!.split(",");
```

Por:
```typescript
const accountIds: string[] = [];
const id1 = Deno.env.get("META_AD_ACCOUNT_ID_1");
const id2 = Deno.env.get("META_AD_ACCOUNT_ID_2");
const id3 = Deno.env.get("META_AD_ACCOUNT_ID_3");
if (id1) accountIds.push(id1.trim());
if (id2) accountIds.push(id2.trim());
if (id3) accountIds.push(id3.trim());
// Fallback para o formato antigo
if (accountIds.length === 0) {
  const legacy = Deno.env.get("META_AD_ACCOUNT_IDS");
  if (legacy) accountIds.push(...legacy.split(",").map(s => s.trim()));
}
```

### Passos de implementação

1. Solicitar criação dos 3 secrets individuais (um de cada vez, para o usuário colar cada ID separadamente)
2. Atualizar a Edge Function com a lógica acima
3. Testar a sincronização chamando a função com `action: "fetch"`

