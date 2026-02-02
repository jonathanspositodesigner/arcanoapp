

# Plano: Modal de "Sem Créditos" no Upscaler Arcano

## Objetivo

Quando o usuário não estiver logado **OU** não tiver créditos suficientes, ao clicar para gerar a imagem, exibir um popup amigável ao invés de apenas um toast de erro. O popup terá um botão que leva para a página de compra de créditos (`/planos-creditos`).

---

## Componente a Criar

### `NoCreditsModal.tsx`

Um novo componente de modal reutilizável com:

- Ícone de moedas/coins em destaque
- Título: "Ops, você não tem créditos!"
- Descrição explicativa sobre o que são créditos
- Botão principal: "Recarregar Créditos" → redireciona para `/planos-creditos`
- Botão secundário: "Fazer Login" (exibido apenas quando o usuário não está logado)

**Estrutura visual baseada no `ExpiredSubscriptionModal.tsx` já existente.**

---

## Lógica de Exibição

O modal será aberto nas seguintes situações:

| Situação | Condição | Ação |
|----------|----------|------|
| Usuário não logado | `!user?.id` | Mostrar modal com opção de login |
| Créditos insuficientes | `credits < creditCost` | Mostrar modal para recarregar |
| Erro do backend | `code === 'INSUFFICIENT_CREDITS'` | Mostrar modal para recarregar |

---

## Modificações em `UpscalerArcanoTool.tsx`

1. **Adicionar estado para controlar o modal:**
```tsx
const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
const [noCreditsReason, setNoCreditsReason] = useState<'not_logged' | 'insufficient'>('insufficient');
```

2. **Substituir os `toast.error` por abertura do modal:**
```tsx
// Antes:
if (!user?.id) {
  toast.error('Você precisa estar logado...');
  return;
}
if (credits < creditCost) {
  toast.error(`Créditos insuficientes...`);
  return;
}

// Depois:
if (!user?.id) {
  setNoCreditsReason('not_logged');
  setShowNoCreditsModal(true);
  return;
}
if (credits < creditCost) {
  setNoCreditsReason('insufficient');
  setShowNoCreditsModal(true);
  return;
}
```

3. **Tratar erro do backend também:**
```tsx
if (runResponse.data?.code === 'INSUFFICIENT_CREDITS') {
  setNoCreditsReason('insufficient');
  setShowNoCreditsModal(true);
  setStatus('idle');
  refetchCredits();
  return;
}
```

4. **Renderizar o modal no JSX:**
```tsx
<NoCreditsModal
  isOpen={showNoCreditsModal}
  onClose={() => setShowNoCreditsModal(false)}
  reason={noCreditsReason}
/>
```

---

## Arquivos a Modificar/Criar

| Arquivo | Ação |
|---------|------|
| `src/components/upscaler/NoCreditsModal.tsx` | **Criar** - Novo componente de modal |
| `src/pages/UpscalerArcanoTool.tsx` | **Modificar** - Adicionar estado e lógica do modal |

---

## Design do Modal

```text
┌────────────────────────────────────────┐
│                                        │
│              🪙 (ícone)                │
│                                        │
│    Ops, você não tem créditos!         │
│                                        │
│    Você precisa de créditos para       │
│    usar o Upscaler Arcano. Recarregue  │
│    agora e continue melhorando suas    │
│    imagens!                            │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │    🪙 Recarregar Créditos        │  │
│  └──────────────────────────────────┘  │
│                                        │
│  (Se não logado:)                      │
│  ┌──────────────────────────────────┐  │
│  │         Fazer Login              │  │
│  └──────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
```

---

## Detalhes Técnicos

- O modal usa os componentes existentes: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `Button`
- A navegação usa `useNavigate` do react-router-dom
- O botão de login leva para `/user-login` (rota de login padrão do sistema)
- O botão de créditos leva para `/planos-creditos`
- Gradiente roxo/amarelo no botão principal para destacar a ação

