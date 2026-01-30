
# Plano: Duplicar Página de Planos

## Objetivo
Criar uma cópia da página de planos atual (`Planos.tsx`) em um novo arquivo (`Planos2.tsx`) com uma rota separada (`/planos-2`), permitindo que você faça alterações livremente sem afetar a navegação e a página de planos atual.

## O que será feito

### 1. Criar novo arquivo de página
- Criar `src/pages/Planos2.tsx` como uma cópia exata de `src/pages/Planos.tsx`
- Manter todo o código idêntico (planos, preços, estilos, badges, etc.)

### 2. Adicionar rota no App.tsx
- Importar o novo componente `Planos2` com lazy loading
- Adicionar a rota `/planos-2` apontando para o novo componente

## Resultado
- A página atual `/planos` continua funcionando normalmente
- A nova página `/planos-2` estará disponível para edições futuras
- Nenhum link ou navegação será alterado - a nova página só é acessível via URL direta

## Detalhes Técnicos

**Arquivo a ser criado:**
- `src/pages/Planos2.tsx` - Cópia completa do `Planos.tsx`

**Arquivo a ser modificado:**
- `src/App.tsx` - Adicionar import lazy e nova rota

**Nova rota:**
```
/planos-2 → Planos2 (sem link na navegação)
```
