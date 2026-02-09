

## Modal "Criar Personagem" ao acessar o Arcano Cloner

### O que muda
Quando o usuário clicar para usar o Arcano Cloner, o sistema verifica se ele já tem um personagem salvo na galeria (`saved_characters`). Se **não tiver**, exibe um modal informativo antes de prosseguir.

### Modal
- **Titulo**: "Crie seu Personagem"
- **Texto**: Explica que criar um personagem garante maior fidelidade e qualidade nas gerações do Arcano Cloner.
- **Botão 1**: "Criar Personagem" -- redireciona para `/gerador-personagem`
- **Botão 2**: "Seguir sem criar" -- continua normalmente para `/arcano-cloner-tool`

### Detalhes técnicos

**Arquivo:** `src/pages/FerramentasIAAplicativo.tsx`

1. Adicionar estados para controlar o modal:
   - `showCharacterModal` (boolean)
   - `hasCharacter` (boolean | null, para loading)

2. No `useEffect` (ou em um novo), ao ter `user`, consultar `saved_characters` para verificar se existe ao menos 1 registro para aquele `user_id`.

3. Interceptar o clique no card do Arcano Cloner:
   - Se `hasCharacter === false`, abrir o modal em vez de navegar.
   - Se `hasCharacter === true`, navegar normalmente.

4. Criar o modal usando os componentes `Dialog`/`DialogContent` já existentes no projeto, com:
   - Icone ilustrativo (ex: `Users` do lucide)
   - Texto explicativo
   - Dois botões: "Criar Personagem" (navigate para `/gerador-personagem`) e "Seguir sem criar" (navigate para `/arcano-cloner-tool`)

**Consulta ao banco:**
```typescript
const { count } = await supabase
  .from('saved_characters')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', user.id);
const hasChar = (count ?? 0) > 0;
```

Nenhuma migração de banco necessária. Apenas lógica de UI na página de listagem de ferramentas.
