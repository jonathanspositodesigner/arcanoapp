
# Plano de Otimização de Performance da Landing Page

## Diagnóstico do Problema

A landing page `/combo-artes-arcanas` está demorando ~3 segundos para carregar devido a JavaScript excessivo sendo baixado e processado no início. Os principais problemas identificados são:

1. **Meta Pixel duplicado** - O script do Facebook Pixel está sendo carregado duas vezes:
   - Uma vez no `index.html` (global)
   - Outra vez dentro do componente `ComboArtesArcanas.tsx`

2. **Scripts de terceiros no `<head>`** - Meta Pixel e Microsoft Clarity estão no head sem defer, competindo com o carregamento do React

3. **Barrel export problemático** - O arquivo `src/components/combo-artes/index.ts` exporta TODOS os componentes, fazendo o bundler incluir código que deveria ser lazy loaded

4. **Ícone Lucide importado desnecessariamente** - O `ChevronDown` é um ícone simples que pode ser um SVG inline

---

## Solução Proposta

### 1. Remover Meta Pixel duplicado do componente
O script já está no `index.html`, então a inicialização dentro do `ComboArtesArcanas.tsx` é redundante e desnecessária.

**Arquivo:** `src/pages/ComboArtesArcanas.tsx`
- Remover o `useEffect` que inicializa o Meta Pixel (linhas 61-80)
- Manter apenas o tracking de `ViewContent` que usa o `fbq` já disponível globalmente

### 2. Otimizar scripts de terceiros no index.html
Adicionar atributos `defer` ou mover scripts para o final do body para não bloquear renderização.

**Arquivo:** `index.html`
- Adicionar comentários indicando que scripts são async por natureza
- Os scripts do Facebook e Clarity já usam `async=true` internamente, mas podemos garantir que não bloqueiam com uma pequena reorganização

### 3. Corrigir barrel export para não puxar componentes lazy
O problema é que importar de `@/components/combo-artes` força o Vite a carregar TODOS os exports, mesmo que só usemos `HeroSectionCombo` e `FeaturesSection`.

**Arquivo:** `src/pages/ComboArtesArcanas.tsx`
- Mudar de: `import { HeroSectionCombo, FeaturesSection } from "@/components/combo-artes";`
- Para imports diretos:
  ```tsx
  import { HeroSectionCombo } from "@/components/combo-artes/HeroSectionCombo";
  import { FeaturesSection } from "@/components/combo-artes/FeaturesSection";
  ```

### 4. Substituir ChevronDown por SVG inline
O ícone `ChevronDown` é super simples - uma seta. Usar SVG inline elimina a necessidade de importar todo o módulo lucide-react no bundle inicial.

**Arquivo:** `src/pages/ComboArtesArcanas.tsx`
- Remover: `import { ChevronDown } from "lucide-react";`
- Criar componente inline:
  ```tsx
  const ChevronDownIcon = () => (
    <svg className="w-8 h-8 text-[#EF672C] drop-shadow-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6,9 12,15 18,9" />
    </svg>
  );
  ```

---

## Impacto Esperado

| Métrica | Antes | Depois Estimado |
|---------|-------|-----------------|
| JavaScript não usado | ~154 KiB | ~80 KiB |
| Tempo de carregamento | ~3s | ~1.5-2s |
| Chunks carregados inicialmente | ui-vendor, index, supabase | Apenas index simplificado |

---

## Detalhes Técnicos

### Arquivos a serem modificados:

1. **`src/pages/ComboArtesArcanas.tsx`**
   - Remover import do lucide-react
   - Remover useEffect do Meta Pixel
   - Mudar imports para caminhos diretos (não barrel)
   - Adicionar SVG inline para seta

2. **`src/components/combo-artes/index.ts`** (opcional)
   - Remover exports dos componentes lazy para evitar confusão futura
   - Manter apenas HeroSectionCombo e FeaturesSection como exports do barrel

### Ordem de execução:
1. Modificar imports no ComboArtesArcanas.tsx
2. Remover useEffect duplicado do Meta Pixel
3. Substituir ChevronDown por SVG inline
4. Testar build e verificar tamanho dos chunks

---

## Resumo

A otimização foca em eliminar código JavaScript desnecessário no carregamento inicial:
- Remover script duplicado do Facebook Pixel
- Evitar que barrel exports puxem código lazy
- Usar SVG inline ao invés de importar biblioteca de ícones

Essas mudanças devem reduzir significativamente o tempo de carregamento inicial sem alterar nenhuma funcionalidade ou visual da página.
