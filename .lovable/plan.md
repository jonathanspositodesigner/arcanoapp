

## Atualizar ferramentas na pagina de Recarga de Creditos

### Mudancas

**Arquivo:** `src/pages/PlanosCreditos.tsx`

1. **Mover "Upscaler de Video" de "Em Breve" para ferramentas ativas** - Remover da lista `comingSoonTools` e adicionar em `availableTools` com icone Video e cores adequadas.

2. **Mover "Forja de Selos 3D" de ferramentas ativas para "Em Breve"** - Remover da lista `availableTools` e adicionar na lista `comingSoonTools` com icone Box.

3. **Adicionar "Arcano Cloner" nas ferramentas ativas** - Novo item em `availableTools` com descricao e icone apropriados.

### Resultado final

**Ferramentas ativas (cards grandes):**
- Upscaler Arcano
- Mudar Roupa
- Mudar Pose
- Upscaler de Video (novo)
- Arcano Cloner (novo)

**Em Breve (badges):**
- Forja de Selos 3D (movido pra ca)
- Remocao de Fundo
- Edicao Automatica
- Remover Objeto
- Teloes de LED
- Narracao e Musica

