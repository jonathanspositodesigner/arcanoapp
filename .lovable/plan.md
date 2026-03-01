
# Correcao: resetForm usa creditos errados (600 em vez de 1800)

## Bug encontrado

No `resetForm()` (linha 195), o valor padrao de creditos esta hardcoded como `600`:
```
setFormCreditsPerMonth(600);
```

O plano padrao do formulario e "starter" (linha 190), que tem `1800` creditos. Isso significa que se o admin abrir o modal de criacao e nao mexer no dropdown de plano, o usuario sera criado com 600 creditos em vez de 1800.

## Cenario do bug

1. Admin clica em "Adicionar Assinante"
2. O formulario abre com plano "Starter" selecionado e creditos = 600
3. Admin preenche email, nome, e clica em salvar SEM trocar o plano
4. Usuario e criado com 600 creditos em vez de 1800

**Nota**: Se o admin trocar o plano no dropdown, o `handlePlanChange` corrige o valor. O bug so acontece quando o admin aceita o padrao "Starter" sem mexer.

## Correcao

**Arquivo**: `src/components/admin/AdminPlanos2SubscribersTab.tsx`, linha 195

Trocar:
```
setFormCreditsPerMonth(600);
```
Por:
```
setFormCreditsPerMonth(1800);
```

Isso alinha o valor padrao do formulario com o valor correto do plano Starter definido em `PAID_PLANS`.

## Verificacao completa

Todos os outros pontos estao corretos:
- PAID_PLANS: 1800 / 4200 / 10800 / 99999 (OK)
- getPlanFeatures: flags e limites batem com webhook (OK)
- handleCreate: usa getPlanFeatures + aloca creditos via RPC (OK)
- handleEdit: usa getPlanFeatures + reseta creditos via RPC (OK)
- handlePlanChange: auto-preenche creditos do PAID_PLANS (OK)
