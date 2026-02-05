

# ✅ CONCLUÍDO: Melhorar Modal "Trabalho em Andamento" com Detalhes e Opção de Cancelar

## Implementado

1. ✅ **Função SQL `user_cancel_ai_job()`** - Permite que usuários cancelem seus próprios jobs e recebam estorno
2. ✅ **Hook `useActiveJobCheck`** atualizado com função `cancelActiveJob()`
3. ✅ **Modal `ActiveJobBlockModal`** atualizado para mostrar status e botão cancelar
4. ✅ **Todas as 4 páginas de ferramentas** atualizadas com os novos props:
   - UpscalerArcanoTool.tsx
   - PoseChangerTool.tsx
   - VesteAITool.tsx
   - VideoUpscalerTool.tsx

## Resultado

- O modal agora mostra o **status atual** do trabalho (Processando/Na Fila)
- Botão **"Cancelar Trabalho"** permite que o usuário cancele e receba os créditos de volta
- Toast confirma o estorno de créditos
