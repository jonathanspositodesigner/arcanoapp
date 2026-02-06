

# Plano: Otimização de Imagens para Admin Upload (800px + WebP)

## Resumo

Configurar as páginas de upload de admin para redimensionar automaticamente todas as imagens para no máximo **800px** (largura ou altura) e converter para **WebP** antes do upload.

---

## Situação Atual

As páginas de admin upload já usam a função `optimizeImage`, mas com as configurações padrão:
- **Dimensão máxima atual:** 2048px
- **Formato:** WebP ✅ (já funciona)

A função `optimizeImage` já suporta o parâmetro `maxWidthOrHeight`, só precisamos passar o valor `800`.

---

## Solução

Passar `{ maxWidthOrHeight: 800 }` como segundo parâmetro da função `optimizeImage` nas duas páginas.

---

## Arquivos a Modificar

| Arquivo | Linha | Mudança |
|---------|-------|---------|
| `src/pages/AdminUpload.tsx` | 175 | `optimizeImage(file)` → `optimizeImage(file, { maxWidthOrHeight: 800 })` |
| `src/pages/AdminUploadArtes.tsx` | 175 | `optimizeImage(file)` → `optimizeImage(file, { maxWidthOrHeight: 800 })` |

---

## Detalhes Técnicos

### Antes (linha 175 em ambos os arquivos):
```typescript
const result = await optimizeImage(file);
```

### Depois:
```typescript
const result = await optimizeImage(file, { maxWidthOrHeight: 800 });
```

---

## Comportamento Resultante

1. ✅ Imagens com largura ou altura > 800px serão redimensionadas para 800px (mantendo proporção)
2. ✅ Todas as imagens serão convertidas para WebP (já funcionava)
3. ✅ Qualidade de 85% (padrão otimizado)
4. ✅ Imagens < 100KB não são processadas (já existe essa otimização)
5. ✅ Processamento 100% no navegador do usuário (custo zero de servidor)

---

## Impacto

- Mudança de **1 linha** em cada arquivo
- Redução significativa no tamanho das imagens de preview/galeria
- Carregamento mais rápido para usuários finais
- Menor consumo de storage no banco de dados

