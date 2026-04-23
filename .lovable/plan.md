

## Plano: Inverter Switch Premium/Gratuito no upload do parceiro

### Problema

O Switch está com semântica invertida:
- **Hoje**: `checked` = Gratuito, `unchecked` = Premium
- **Correto**: `checked` = Premium, `unchecked` = Gratuito

O default `isFree: false` faz o switch iniciar **desligado**, mas o label mostra "Prompt Premium" — confuso. O parceiro não marca nada e espera Premium, mas o switch desligado + inversão de labels causa confusão.

### Correção em `src/pages/PartnerUpload.tsx`

1. Inverter o `checked` do Switch: `checked={!currentMedia.isFree}` (checked = Premium)
2. Inverter o `onCheckedChange`: `onCheckedChange={(checked) => updateMediaData('isFree', !checked)}`
3. Manter tudo mais igual — labels, ícone, texto explicativo, e a gravação `is_premium: !media.isFree` continuam corretos sem alteração

### Resultado

- Switch **ligado** = Premium ✓
- Switch **desligado** = Gratuito ✓
- Default `isFree: false` → switch inicia **ligado** (Premium) ✓
- Nenhuma outra alteração necessária

