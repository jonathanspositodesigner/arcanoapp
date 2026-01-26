

## Remover ForceUpdateModal (APENAS isso)

### O que será feito

1. **Desativar o componente `ForceUpdateModal.tsx`**
   - Remover toda a lógica interna (useEffect, chamadas ao banco, reload)
   - Manter apenas `return null;` para não quebrar imports
   - Manter o export do `APP_VERSION` para referência

2. **Remover do `App.tsx`**
   - Remover a linha 7: `import { ForceUpdateModal } from "./components/ForceUpdateModal";`
   - Remover a linha 154: `<ForceUpdateModal />`

3. **Atualizar o banco de dados**
   - Setar `force_update: false` na tabela `app_settings` (id = 'app_version')
   - Isso garante que mesmo se alguém reimportar o componente no futuro, nada vai acontecer

### Arquivos alterados

| Arquivo | Ação |
|---------|------|
| `src/components/ForceUpdateModal.tsx` | Esvaziar lógica, manter só `return null` |
| `src/App.tsx` | Remover import e uso do componente |
| Banco `app_settings` | `force_update: false` |

### Resultado
- Nenhum redirecionamento automático vai acontecer
- Links com `colecao` e `mcp_token` vão funcionar normalmente no Instagram/Facebook
- O app continua funcionando normalmente

