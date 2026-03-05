

# Corrigir navegação do bônus "Movies para Telão"

## Problema
O pack "Movies para Telão" é do tipo `bonus` e **não tem `download_url`** (é `null`). Ele possui 17 vídeos com links do Canva já cadastrados.

O problema está na função `handleBonusAction` (botão de ação do card). Quando o usuário é premium mas o `download_url` é null, a lógica atual redireciona para `/planos-artes` ao invés de abrir a visualização do pack:

```text
handleBonusAction:
  premium + download_url → abre link externo ✓
  !premium → vai pra /planos-artes ✓
  premium + SEM download_url → vai pra /planos-artes ✗ (ERRADO)
```

A ação do card principal (onClick) já trata corretamente este caso (abre o pack view), mas o botão sobreposto intercepta o clique com `stopPropagation`.

## Correção

### `src/pages/BibliotecaArtes.tsx`
Alterar a função `handleBonusAction` (~linha 786-793) para que, quando premium sem `download_url`, abra a visualização do pack ao invés de redirecionar:

```typescript
const handleBonusAction = (e: React.MouseEvent) => {
  e.stopPropagation();
  if (isPremium && pack.download_url) {
    window.open(pack.download_url, '_blank');
  } else if (isPremium && !pack.download_url) {
    // Sem download_url: abrir visualização do pack (ex: Movies para Telão)
    setSelectedPack(pack.name);
    setSelectedCategory("Todos");
    setCurrentPage(1);
  } else {
    navigate('/planos-artes');
  }
};
```

Também alterar o texto do botão para mostrar "Ver conteúdo" ao invés de "Download" quando não há `download_url` (~linha 885-895):

```typescript
{isBonusType ? (
  <Button size="sm" className={...} onClick={handleBonusAction}>
    {isPremium ? (
      pack.download_url ? (
        <><Download className="h-3 w-3 mr-1" /> {t('buttons.downloadBonus')}</>
      ) : (
        <><Eye className="h-3 w-3 mr-1" /> Ver conteúdo</>
      )
    ) : (
      // ... keep existing non-premium layout
    )}
  </Button>
) : ...}
```

Isso é tudo. Os 17 vídeos já estão cadastrados com `canva_link` e `motion_type: canva`, então a grid de artes e o modal de detalhe com "Abrir no Canva" já funcionam automaticamente ao abrir o pack view.

