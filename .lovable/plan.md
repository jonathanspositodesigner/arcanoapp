

## Plano: Botão "Seu Plano Atual" + "Fazer Upgrade" baseado no plano ativo

### O que será feito

No `Planos2.tsx`:

1. **Importar e usar `usePlanos2Access`** passando `userId` para obter o `planSlug` do plano ativo do usuário (ex: `free`, `starter`, `pro`, `ultimate`, `unlimited`)

2. **Criar mapeamento de hierarquia** dos planos para comparar qual é maior:
```text
free=0, starter=1, pro=2, ultimate=3, unlimited=4
```

3. **Alterar o botão de cada plano** com a seguinte lógica:
   - **Plano do usuário** → texto "Seu Plano Atual", `disabled`, estilo diferenciado
   - **Planos superiores** → texto "Fazer Upgrade", clicável (abre link de pagamento normalmente)
   - **Planos inferiores** → texto "Assinar" normal mas pode ficar desativado ou manter comportamento atual
   - **Free + logado** → "Você já tem uma conta" (disabled, como já está)
   - **Free + deslogado** → "Criar conta grátis" (como já está)

4. **Mapeamento plan name → slug**: `"Free"→"free"`, `"Starter"→"starter"`, `"Pro"→"pro"`, `"Ultimate"→"ultimate"`, `"IA Unlimited"→"unlimited"`

### Arquivo modificado
- `src/pages/Planos2.tsx`

