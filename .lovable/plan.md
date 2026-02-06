
# Plano: Sistema Global de Notificação e Trava de Navegação para IAs

## Resumo
Implementar duas funcionalidades globais que funcionarão automaticamente para **todas** as ferramentas de IA (atuais e futuras):

1. **Som de Notificação** - Tocar um "ding" quando o job completar (sucesso ou falha)
2. **Trava de Navegação** - Bloquear saída com aviso de perda de créditos durante processamento

---

## Como vai funcionar

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         USUÁRIO NO APP                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [Upscaler] [Pose Changer] [Veste AI] [Video Upscaler]            │
│        │            │            │            │                     │
│        └────────────┴────────────┴────────────┘                    │
│                           │                                         │
│                    AIJobProvider (GLOBAL)                           │
│                           │                                         │
│        ┌──────────────────┴──────────────────┐                     │
│        │                                      │                     │
│   🔔 Som quando                         🚫 Trava navegação         │
│   job terminar                          durante processamento       │
│                                                                     │
│   • Funciona em qualquer aba           • Aviso ao tentar sair       │
│   • Mesmo minimizado                   • "Você perderá créditos!"   │
│   • Alerta sonoro + toast              • Bloqueia botão "Voltar"    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Etapas de Implementação

### 1. Adicionar arquivo de som
- Criar arquivo `public/sounds/notification.mp3` (som curto de "ding")
- Som leve (~10KB) que funciona em todos os navegadores

### 2. Criar Contexto Global `AIJobProvider`
Novo arquivo: `src/contexts/AIJobContext.tsx`

Este contexto vai:
- Monitorar se há job ativo globalmente
- Tocar som quando status mudar para `completed` ou `failed`
- Expor estado `isJobRunning` para outros componentes

### 3. Atualizar `useQueueSessionCleanup.ts`
Expandir para bloquear navegação externa (fechar aba/atualizar) também quando:
- Status = `starting` ou `running`
- Mensagem: "Se você sair agora, perderá os créditos. Tem certeza?"

### 4. Criar Hook `useNavigationGuard.ts`
Novo hook que:
- Usa `useBlocker` do React Router para navegação interna
- Mostra modal de confirmação antes de permitir sair
- Integra com o contexto global

### 5. Integrar no `ToolsHeader.tsx`
Modificar o componente de cabeçalho para:
- Usar o novo hook de trava
- Mostrar modal de confirmação quando usuário clicar em "Voltar"

### 6. Envolver App com Provider
Adicionar `AIJobProvider` no `App.tsx` para funcionar globalmente

---

## Arquivos a criar/modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `public/sounds/notification.mp3` | Criar | Som de notificação |
| `src/contexts/AIJobContext.tsx` | Criar | Contexto global de jobs |
| `src/hooks/useNavigationGuard.ts` | Criar | Hook para trava de navegação interna |
| `src/hooks/useQueueSessionCleanup.ts` | Modificar | Expandir para bloquear `running` |
| `src/components/ToolsHeader.tsx` | Modificar | Integrar trava de navegação |
| `src/App.tsx` | Modificar | Adicionar AIJobProvider |

---

## Detalhes Técnicos

### Som de Notificação
```typescript
// Exemplo de lógica
const playNotificationSound = () => {
  const audio = new Audio('/sounds/notification.mp3');
  audio.volume = 0.5;
  audio.play().catch(console.log); // Silencioso se browser bloquear
};
```

### Trava de Navegação Interna (React Router)
```typescript
// Usando useBlocker do react-router-dom
import { useBlocker } from 'react-router-dom';

const blocker = useBlocker(
  ({ currentLocation, nextLocation }) =>
    isJobRunning && currentLocation.pathname !== nextLocation.pathname
);
```

### Mensagem de Aviso
> ⚠️ **Atenção!**
> 
> Você tem um processamento de IA em andamento. 
> Se sair agora, perderá o resultado e os créditos serão cobrados.
>
> Deseja sair mesmo assim?
>
> [Continuar Esperando] [Sair e Perder]

---

## Compatibilidade com Futuras IAs

Qualquer nova ferramenta de IA que:
1. Use o `JobManager.ts` para criar jobs
2. Registre sua tabela no `TABLE_MAP`

...automaticamente terá:
- ✅ Som de notificação ao terminar
- ✅ Trava de navegação durante processamento
- ✅ Aviso de perda de créditos

Não será necessário implementar nada extra por ferramenta!
