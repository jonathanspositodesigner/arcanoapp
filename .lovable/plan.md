

## Renomear "Refinar" para "Fazer Alteracao" -- apenas no Flyer Maker

O Arcano Cloner continuara com os textos originais ("Refinar", "Refinando", etc.). Apenas o Flyer Maker tera os novos rotulos.

### Arquivo 1: `src/components/arcano-cloner/RefinePanel.tsx`

Adicionar 3 props **opcionais** com valores padrao que preservam o texto atual do Arcano Cloner:

| Prop | Padrao (Arcano Cloner) | Valor no Flyer Maker |
|------|----------------------|---------------------|
| `title` | "Refinar Resultado" | "Fazer Alteracao" |
| `buttonLabel` | "Refinar" | "Fazer Alteracao" |
| `loadingLabel` | "Refinando..." | "Alterando..." |

Usar essas props nos locais onde os textos estao hardcoded (linha 45 titulo, linha 109 loading, linha 114 botao).

### Arquivo 2: `src/pages/FlyerMakerTool.tsx`

| Local | Antes | Depois |
|-------|-------|--------|
| Botao no resultado (linha ~754) | "Refinar" | "Fazer Alteracao" |
| RefinePanel props (linha ~677) | sem props de texto | `title="Fazer Alteracao"` `buttonLabel="Fazer Alteracao"` `loadingLabel="Alterando..."` |
| Toast sucesso (linha ~533) | "Imagem refinada com sucesso!" | "Alteracao feita com sucesso!" |
| Toast/msg erro (linha ~498) | "Erro ao refinar imagem..." | "Erro ao alterar imagem..." |
| Toast erro catch (linha ~536) | "Erro ao refinar imagem" | "Erro ao alterar imagem" |
| Label historico (linha ~516) | "Refinamento X" | "Alteracao X" |

### Resultado

- Arcano Cloner: zero mudancas, continua usando os defaults do RefinePanel
- Flyer Maker: todos os textos visiveis ao usuario mudam de "Refinar/Refinando/Refinamento" para "Fazer Alteracao/Alterando/Alteracao"

