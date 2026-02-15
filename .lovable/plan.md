
# Corrigir Log de Erro do Email

## Problema
O `catch` na linha 749-751 engole o erro real, logando apenas uma mensagem genérica. Impossível saber o que deu errado.

## Alteração

**Arquivo:** `supabase/functions/webhook-greenn-artes/index.ts` (linhas 749-751)

Antes:
```typescript
} catch (e) {
  console.log(`   ├─ ⚠️ Falha no email (créditos já liberados)`)
}
```

Depois:
```typescript
} catch (e) {
  console.log(`   ├─ ⚠️ Falha no email (créditos já liberados)`)
  console.error(`   ├─ ❌ Erro detalhado do email:`, e?.message || e)
}
```

## Resultado
- Redeploy automático da Edge Function
- No próximo webhook teste, o log vai mostrar exatamente o que causou a falha do email
