

## Correção: UTMs Hotmart não sendo capturadas

### Problema real (2 bugs)

**Bug 1 - Campo errado**: O webhook lê UTMs de `payload.data.purchase.tracking`, mas a Hotmart envia em `payload.data.purchase.origin`. Prova no payload real salvo:
```json
"origin": {
  "sck": "FB|[ES][UPSCALER ARCANO] $7,90|120238937998350575|AD11|120239568755800575",
  "xcod": "FBhQwK21wXxR[ES][UPSCALER ARCANO]..."
}
```
O campo `tracking` simplesmente não existe no webhook da Hotmart. Por isso `parsedUtmData` é sempre `null`.

**Bug 2 - Payload limpo**: Na linha 726, após sucesso o código faz `payload: {}`, apagando a evidência. Só vendas com erro mantêm o payload completo.

### Correção

**Arquivo**: `supabase/functions/webhook-hotmart-artes/index.ts`

1. **Linhas 827-855**: Além de `tracking`, ler também de `purchase.origin`:
   - `origin.sck` contém o formato `source|campaign|content|ad` com os IDs reais
   - `origin.xcod` contém os UTMs completos no formato concatenado com `hQwK21wXxR`
   - Parsear o `xcod` para extrair `utm_source`, `utm_campaign`, `utm_medium`, `utm_content`, `utm_term`, `utm_id`

2. **Linha 726**: Manter o `origin` no payload salvo (ou salvar os UTMs antes de limpar)

3. **Parsear `xcod`**: O formato é `{source}hQwK21wXxR{campaign}hQwK21wXxR{adset}hQwK21wXxR{ad}hQwK21wXxR{placement}` — idêntico ao formato que já funciona no Greenn/MP. Extrair com split por `hQwK21wXxR`.

### Resultado esperado
Todas as vendas Hotmart (independente do meio de pagamento) terão `utm_data` preenchido no `webhook_logs`, aparecendo corretamente no dashboard de vendas e na aba ADS.

