

# Migração do Upscaler: Pessoas sem Detalhar Rosto → Nova API

## Resumo
Quando o tipo de imagem for "Pessoas" e o switch "Detalhar Rosto" estiver desativado (detailDenoise = 0), tanto V3 Turbo quanto V3 Pro usarão a nova webapp `2037188547966406658` com apenas 2 nós: imagem (1) e resolução (548).

## Alterações

### 1. Adicionar nova webapp ID
**Arquivo:** `supabase/functions/runninghub-queue-manager/index.ts`

Adicionar ao objeto `WEBAPP_IDS.upscaler_jobs`:
```ts
pessoas_sem_rosto: '2037188547966406658',
```

### 2. Modificar roteamento na função `buildNodeInfoList`
**Arquivo:** `supabase/functions/runninghub-queue-manager/index.ts` (linhas ~1257-1277)

Substituir a lógica atual de `framingMode === 'longe'` e o bloco `else` (que usa pro/standard) por:

```
if categoria é pessoas (pessoas_perto ou pessoas_longe) E detailDenoise é 0/undefined/falsy:
  → webapp pessoas_sem_rosto (2037188547966406658)
  → nós: { nodeId: "1", image } + { nodeId: "548", resolução }
else (pessoas COM detalhar rosto ativo):
  → mantém webapp pro/standard existente (será reconfigurado depois)
```

Isso garante que:
- A webapp `longe` (`2020634325636616194`) deixa de ser usada para pessoas
- Ambos V3 Turbo e V3 Pro sem detalhar rosto vão para a mesma nova API
- Nenhuma outra categoria (comida, logo, render3d, fotoAntiga) é afetada

### 3. Remover referência `longe` do WEBAPP_IDS (opcional)
Pode ser removida agora ou mantida até confirmar que não é mais usada em nenhum outro fluxo.

## O que NÃO muda
- Frontend (já não tem mais botões perto/longe)
- Categorias comida, logo, render3d, fotoAntiga
- Fluxo de webhook, créditos, fila
- Lógica de "Detalhar Rosto" ativo (será reconfigurado em próximo passo)

