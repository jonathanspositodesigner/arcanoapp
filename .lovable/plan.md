
## Simulação de Compra — clara-sossai-detto-pegorer@tuamaeaquelaursa.com

### Estado atual
Email não existe no banco de dados. É um cadastro completamente novo.

### O que será executado (mesma sequência dos testes anteriores)

**1. Disparar o webhook** com payload de compra do produto 159713 (Arcano Cloner, 4.200 créditos vitalícios) para este email.

**2. O webhook vai automaticamente:**
- Criar o usuário na autenticação (senha = email)
- Criar registro em `profiles`
- Criar registro em `upscaler_credits` com `lifetime_balance = 4200` e `balance = 4200`
- Criar registro em `premium_users` ativando Premium Pro
- Criar registro em `user_pack_purchases` com `pack_slug = 'arcano-cloner'` e `access_type = 'vitalicio'`
- Enviar email com o template exclusivo do Arcano Cloner (fundo escuro, botão → arcanolab.voxvisual.com.br)
- Registrar log em `webhook_logs` com o `greenn_contract_id` único para garantir anti-duplicata

**3. Verificação pós-execução:**
- Consultar banco confirmando exatamente 4.200 créditos (não mais, não menos)
- Confirmar `user_pack_purchases` com slug `arcano-cloner`
- Confirmar que NÃO foi gerada duplicata (idempotency check com `greenn_contract_id`)

### O que a usuária vai ter acesso na home
- Ferramentas de IA: aparece como comprado (via `arcano-cloner` em `user_pack_purchases`)
- Biblioteca de Prompts: NÃO aparece (só tem pack de ferramenta, sem pack de prompts)

### Credenciais de acesso
- Email: `clara-sossai-detto-pegorer@tuamaeaquelaursa.com`
- Senha: `clara-sossai-detto-pegorer@tuamaeaquelaursa.com`

Tudo pronto para executar assim que aprovar.
