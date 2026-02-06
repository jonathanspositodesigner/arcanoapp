

# Plano: Biblioteca "Minhas Criações" para Ferramentas de IA

## Resumo

Criar uma biblioteca interna às ferramentas de IA onde usuários podem visualizar o histórico de suas criações, com expiração automática em 5 dias, sem armazenar nada no storage próprio.

---

## O que NÃO será alterado (Regras Críticas)

| Item | Status |
|------|--------|
| Edge Functions | ❌ Nenhuma criação/edição/deploy |
| Storage (uploads) | ❌ Nenhum arquivo salvo |
| Outras funcionalidades | ❌ Intactas |
| Tabelas de jobs existentes | ❌ Estrutura mantida |

---

## Dados Existentes que Serão Utilizados

As 4 tabelas de jobs já contêm tudo o que precisamos:

```text
┌─────────────────────────────────────────────────────────────┐
│ upscaler_jobs / pose_changer_jobs / veste_ai_jobs /         │
│ video_upscaler_jobs                                         │
├─────────────────────────────────────────────────────────────┤
│ • user_id        → Isolamento por usuário                   │
│ • output_url     → Link direto da RunningHub (já existe)    │
│ • completed_at   → Base para calcular expiração             │
│ • status         → Filtrar apenas 'completed'               │
│ • created_at     → Ordenação (mais recente primeiro)        │
└─────────────────────────────────────────────────────────────┘
```

**Total de criações existentes:** 145 jobs completos com `output_url`

---

## Arquitetura da Solução

