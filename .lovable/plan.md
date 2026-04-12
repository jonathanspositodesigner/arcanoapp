

## Plan: Atualizar tabela de preços do Seedance 2.0

### Resumo
Atualizar os valores de créditos por segundo no arquivo `src/config/seedance-pricing.ts` com os novos preços fornecidos.

### Novos valores

| Configuração | Antigo | Novo |
|---|---|---|
| Fast 480p i2v | 130 | 100 |
| Fast 480p t2v | 130 | 100 |
| Fast 720p i2v | 270 | 250 |
| Fast 720p t2v | 280 | 250 |
| Standard 480p i2v | 160 | 130 |
| Standard 480p t2v | 170 | 150 |
| Standard 720p i2v | 300 | 270 |
| Standard 720p t2v | 350 | 300 |

### Alteração
Um único arquivo: `src/config/seedance-pricing.ts` — atualizar os 8 valores de `creditsPerSecond` na `PRICING_TABLE`.

