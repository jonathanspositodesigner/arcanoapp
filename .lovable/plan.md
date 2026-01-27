
## Problema Verificado
O preto aparece marrom **apenas no mobile** porque:

1. Os glows decorativos (bolas de luz amarela/laranja com blur) são `position: absolute` **sem z-index definido**
2. O container do conteúdo (`max-w-7xl`) também **não tem z-index**
3. No mobile, os glows (especialmente o de 600x600px no centro) cobrem proporcionalmente mais área da tela e ficam **sobrepostos ao conteúdo**
4. Essa sobreposição "contamina" visualmente o preto, transformando em marrom (`#533B0E`)

No desktop a tela é maior, então os glows não cobrem tanto o conteúdo.

## Solução
Isolar as camadas corretamente usando `z-index`:

### Mudanças no arquivo `src/components/combo-artes/BonusFimDeAnoSection.tsx`

1. **Adicionar `isolate` na section** (cria stacking context isolado)

2. **Agrupar os 3 glows em um wrapper com `z-0`**
   - Move os divs de glow para dentro de um container com `z-0`
   - Garante que fiquem **atrás** do conteúdo

3. **Envolver o conteúdo (max-w-7xl) em um wrapper com `relative z-10`**
   - Garante que badge, título e carrossel fiquem **na frente** dos glows

4. **Remover `backdrop-blur-sm` dos botões mobile**
   - Linhas 104 e 111: tirar `backdrop-blur-sm`
   - Trocar `bg-black` por `style={{ backgroundColor: '#000000' }}`

5. **Remover `backdrop-blur-sm` dos botões desktop também** (por consistência)
   - Linhas 67 e 95

## Estrutura Final
```text
┌─────────────────────────────────────────┐
│ section (isolate, relative)             │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ div (absolute, z-0)               │  │
│  │   - glow amarelo                  │  │
│  │   - glow laranja                  │  │
│  │   - glow vermelho                 │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ div (relative, z-10)              │  │
│  │   - badge "Bônus de Carnaval"     │  │
│  │   - título                        │  │
│  │   - carrossel + botões            │  │
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

Com isso, os glows ficam **definitivamente atrás** do conteúdo, e o preto será preto puro `#000000` tanto no mobile quanto no desktop.

## Arquivo a ser alterado
- `src/components/combo-artes/BonusFimDeAnoSection.tsx`

## Validação
Após implementar, vou tirar um screenshot da rota `/combo-artes-arcanas` para confirmar que o preto está correto no mobile.
