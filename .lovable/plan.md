
# Corrigir imagens do carrossel de resultados

## Problema
As 10 fotos enviadas pelo usuario nao foram salvas corretamente nos arquivos `public/images/results/result-[1-10].webp`. O codigo ja aponta para os caminhos corretos, mas os arquivos de imagem precisam ser recopiados a partir dos uploads do usuario.

## Solucao
Recopiar cada uma das 10 fotos enviadas pelo usuario para os arquivos correspondentes:

| Upload do usuario | Destino |
|---|---|
| `user-uploads://1-2.webp` | `public/images/results/result-1.webp` |
| `user-uploads://2-2.webp` | `public/images/results/result-2.webp` |
| `user-uploads://3-3.webp` | `public/images/results/result-3.webp` |
| `user-uploads://4-3.webp` | `public/images/results/result-4.webp` |
| `user-uploads://5-3.webp` | `public/images/results/result-5.webp` |
| `user-uploads://6-3.webp` | `public/images/results/result-6.webp` |
| `user-uploads://7.webp` | `public/images/results/result-7.webp` |
| `user-uploads://8.webp` | `public/images/results/result-8.webp` |
| `user-uploads://9.webp` | `public/images/results/result-9.webp` |
| `user-uploads://10.webp` | `public/images/results/result-10.webp` |

## Detalhes tecnicos
- Nenhuma alteracao de codigo necessaria - o `ArcanoClonerTeste.tsx` ja referencia os caminhos corretos
- Apenas substituicao dos 10 arquivos de imagem com os uploads corretos do usuario
- O lazy loading ja esta implementado
