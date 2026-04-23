

## Plano: Contabilizar ganhos de colaborador quando prompt é usado em ferramentas de IA

### Problema identificado

Quando o usuário clica "Gerar foto" / "Gerar movie" na Biblioteca de Prompts, o `reference_prompt_id` **NÃO é passado** na navegação para as ferramentas. Resultado: o job é criado com `reference_prompt_id: NULL`, e o sistema de earnings no `runninghub-queue-manager/finish` não contabiliza nada para o colaborador.

**Seedance 2** é o ÚNICO que já funciona corretamente — passa `prefillPromptId` e `prefillPromptType` no state de navegação.

**Ferramentas quebradas:**
- Arcano Cloner — não passa promptId no navigate, não lê do location.state
- MovieLED Maker — não passa partnerId no navigate, o `selectedLibraryItem.id` não é o prompt_id correto da `media_library`
- Pose Changer / Veste AI — só funcionam via seleção na foto-library interna (que já tem meta), mas se houver navegação direta da biblioteca, não funciona

### Correções (4 arquivos, zero impacto no fluxo de geração)

**1. `src/pages/BibliotecaPrompts.tsx` — Passar promptId/partnerId no state de navegação**

Em TODOS os botões "Gerar foto", "Gerar movie" (tanto nos cards quanto no modal):

```typescript
// Arcano Cloner (linhas 833 e 1090)
navigate('/arcano-cloner-tool', { 
  state: { 
    referenceImageUrl: item.imageUrl,
    prefillPromptId: item.partnerId ? String(item.id) : null,
    prefillPromptType: item.partnerId ? 'partner' : null,
  } 
});

// MovieLED Maker (linhas 847-858)
navigate('/movieled-maker', {
  state: {
    preSelectedItem: { ... },
    prefillPromptId: item.partnerId ? String(item.id) : null,
    prefillPromptType: item.partnerId ? 'partner' : null,
  }
});
```

**2. `src/pages/ArcanoClonerTool.tsx` — Ler promptId do location.state**

No useEffect que já lê `referenceImageUrl` (linha 144-151), adicionar leitura do `prefillPromptId`:

```typescript
useEffect(() => {
  const state = location.state as any;
  if (state?.referenceImageUrl && !referenceImage) {
    handleReferenceImageChange(state.referenceImageUrl);
  }
  if (state?.prefillPromptType === 'partner' && state?.prefillPromptId) {
    setReferencePromptId(state.prefillPromptId);
  }
}, [location.state]);
```

**3. `src/pages/MovieLedMakerTool.tsx` — Ler promptId do location.state**

No useEffect que lê `preSelectedItem` (linha 104-113), adicionar:

```typescript
useEffect(() => {
  const state = location.state as any;
  if (state?.preSelectedItem) {
    setSelectedLibraryItem(state.preSelectedItem);
    // Se veio da biblioteca com prompt de parceiro, guardar o ID correto
    if (state?.prefillPromptType === 'partner' && state?.prefillPromptId) {
      setReferencePromptId(state.prefillPromptId);
    }
  }
}, [location.state]);
```

E garantir que o `referencePromptId` do state tenha prioridade sobre `selectedLibraryItem?.id` no body da função invoke (linha 435).

**4. Verificar `runninghub-queue-manager` e `runninghub-movieled-maker`**

A edge function `runninghub-movieled-maker` já recebe `referencePromptId` e salva no banco. O `runninghub-queue-manager/finish` já lê `reference_prompt_id` e chama `register_collaborator_tool_earning`. Essas partes estão corretas — o problema é 100% no frontend que não passa o dado.

### O que NÃO será alterado (preservação do fluxo)

- Nenhuma mudança nas edge functions de geração (RunningHub, Evolink)
- Nenhuma mudança no fluxo de créditos do usuário
- Nenhuma mudança no webhook ou queue manager
- A contabilização acontece DEPOIS do job completar (já implementado no `/finish`)
- Toda lógica é non-blocking (try/catch com console.error)

### Tabela de preços já configurada

| Ferramenta | Valor por uso |
|---|---|
| Arcano Cloner | R$ 0,16 |
| MovieLED Maker | R$ 0,80 |
| Pose Changer | R$ 0,10 |
| Veste AI | R$ 0,10 |
| Seedance 2 | R$ 1,20 |