```text
┌────────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ToolsHeader.tsx                                                   │
│  └── Botão "📚 Minhas Criações" (só em rotas de ferramentas IA)   │
│       │                                                            │
│       ▼                                                            │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │ MyCreationsModal.tsx (Dialog/Drawer)                     │     │
│  │ ├── Filtro: [Tudo] [Imagens] [Vídeos]                   │     │
│  │ ├── Aviso: "⚠️ Arquivos expiram em 5 dias"              │     │
│  │ ├── MyCreationsGrid.tsx                                  │     │
│  │ │   ├── CreationCard.tsx (imagem)                        │     │
│  │ │   │   ├── <img src={output_url} />                     │     │
│  │ │   │   ├── Badge "Expira em 2d 5h"                      │     │
│  │ │   │   └── Botão Download                               │     │
│  │ │   │                                                    │     │
│  │ │   └── CreationCard.tsx (vídeo)                         │     │
│  │ │       ├── <video src={output_url} controls />          │     │
│  │ │       ├── Badge "Expira em 1d 3h"                      │     │
│  │ │       └── Botão Download                               │     │
│  │ │                                                        │     │
│  │ ├── Skeleton Loading                                     │     │
│  │ ├── Estado Vazio                                         │     │
│  │ └── Infinite Scroll (24 itens/batch)                     │     │
│  └──────────────────────────────────────────────────────────┘     │
│                                                                    │
└─────────────────────────────────────────────────┬──────────────────┘
                                                  │
                                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│                        BANCO DE DADOS                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  RPC: get_user_ai_creations(p_media_type, p_offset, p_limit)      │
│  │                                                                 │
│  ├── SELECT ... FROM upscaler_jobs       → media_type: 'image'    │
│  ├── SELECT ... FROM pose_changer_jobs   → media_type: 'image'    │
│  ├── SELECT ... FROM veste_ai_jobs       → media_type: 'image'    │
│  └── SELECT ... FROM video_upscaler_jobs → media_type: 'video'    │
│                                                                    │
│  Filtros automáticos:                                              │
│  • WHERE user_id = auth.uid()  (isolamento)                        │
│  • WHERE status = 'completed'                                      │
│  • WHERE output_url IS NOT NULL                                    │
│  • WHERE completed_at + interval '5 days' > now() (não expirados) │
│                                                                    │
│  Retorna:                                                          │
│  • id, output_url, tool_name, media_type                          │
│  • created_at, expires_at (calculado)                              │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Implementação - Passo a Passo

### 1. Migration SQL - RPC `get_user_ai_creations`

```sql
CREATE OR REPLACE FUNCTION public.get_user_ai_creations(
  p_media_type TEXT DEFAULT 'all',  -- 'all', 'image', 'video'
  p_offset INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 24
)
RETURNS TABLE (
  id UUID,
  output_url TEXT,
  tool_name TEXT,
  media_type TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH all_creations AS (
    -- Upscaler (imagens)
    SELECT 
      uj.id,
      uj.output_url,
      'Upscaler Arcano'::TEXT as tool_name,
      'image'::TEXT as media_type,
      uj.created_at,
      (uj.completed_at + interval '5 days') as expires_at
    FROM upscaler_jobs uj
    WHERE uj.user_id = auth.uid()
      AND uj.status = 'completed'
      AND uj.output_url IS NOT NULL
      AND (uj.completed_at + interval '5 days') > now()
    
    UNION ALL
    
    -- Pose Changer (imagens)
    SELECT 
      pcj.id,
      pcj.output_url,
      'Pose Changer'::TEXT,
      'image'::TEXT,
      pcj.created_at,
      (pcj.completed_at + interval '5 days')
    FROM pose_changer_jobs pcj
    WHERE pcj.user_id = auth.uid()
      AND pcj.status = 'completed'
      AND pcj.output_url IS NOT NULL
      AND (pcj.completed_at + interval '5 days') > now()
    
    UNION ALL
    
    -- Veste AI (imagens)
    SELECT 
      vaj.id,
      vaj.output_url,
      'Veste AI'::TEXT,
      'image'::TEXT,
      vaj.created_at,
      (vaj.completed_at + interval '5 days')
    FROM veste_ai_jobs vaj
    WHERE vaj.user_id = auth.uid()
      AND vaj.status = 'completed'
      AND vaj.output_url IS NOT NULL
      AND (vaj.completed_at + interval '5 days') > now()
    
    UNION ALL
    
    -- Video Upscaler (vídeos)
    SELECT 
      vuj.id,
      vuj.output_url,
      'Video Upscaler'::TEXT,
      'video'::TEXT,
      vuj.created_at,
      (vuj.completed_at + interval '5 days')
    FROM video_upscaler_jobs vuj
    WHERE vuj.user_id = auth.uid()
      AND vuj.status = 'completed'
      AND vuj.output_url IS NOT NULL
      AND (vuj.completed_at + interval '5 days') > now()
  )
  SELECT * FROM all_creations ac
  WHERE (p_media_type = 'all' OR ac.media_type = p_media_type)
  ORDER BY ac.created_at DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;
```

### 2. Novos Componentes React

| Arquivo | Descrição |
|---------|-----------|
| `src/components/ai-tools/creations/MyCreationsModal.tsx` | Modal/Drawer principal com filtros |
| `src/components/ai-tools/creations/MyCreationsGrid.tsx` | Grid responsivo com infinite scroll |
| `src/components/ai-tools/creations/CreationCard.tsx` | Card individual (imagem/vídeo) |
| `src/components/ai-tools/creations/useMyCreations.ts` | Hook para buscar dados da RPC |
| `src/components/ai-tools/creations/index.ts` | Barrel export |

### 3. Modificação no ToolsHeader.tsx

Adicionar botão "Minhas Criações" que abre o modal:

```tsx
// Novo state
const [showCreationsModal, setShowCreationsModal] = useState(false);

// No JSX, antes do dropdown de usuário
{user && (
  <Button
    variant="ghost"
    size="sm"
    onClick={() => setShowCreationsModal(true)}
    className="text-purple-300 hover:text-white"
  >
    <Library className="w-4 h-4 mr-2" />
    Minhas Criações
  </Button>
)}

// No final
<MyCreationsModal 
  open={showCreationsModal} 
  onClose={() => setShowCreationsModal(false)} 
/>
```

---

## Detalhes de UX

### Expiração Visual

```text
┌─────────────────────────────────────────┐
│  ┌─────────────────────────────────┐   │
│  │        [IMAGEM/VIDEO]           │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│  ┌──────────────┐  ┌────────────────┐  │
│  │ ⏱️ 4d 12h    │  │ 📥 Download   │  │
│  └──────────────┘  └────────────────┘  │
│  Upscaler Arcano • 02/02/2026 14:30    │
└─────────────────────────────────────────┘
```

### Cores do Badge de Expiração

| Tempo Restante | Cor |
|----------------|-----|
| > 3 dias | 🟢 Verde |
| 1-3 dias | 🟡 Amarelo |
| < 1 dia | 🔴 Vermelho pulsante |

### Estado Vazio

```text
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                     🎨                                      │
│                                                             │
│     Você ainda não tem criações aqui.                       │
│                                                             │
│     Gere algo em uma das ferramentas de IA                  │
│     para aparecer nesta lista.                              │
│                                                             │
│     [ Ir para Upscaler Arcano ]                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Checklist de Aceitação

| Requisito | Implementação |
|-----------|---------------|
| ✅ Usuário logado vê apenas os próprios itens | RPC com `auth.uid()` |
| ✅ Lista ordenada por data (desc) | `ORDER BY created_at DESC` |
| ✅ Filtro "Tudo / Imagens / Vídeos" | Parâmetro `p_media_type` na RPC |
| ✅ Aviso claro de expiração (5 dias) | Banner + badge em cada card |
| ✅ Itens somem ao expirar | `WHERE expires_at > now()` |
| ✅ Nenhuma mídia salva no storage | Usa `output_url` diretamente |
| ✅ Não mexeu em Edge Functions | Nenhuma alteração |
| ✅ Não afetou outras features | Componentes isolados |

---

## Arquivos a Criar/Modificar

| Ação | Arquivo |
|------|---------|
| ➕ Criar | `supabase/migrations/xxx_create_get_user_ai_creations.sql` |
| ➕ Criar | `src/components/ai-tools/creations/MyCreationsModal.tsx` |
| ➕ Criar | `src/components/ai-tools/creations/MyCreationsGrid.tsx` |
| ➕ Criar | `src/components/ai-tools/creations/CreationCard.tsx` |
| ➕ Criar | `src/components/ai-tools/creations/useMyCreations.ts` |
| ➕ Criar | `src/components/ai-tools/creations/index.ts` |
| ✏️ Modificar | `src/components/ToolsHeader.tsx` |

