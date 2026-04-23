
Entendi o objetivo: corrigir a trava de pagamento da tabela `collaborator_unlock_earnings` para que o mesmo usuário só gere comissão uma única vez por prompt de colaborador, para sempre.

## O que a migration pretendida faz

Hoje a unicidade é:

```sql
UNIQUE (user_id, prompt_id, unlock_date)
```

Isso permite que o mesmo usuário gere pagamento para o mesmo prompt em dias diferentes.

A mudança desejada troca para:

```sql
UNIQUE (user_id, prompt_id)
```

Com isso, o banco passa a impedir qualquer novo registro duplicado para o mesmo par `usuário + prompt`, independentemente do dia.

## Impacto para colaboradores

- O colaborador continua recebendo normalmente pelo primeiro desbloqueio/cópia premium daquele prompt por aquele usuário.
- O colaborador não recebe novamente se o mesmo usuário copiar/desbloquear o mesmo prompt em outro dia.
- Isso reduz pagamentos duplicados e abuso financeiro.
- O saldo já acumulado não é apagado nem recalculado pela migration proposta.

## Impacto para usuários

- A experiência de copiar/liberar prompt continua a mesma.
- O usuário ainda pode copiar o mesmo prompt novamente em outro dia.
- O limite diário do plano continua separado e não deve ser alterado.
- A tabela `daily_prompt_copies` não será mexida.

## Impacto financeiro

- Corrige vazamento de comissão recorrente indevida.
- Evita que um mesmo usuário gere pagamento repetido pelo mesmo prompt.
- Mantém o histórico financeiro existente intacto.
- A partir da correção, o pagamento ao colaborador passa a ser “uma vez por usuário por prompt”.

## Ponto crítico que encontrei antes de aplicar

Existe um risco técnico importante: a RPC atual `register_collaborator_unlock` usa:

```sql
ON CONFLICT (user_id, prompt_id, unlock_date) DO NOTHING
```

Se a migration remover o constraint antigo e criar apenas `UNIQUE (user_id, prompt_id)`, esse `ON CONFLICT` deixa de apontar para um constraint válido. Em PostgreSQL, isso pode causar erro do tipo “não existe constraint único correspondente ao ON CONFLICT”.

Ou seja: aplicar somente o SQL exato informado pode quebrar a RPC de registro de comissão, mesmo que o frontend continue copiando o prompt.

## Plano seguro para não quebrar nada

1. Fazer uma verificação prévia somente leitura para confirmar se já existem duplicidades históricas de `(user_id, prompt_id)`.
   - Se existirem duplicidades, a criação do novo unique constraint falharia.
   - Nesse caso, eu paro e te aviso antes de qualquer alteração.
   - Nenhum dado histórico será alterado.

2. Criar a migration de constraint conforme o objetivo:
   - remover o constraint antigo por dia;
   - adicionar o novo constraint permanente por usuário + prompt.

3. Para garantir que nada quebre, aplicar junto um ajuste mínimo na RPC `register_collaborator_unlock`, preservando:
   - mesmo nome da RPC;
   - mesmos parâmetros;
   - mesmo retorno;
   - mesma lógica de saldo;
   - mesma lógica de XP;
   - nenhuma mudança de frontend.

   A única alteração necessária seria trocar:

```sql
ON CONFLICT (user_id, prompt_id, unlock_date) DO NOTHING
```

por:

```sql
ON CONFLICT (user_id, prompt_id) DO NOTHING
```

4. Não alterar:
   - `daily_prompt_copies`;
   - limites diários dos planos;
   - frontend;
   - saldos existentes;
   - dados históricos;
   - compras;
   - jobs;
   - créditos.

## Confirmação necessária

Para cumprir “nada pode quebrar”, eu não recomendo aplicar apenas o SQL isolado sem ajustar o `ON CONFLICT` da RPC.

Minha recomendação segura é: migration do constraint + ajuste mínimo obrigatório da RPC apenas na cláusula `ON CONFLICT`.

Só aplico depois da sua confirmação explícita.
