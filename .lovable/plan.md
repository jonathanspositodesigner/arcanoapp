

# Plano: Centralizar Lógica de Notificação e Recuperação em Todas as Ferramentas de IA

## Resumo

Você quer que a lógica de notificação e recuperação de job funcione em TODAS as ferramentas de IA (Upscaler, Pose Changer, Veste AI, Video Upscaler) e futuras, com uma implementação centralizada e reutilizável.

---

## O Que Já Está Pronto

| Componente | Status |
|------------|--------|
| `useNotificationTokenRecovery` hook | ✅ Criado e funcionando |
| `NotificationPromptToast` componente | ✅ Criado e funcionando |
| `verify-notification-token` Edge Function | ✅ Criado |
| `job_notification_tokens` tabela | ✅ Criada |
| **UpscalerArcanoTool** | ✅ Integrado |
| **PoseChangerTool** | ❌ Faltando |
| **VesteAITool** | ❌ Faltando |
| **VideoUpscalerTool** | ❌ Faltando |

---

## Implementação em Cada Ferramenta

Para cada ferramenta faltante, preciso adicionar:

### 1. Import dos componentes/hooks

```typescript
import { NotificationPromptToast } from '@/components/ai-tools';
import { useNotificationTokenRecovery } from '@/hooks/useNotificationTokenRecovery';
```

### 2. Hook de recuperação com callback específico

Cada ferramenta tem campos diferentes, então o callback se adapta:

**Pose Changer:**
```typescript
useNotificationTokenRecovery({
  userId: user?.id,
  toolTable: 'pose_changer_jobs',
  onRecovery: useCallback((result) => {
    if (result.outputUrl) {
      setPersonImage(result.personImageUrl);
      setReferenceImage(result.referenceImageUrl);
      setOutputImage(result.outputUrl);
      setJobId(result.jobId);
      setStatus('completed');
      setProgress(100);
      toast.success('Resultado carregado!');
    }
  }, []),
});
```

**Veste AI:**
```typescript
useNotificationTokenRecovery({
  userId: user?.id,
  toolTable: 'veste_ai_jobs',
  onRecovery: useCallback((result) => {
    if (result.outputUrl) {
      setPersonImage(result.personImageUrl);
      setClothingImage(result.clothingImageUrl);
      setOutputImage(result.outputUrl);
      setJobId(result.jobId);
      setStatus('completed');
      setProgress(100);
      toast.success('Resultado carregado!');
    }
  }, []),
});
```

**Video Upscaler:**
```typescript
useNotificationTokenRecovery({
  userId: user?.id,
  toolTable: 'video_upscaler_jobs',
  onRecovery: useCallback((result) => {
    if (result.outputUrl) {
      setVideoUrl(result.inputUrl);
      setOutputVideoUrl(result.outputUrl);
      setJobId(result.jobId);
      setStatus('completed');
      setProgress(100);
      toast.success('Resultado carregado!');
    }
  }, []),
});
```

### 3. Toast de notificação no render

Adicionar no final do JSX de cada ferramenta:

```tsx
{/* Notification prompt toast */}
<NotificationPromptToast toolName="pose" />  // ou "look" ou "vídeo"
```

---

## Arquivos a Modificar

| Arquivo | Modificações |
|---------|--------------|
| `src/pages/PoseChangerTool.tsx` | Adicionar imports + hook + toast |
| `src/pages/VesteAITool.tsx` | Adicionar imports + hook + toast |
| `src/pages/VideoUpscalerTool.tsx` | Adicionar imports + hook + toast |

---

## Estrutura Central (Já Existente)

O hook `useNotificationTokenRecovery` já é 100% genérico e centralizado:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    HOOK CENTRALIZADO: useNotificationTokenRecovery       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Props:                                                                  │
│  ├── userId: string           (do usePremiumStatus)                     │
│  ├── toolTable: enum          (upscaler/pose/veste/video)               │
│  └── onRecovery: callback     (específico de cada ferramenta)           │
│                                                                          │
│  Funcionamento Interno:                                                  │
│  1. Detecta ?nt= na URL                                                  │
│  2. Chama verify-notification-token Edge Function                        │
│  3. Verifica se table_name corresponde ao toolTable                     │
│  4. Busca job específico no banco (switch por tabela)                   │
│  5. Chama onRecovery com os dados do job                                │
│  6. Limpa URL automaticamente                                           │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Padrão para Futuras Ferramentas

Quando criar uma nova ferramenta de IA, basta:

1. Adicionar o tipo de tabela no hook:
```typescript
toolTable: 'upscaler_jobs' | 'pose_changer_jobs' | 'veste_ai_jobs' | 'video_upscaler_jobs' | 'NOVA_FERRAMENTA_jobs';
```

2. Adicionar o case no switch do hook para buscar os campos corretos

3. Usar o hook na nova ferramenta com callback específico

4. Adicionar o toast com o nome da ferramenta

---

## Resultado Final

Após esta implementação, todas as ferramentas terão:

| Funcionalidade | Upscaler | Pose | Veste | Video |
|----------------|----------|------|-------|-------|
| Toast de ativar notificações | ✅ | ✅ | ✅ | ✅ |
| Recuperação via ?nt= token | ✅ | ✅ | ✅ | ✅ |
| Notificação push ao completar | ✅ | ✅ | ✅ | ✅ |
| Limpeza automática de URL | ✅ | ✅ | ✅ | ✅ |

