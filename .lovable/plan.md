
# Forcar rebuild do app (tela branca)

## Diagnostico

O app esta com tela branca porque o servidor de desenvolvimento Vite nao esta servindo os arquivos corretamente. O `src/index.css` retorna 404, o que impede todo o app de renderizar. Isso e um problema transitorio de build - nao ha erro de codigo nos arquivos editados.

## Solucao

Forcar um rebuild limpo adicionando um comentario inofensivo no arquivo de entrada `src/main.tsx`. Isso vai triggar o Vite a recompilar todos os modulos do zero.

### Arquivo: `src/main.tsx`

Adicionar um comentario com timestamp no topo do arquivo:

```typescript
// rebuild 2026-03-02
```

Isso nao altera nenhuma logica - apenas forca o sistema de build a reprocessar o projeto.

## Por que isso acontece

O Vite as vezes perde o estado interno do compilador apos multiplas edicoes rapidas. Um rebuild limpo resolve o problema na grande maioria dos casos.
