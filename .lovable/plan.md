

## Plano: Adicionar checkout Pagar.me na página /planos-upscaler-arcano

### O que será feito

Substituir os links de checkout Greenn na página `/planos-upscaler-arcano` pelo mesmo `PreCheckoutModal` (Pagar.me) que já funciona na página `/planos-upscaler-arcano-mp`.

### Alterações em `src/pages/PlanosUpscalerArcano.tsx`

1. **Importar o `PreCheckoutModal`**
   - Adicionar `import PreCheckoutModal from "@/components/upscaler/PreCheckoutModal"`

2. **Adicionar estado do modal**
   - Adicionar `const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)`

3. **Substituir `handlePurchase`**
   - Trocar a lógica de `window.open(appendUtmToUrl(checkoutLink))` por `setCheckoutModalOpen(true)` para abrir o modal do Pagar.me

4. **Renderizar o modal**
   - Adicionar `<PreCheckoutModal isOpen={checkoutModalOpen} onClose={() => setCheckoutModalOpen(false)} userEmail={user?.email} userId={user?.id} />` no JSX (mesmo padrão da página MP)

5. **Limpar imports não utilizados**
   - Remover `appendUtmToUrl` se não for mais usado em nenhum outro lugar do arquivo

