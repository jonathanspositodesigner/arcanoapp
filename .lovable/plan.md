

# Corrigir: Separar página de teste MP da página de produção

## Problema
A página `/planos-upscaler-arcano-69` (PlanosUpscalerArcano69v2.tsx) é a que os anúncios apontam e foi alterada para usar Mercado Pago. Se publicar, quebra tudo.

## Solução

### 1. Reverter PlanosUpscalerArcano69v2.tsx ao link original da Greenn
- Remover todo o código do `handlePurchase` com Mercado Pago (linhas 247-283)
- Restaurar o comportamento original com link da Greenn (checkout externo)

### 2. Criar página duplicada para teste do MP
- Criar `src/pages/PlanosUpscalerArcanoMP.tsx` — cópia do v2 mas com o checkout do Mercado Pago
- Rota: `/planos-upscaler-arcano-mp` (só você vai saber o endereço)

### 3. Registrar rota no App.tsx
- Adicionar import lazy + Route para `/planos-upscaler-arcano-mp`

## Resultado
- `/planos-upscaler-arcano-69` → Greenn (produção, anúncios)
- `/planos-upscaler-arcano-mp` → Mercado Pago (teste)

