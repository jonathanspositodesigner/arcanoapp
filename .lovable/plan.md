

# Plano: Centralizar Lógica de Notificação e Recuperação em Todas as Ferramentas de IA

## Resumo

Lógica de notificação e recuperação de job funcionando em TODAS as ferramentas de IA (Upscaler, Pose Changer, Veste AI, Video Upscaler), com implementação centralizada e reutilizável.

---

## Status Final: ✅ COMPLETO

| Componente | Status |
|------------|--------|
| `useNotificationTokenRecovery` hook | ✅ Criado e funcionando |
| `NotificationPromptToast` componente | ✅ Criado e funcionando |
| `verify-notification-token` Edge Function | ✅ Criado |
| `job_notification_tokens` tabela | ✅ Criada |
| **UpscalerArcanoTool** | ✅ Integrado |
| **PoseChangerTool** | ✅ Integrado |
| **VesteAITool** | ✅ Integrado |
| **VideoUpscalerTool** | ✅ Integrado |

---

## Resultado Final

Todas as ferramentas agora têm:

| Funcionalidade | Upscaler | Pose | Veste | Video |
|----------------|----------|------|-------|-------|
| Toast de ativar notificações | ✅ | ✅ | ✅ | ✅ |
| Recuperação via ?nt= token | ✅ | ✅ | ✅ | ✅ |
| Notificação push ao completar | ✅ | ✅ | ✅ | ✅ |
| Limpeza automática de URL | ✅ | ✅ | ✅ | ✅ |

---

## Padrão para Futuras Ferramentas

Quando criar uma nova ferramenta de IA, basta:

1. Adicionar o tipo de tabela no hook `useNotificationTokenRecovery`:
```typescript
toolTable: 'upscaler_jobs' | 'pose_changer_jobs' | 'veste_ai_jobs' | 'video_upscaler_jobs' | 'NOVA_FERRAMENTA_jobs';
```

2. Adicionar o case no switch do hook para buscar os campos corretos

3. Usar o hook na nova ferramenta com callback específico:
```typescript
useNotificationTokenRecovery({
  userId: user?.id,
  toolTable: 'nova_ferramenta_jobs',
  onRecovery: useCallback((result) => {
    if (result.outputUrl) {
      // Restaurar estado específico da ferramenta
      setStatus('completed');
      setProgress(100);
      toast.success('Resultado carregado!');
    }
  }, []),
});
```

4. Adicionar o toast com o nome da ferramenta:
```tsx
<NotificationPromptToast toolName="nome" />
```
