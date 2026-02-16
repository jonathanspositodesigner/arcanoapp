
# Mover botoes Download e Gerar Nova para o painel de controles

## Problema
Os botoes "Baixar" e "Nova" aparecem abaixo da imagem gerada (dentro da area de resultado), ficando escondidos quando a imagem e grande e o usuario precisa rolar para encontra-los.

## Solucao
Mover esses botoes para a barra inferior (bottom bar) junto com os botoes de modelo, proporcao e gerar. Eles so aparecerao quando houver resultado pronto (`resultBase64` existir).

## Mudancas no arquivo `src/pages/GerarImagemTool.tsx`

### 1. Remover botoes de baixo da imagem
Remover o bloco de botoes "Baixar" e "Nova" que fica abaixo da imagem (linhas 229-236). A area de resultado mostrara apenas a imagem.

### 2. Adicionar botoes na barra inferior (condicionalmente)
Na secao "Controls + Generate button row" (linha 325), adicionar os botoes "Baixar" e "Nova" antes do spacer (`flex-1`), visiveis apenas quando `resultBase64` existe:

```text
[Modelo] [Proporcao] [Baixar*] [Nova*] --- spacer --- [Gerar]
                      * so aparecem com resultado pronto
```

Os botoes terao estilo compacto compativel com os demais controles da barra.
