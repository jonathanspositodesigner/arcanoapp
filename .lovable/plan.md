

# Correção: Último teste sendo bloqueado antes de completar

## Problema Encontrado

Quando o usuário usa o **3o e último teste**, a seguinte sequência acontece:

1. Backend consome o uso (1 restante vai para 0)
2. `consumeUse()` atualiza o estado local para 0
3. `consumeUse()` detecta que `usesRemaining <= 0` e muda a fase para `"finished"`
4. A UI imediatamente renderiza a tela de "Teste Concluído!" com blur
5. O job que estava processando desaparece -- o usuário nunca vê o resultado

## Solução

Separar a lógica de "decrementar contador" da lógica de "encerrar trial":

1. **`useTrialState.ts`**: Remover a mudança automática de fase para `"finished"` dentro do `consumeUse()`. Criar uma nova função `finishTrial()` para ser chamada explicitamente.

2. **`UpscalerTrialSection.tsx`**: Chamar `finishTrial()` somente quando:
   - O job **completar** com sucesso E não houver mais usos restantes
   - O job **falhar** E não houver mais usos restantes

Isso garante que o último resultado sempre será exibido antes de mostrar a tela de encerramento.

## Detalhes Técnicos

### Arquivo 1: `src/components/upscaler/trial/useTrialState.ts`

- Modificar `consumeUse()` para apenas decrementar o contador sem mudar a fase
- Adicionar nova função `finishTrial()` que seta `phase = "finished"`
- Exportar `finishTrial` no retorno do hook

### Arquivo 2: `src/components/upscaler/trial/UpscalerTrialSection.tsx`

- Importar `finishTrial` do hook
- No callback de status (`statusCallbackRef`):
  - Quando `completed`: se `usesRemaining <= 1` (pois já foi decrementado), chamar `finishTrial()` após um delay de 5 segundos para o usuário ver o resultado
  - Quando `failed`: se `usesRemaining <= 0`, chamar `finishTrial()` imediatamente
- Manter `consumeUse()` onde está (após confirmação do backend), mas sem efeito colateral de encerrar

