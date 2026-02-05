
# Plano: Bloquear Usuário de Usar Múltiplas Ferramentas de IA Simultaneamente

## Problema

Atualmente, um mesmo usuário logado pode abrir múltiplas abas ou ferramentas diferentes e iniciar vários jobs de IA ao mesmo tempo (Upscaler, Pose Changer, Veste AI, Video Upscaler). Isso consome recursos desnecessariamente e pode causar problemas de concorrência.

## Solução

Implementar verificação centralizada que bloqueia o usuário de iniciar um novo job se ele já tiver um job ativo (status `running` ou `queued`) em **qualquer** ferramenta de IA.

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Ferramenta)                    │
│  Antes de criar job → chama /check-user-active              │
│  Se tiver job ativo → mostra modal de bloqueio              │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│            runninghub-queue-manager/check-user-active       │
│  Consulta TODAS as tabelas de jobs                          │
│  Procura por status = 'running' ou 'queued'                 │
│  Retorna: { hasActiveJob: boolean, activeTool: string }     │
└─────────────────────────────────────────────────────────────┘
```

---

## Mudanças Planejadas

### Parte 1: Backend - Novo Endpoint no Queue Manager

**Arquivo:** `supabase/functions/runninghub-queue-manager/index.ts`

#### 1.1 Adicionar novo case no switch de endpoints

```text
case 'check-user-active':
  return await handleCheckUserActive(req);
