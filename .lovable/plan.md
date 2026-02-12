

## Remover o modal "Nova versao disponivel"

O modal de update esta com bug de click-through (cliques passam para elementos atras dele, como o botao "Criar Conta"). A solucao mais simples e direta: remover o modal completamente.

### Mudancas

1. **`src/components/ForceUpdateModal.tsx`** - Fazer o componente retornar `null` sempre (ou remover o conteudo). Manter o arquivo para nao quebrar imports.

2. **`src/components/UpdateAvailableModal.tsx`** - Mesmo tratamento: esvaziar o componente, retornando `null`.

O sistema de push notification para forcar update (que ja funciona) continua sendo o mecanismo principal. O modal nao e mais necessario.

