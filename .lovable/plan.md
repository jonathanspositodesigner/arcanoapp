

# Correção: Erro "foreign key constraint" ao criar processamento

## Problema

O erro no banco de dados é claro:

```
insert or update on table "upscaler_jobs" violates foreign key constraint "upscaler_jobs_user_id_fkey"
```

O código está usando um UUID falso (`'00000000-0000-0000-0000-000000000000'`) como `user_id` na linha 236 do `UpscalerTrialSection.tsx`. Esse UUID não existe na tabela de usuários, então o banco rejeita a inserção.

A coluna `user_id` na tabela `upscaler_jobs` aceita `NULL` -- então a correção é simplesmente usar `null`.

## Correção

### Arquivo: `src/components/upscaler/trial/UpscalerTrialSection.tsx`

- Linha 236: Trocar `user_id: '00000000-0000-0000-0000-000000000000'` por `user_id: null`

Essa é uma correção de uma linha. O `trial_mode: true` já é enviado para a Edge Function, que ignora validação de UUID quando esse flag está ativo.

