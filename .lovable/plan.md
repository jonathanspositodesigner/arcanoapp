

## Plano: Remover CPF e adicionar celular + confirmação de email

### Alterações

**1. `PreCheckoutModal.tsx` (Frontend)**
- Remover campo CPF, estado `cpf`, `cpfError`, e a função `formatCpf`
- Adicionar campo **Celular** com máscara `(00) 00000-0000` e validação de 10-11 dígitos
- O campo **Confirmar email** já existe — manter como está (já funciona corretamente, só aparece para usuários não autenticados)
- Atualizar `handleSubmit` para enviar `user_phone` em vez de `user_cpf`

**2. `create-pagarme-checkout/index.ts` (Edge Function)**
- Remover validação de CPF obrigatório
- Remover `document: cpf` do objeto `customer` (ou enviar apenas se fornecido)
- Adicionar `user_phone` nos parâmetros recebidos
- Usar o telefone real do usuário no campo `phones.mobile_phone` em vez do placeholder `000000000`
- Parsear o telefone para extrair DDD (2 dígitos) e número (8-9 dígitos)

### Campos do formulário (resultado final)
1. Nome completo (obrigatório)
2. Email (obrigatório)
3. Confirmar email (obrigatório, só para não-autenticados)
4. Celular (obrigatório)
5. Forma de pagamento (PIX / Cartão)

