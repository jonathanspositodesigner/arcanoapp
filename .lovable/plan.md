
# Correção: Resultado do Trial Bloqueado pelo Overlay "Teste Concluído"

## Problema

Quando o processamento termina e `usesRemaining` chega a 0, um `setTimeout(() => finishTrial(), 5000)` dispara automaticamente após 5 segundos. Isso muda o `phase` para `"finished"`, que ativa um overlay com blur cobrindo **toda a interface**, incluindo o resultado que o usuário acabou de esperar. O usuário nunca consegue ver o resultado direito.

Isso acontece **tanto no Cloner quanto no Upscaler**.

## Solução

1. **Remover o `setTimeout(() => finishTrial(), 5000)`** de ambos os componentes (Cloner e Upscaler)
2. **No ClonerTrialMockup**: quando `usesRemaining === 0` e tem resultado, mostrar o resultado normalmente + um botão "Teste Concluído" que o próprio usuário clica
3. **Ao clicar "Teste Concluído"**: chamar `onNewUpload` que reseta o estado, e aí sim o `phase` pode ir para `"finished"` mostrando o CTA de compra
4. **Mesma lógica no Upscaler trial mockup** para manter consistência

## Mudanças por arquivo

### 1. `src/components/arcano-cloner/trial/ClonerTrialSection.tsx`
- Linha 65-67: Remover o bloco `if (usesRemaining <= 0) { setTimeout(() => finishTrial(), 5000); }`
- Modificar `handleNewUpload` (linha 285): quando `usesRemaining <= 0`, chamar `finishTrial()` ao invés de resetar para novo upload

### 2. `src/components/arcano-cloner/trial/ClonerTrialMockup.tsx`
- Na view de resultado (linhas 98-108): quando `usesRemaining === 0`, trocar o texto do botão de "Teste concluído" (desabilitado) para um botão ativo "Teste Concluído" que chama `onNewUpload`
- O resultado fica visível o tempo todo, sem overlay, sem blur

### 3. `src/components/upscaler/trial/UpscalerTrialSection.tsx`
- Linhas 87-89: Remover o `setTimeout(() => finishTrial(), 5000)` 
- Aplicar a mesma lógica: quando `handleNewUpload` é chamado com 0 usos restantes, chamar `finishTrial()`

### 4. Upscaler trial mockup (se existir componente equivalente)
- Mesma correção: resultado sempre visível, botão manual para o usuário fechar

## Fluxo corrigido

```text
Resultado pronto
  -> Mostra o resultado na tela (sem overlay, sem blur)
  -> Botão "Teste Concluído" visível abaixo do resultado
  -> Usuário analisa o resultado quanto tempo quiser
  -> Usuário clica "Teste Concluído"
  -> Agora sim: mostra tela de "Comprar Agora" com overlay
```
