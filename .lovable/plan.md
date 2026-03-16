

## Plano: Modal de resultado para compra 1-clique (aprovada / recusada)

**Escopo**: Apenas o `handleOneClickBuy` em `PreCheckoutModal.tsx`. Nenhum outro fluxo é alterado.

### Mudanças

1. **Novo state** no componente:
   ```typescript
   const [oneClickResult, setOneClickResult] = useState<'approved' | 'declined' | null>(null);
   ```

2. **No `handleOneClickBuy`** (linhas 285-298):
   - **Aprovado** (`is_paid === true`): remover `window.location.href`, setar `setOneClickResult('approved')`
   - **Recusado** (erro na response, ou `is_paid === false`): remover os `alert()`, setar `setOneClickResult('declined')`
   - Erros no catch: também setar `setOneClickResult('declined')`

3. **Modal de resultado** (novo JSX no componente):
   - Usar o componente `Dialog` já existente no projeto
   - **Se `approved`**: ícone check verde, texto "Compra aprovada!", botão "Entendi" que fecha tudo (`setOneClickResult(null)` + `onClose()`)
   - **Se `declined`**: ícone X vermelho, texto "Compra recusada", botão "Escolher outro meio de pagamento" que fecha apenas o modal de resultado (`setOneClickResult(null)`) e mantém o PreCheckoutModal aberto para o usuário escolher outro método

**Arquivo alterado**: Apenas `src/components/upscaler/PreCheckoutModal.tsx`

