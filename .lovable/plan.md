
# Remover Seção NanoBanana e Adicionar Badges na Galeria (com correção de texto)

## O que será feito

1. **Remover** a seção ENGINE / NANOBANANA PRO (linhas 337-352)
2. **Adicionar badges** logo abaixo da `<ExpandingGallery />` na seção "Veja o que o Arcano Cloner é capaz de fazer"
3. **Badge "Sem Precisar de Prompt"** no lugar de "Fotorrealista" (conforme solicitado)

## Badges que serão adicionados (após a galeria)

| Badge | Ícone |
|---|---|
| Motor de IA Avançado | Zap |
| **Sem Precisar de Prompt** | MousePointerClick |
| Geração em Segundos | Clock |

Mais um texto curto de suporte centralizado abaixo dos badges.

## Arquivo modificado

- `src/pages/PlanosArcanoCloner.tsx`
  - Linhas 264-265: inserir badges + texto após `<ExpandingGallery />`
  - Linhas 337-352: remover bloco ENGINE / NANOBANANA PRO integralmente