```

#### 1.2 Criar função handleCheckUserActive

```text
async function handleCheckUserActive(req: Request): Promise<Response> {
  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Mapeamento de tabela para nome amigável da ferramenta
    const toolNames: Record<JobTable, string> = {
      'upscaler_jobs': 'Upscaler Arcano',
      'video_upscaler_jobs': 'Video Upscaler',
      'pose_changer_jobs': 'Pose Changer',
      'veste_ai_jobs': 'Veste AI',
    };
    
    // Verificar em TODAS as tabelas de jobs
    for (const table of JOB_TABLES) {
      const { data, error } = await supabase
        .from(table)
        .select('id, status')
        .eq('user_id', userId)
        .in('status', ['running', 'queued'])
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error(`[QueueManager] Error checking ${table}:`, error);
        continue;
      }
      
      if (data) {
        console.log(`[QueueManager] User ${userId} has active job in ${table}`);
        return new Response(JSON.stringify({
          hasActiveJob: true,
          activeTool: toolNames[table],
          activeJobId: data.id,
          activeStatus: data.status,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    // Nenhum job ativo encontrado
    return new Response(JSON.stringify({
      hasActiveJob: false,
      activeTool: null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[QueueManager] CheckUserActive error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
```

---

### Parte 2: Frontend - Hook Reutilizável

**Novo arquivo:** `src/hooks/useActiveJobCheck.ts`

```text
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ActiveJobResult {
  hasActiveJob: boolean;
  activeTool: string | null;
  activeJobId?: string;
  activeStatus?: string;
}

export function useActiveJobCheck() {
  const checkActiveJob = useCallback(async (userId: string): Promise<ActiveJobResult> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/runninghub-queue-manager/check-user-active`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ userId }),
        }
      );
      
      if (!response.ok) {
        console.error('[ActiveJobCheck] Failed:', response.status);
        return { hasActiveJob: false, activeTool: null };
      }
      
      return await response.json();
    } catch (error) {
      console.error('[ActiveJobCheck] Error:', error);
      return { hasActiveJob: false, activeTool: null };
    }
  }, []);
  
  return { checkActiveJob };
}
```

---

### Parte 3: Frontend - Componente de Modal de Bloqueio

**Novo arquivo:** `src/components/ai-tools/ActiveJobBlockModal.tsx`

```text
import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

interface ActiveJobBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTool: string;
}

const ActiveJobBlockModal: React.FC<ActiveJobBlockModalProps> = ({
  isOpen,
  onClose,
  activeTool,
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-[#1A0A2E] border-purple-500/30">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/20 rounded-full">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
            <AlertDialogTitle className="text-white text-lg">
              Trabalho em Andamento
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-purple-200/70">
            Você já tem um trabalho em processamento no <strong className="text-purple-300">{activeTool}</strong>.
            <br /><br />
            Aguarde a conclusão do trabalho atual antes de iniciar outro.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={onClose}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Entendi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ActiveJobBlockModal;
```

---

### Parte 4: Integrar em Cada Ferramenta

Modificar os arquivos de cada ferramenta para:
1. Importar o hook e o modal
2. Adicionar estados para controle do modal
3. Verificar job ativo antes de processar
4. Mostrar modal se bloqueado

#### Arquivos a modificar:

| Arquivo | Função de processamento |
|---------|------------------------|
| `src/pages/UpscalerArcanoTool.tsx` | `handleProcess` |
| `src/pages/VideoUpscalerTool.tsx` | `handleProcess` |
| `src/pages/PoseChangerTool.tsx` | `handleProcess` |
| `src/pages/VesteAITool.tsx` | `handleProcess` |

#### Exemplo de integração (padrão para todas):

```text
// Imports
import { useActiveJobCheck } from '@/hooks/useActiveJobCheck';
import ActiveJobBlockModal from '@/components/ai-tools/ActiveJobBlockModal';

// Dentro do componente:
const { checkActiveJob } = useActiveJobCheck();
const [showActiveJobModal, setShowActiveJobModal] = useState(false);
const [activeToolName, setActiveToolName] = useState<string>('');

// No início da função handleProcess:
const handleProcess = async () => {
  // CRITICAL: Prevent duplicate calls
  if (processingRef.current) return;
  processingRef.current = true;

  // Verificar se já tem job ativo em outra ferramenta
  if (user?.id) {
    const { hasActiveJob, activeTool } = await checkActiveJob(user.id);
    if (hasActiveJob && activeTool) {
      setActiveToolName(activeTool);
      setShowActiveJobModal(true);
      processingRef.current = false;
      return;
    }
  }

  // ... resto do código existente
};

// No JSX, adicionar o modal:
<ActiveJobBlockModal
  isOpen={showActiveJobModal}
  onClose={() => setShowActiveJobModal(false)}
  activeTool={activeToolName}
/>
```

---

## Fluxo Visual

### Cenário: Usuário tenta iniciar segundo job

```text
┌────────────────────┐     ┌────────────────────┐
│   Upscaler Arcano  │     │    Pose Changer    │
│   (processando)    │     │   (clica Processar)│
└────────────────────┘     └─────────┬──────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │ checkActiveJob(userId)│
                          └─────────┬────────────┘
                                    │
                                    ▼
                          ┌──────────────────────┐
                          │ Queue Manager        │
                          │ Encontra job ativo   │
                          │ no upscaler_jobs     │
                          └─────────┬────────────┘
                                    │
                                    ▼
                          ┌──────────────────────┐
                          │ { hasActiveJob: true,│
                          │   activeTool:        │
                          │   "Upscaler Arcano" }│
                          └─────────┬────────────┘
                                    │
                                    ▼
                          ┌──────────────────────┐
                          │ Modal de Bloqueio    │
                          │ "Você já tem um      │
                          │ trabalho no          │
                          │ Upscaler Arcano"     │
                          └──────────────────────┘
```

---

## Resumo das Mudanças

| Tipo | Arquivo | Ação |
|------|---------|------|
| Backend | `runninghub-queue-manager/index.ts` | + Endpoint `/check-user-active` |
| Hook | `src/hooks/useActiveJobCheck.ts` | Novo arquivo |
| Componente | `src/components/ai-tools/ActiveJobBlockModal.tsx` | Novo arquivo |
| Frontend | `src/pages/UpscalerArcanoTool.tsx` | + Verificação antes de processar |
| Frontend | `src/pages/VideoUpscalerTool.tsx` | + Verificação antes de processar |
| Frontend | `src/pages/PoseChangerTool.tsx` | + Verificação antes de processar |
| Frontend | `src/pages/VesteAITool.tsx` | + Verificação antes de processar |

---

## Observações

1. **Por conta, não por IP**: A verificação é por `user_id`, então se o mesmo usuário estiver logado em duas abas, será bloqueado. Contas diferentes podem processar simultaneamente.

2. **Não bloqueia na fila**: Se o job está `queued` (esperando slot), também bloqueia iniciar outro - isso evita que o usuário entre na fila várias vezes.

3. **Falha segura**: Se a verificação falhar (rede, etc), permite continuar para não prejudicar a experiência.

4. **Performance**: A verificação é rápida pois usa `limit(1)` e para no primeiro job encontrado.
