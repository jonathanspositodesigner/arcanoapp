
# Remoção do Sistema de Recuperação de Jobs

## Resumo

Remover completamente o sistema de recuperação de sessão e os avisos de saída de página de todas as 4 ferramentas de IA. Se o usuário sair da página, ele perde o fluxo e os créditos para sempre.

---

## O que será removido

### 1. Recuperação de Sessão via localStorage
- Lógica que salva/recupera `session_id` do localStorage
- Função `checkPendingJobs()` que busca jobs pendentes ao carregar a página
- Toast de "Recuperando upscale em andamento..."

### 2. Aviso ao Sair (beforeunload)
- Evento que mostra confirmação quando o usuário tenta fechar a aba durante processamento

---

## Arquivos a Modificar

### 1. `src/pages/UpscalerArcanoTool.tsx`

**Remover:**
- Linhas 101-110: useEffect que recupera/salva session_id do localStorage
- Linhas 146-157: useEffect do beforeunload
- Linhas 160-185: useEffect com checkPendingJob (e também verificação de job completado recente)

**Simplificar:**
- Gerar sessionId apenas uma vez (sem persistir)

### 2. `src/pages/PoseChangerTool.tsx`

**Remover:**
- Linhas 71-81: useEffect de inicialização de sessão + checkPendingJobs
- Linhas 84-107: função checkPendingJobs completa
- Linhas 190-200: useEffect do beforeunload

**Simplificar:**
- Gerar sessionId apenas uma vez (sem persistir)

### 3. `src/pages/VesteAITool.tsx`

**Remover:**
- Linhas 71-81: useEffect de inicialização de sessão + checkPendingJobs
- Linhas 84-107: função checkPendingJobs completa
- Linhas 190-200: useEffect do beforeunload

**Simplificar:**
- Gerar sessionId apenas uma vez (sem persistir)

### 4. `src/pages/VideoUpscalerTool.tsx`

**Remover:**
- Linhas 68-78: useEffect de inicialização de sessão + checkPendingJobs
- Linhas 81-104: função checkPendingJobs completa
- Linhas 187-197: useEffect do beforeunload

**Simplificar:**
- Gerar sessionId apenas uma vez (sem persistir)

---

## Código Resultante (Padrão para todas)

O sessionId será gerado apenas uma vez ao montar o componente, sem localStorage:

```typescript
// Antes (REMOVER)
useEffect(() => {
  let storedSessionId = localStorage.getItem(SESSION_KEY);
  if (!storedSessionId) {
    storedSessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, storedSessionId);
  }
  sessionIdRef.current = storedSessionId;
  checkPendingJobs();
}, []);

// Depois (MANTER SIMPLES)
useEffect(() => {
  sessionIdRef.current = crypto.randomUUID();
}, []);
```

---

## Comportamento Final

| Antes | Depois |
|-------|--------|
| Sair da página → Aviso de confirmação | Sair da página → Nenhum aviso |
| Voltar à página → Recupera job pendente | Voltar à página → Começa do zero |
| Session ID persistido no localStorage | Session ID novo a cada visita |
| Créditos "protegidos" pela recuperação | Créditos perdidos se sair |

---

## Detalhes Técnicos

- O `sessionIdRef` continua sendo usado para identificar jobs durante a sessão atual
- A constante `SESSION_KEY` pode ser removida das ferramentas
- Nenhuma alteração no backend/webhook necessária
- RLS continua funcionando normalmente (filtra por user_id)
