

# Corrigir links de checkout dos créditos avulsos

## Problema
Os links de checkout dos pacotes avulsos estão errados em duas páginas.

## Links corretos
- **1.500 créditos**: `https://payfast.greenn.com.br/156946/offer/C5k6VZ`
- **4.200 créditos**: `https://payfast.greenn.com.br/156948/offer/lwl67R`
- **14.000 créditos**: `https://payfast.greenn.com.br/156952/offer/oJmWhP`

## Arquivos a alterar

### 1. `src/pages/PlanosCreditos.tsx`
- Linha 58: trocar `9trhhb9` → `156946/offer/C5k6VZ`
- Linha 68: trocar `y3u2u3d` → `156948/offer/lwl67R`
- Linha 79: trocar `vwfzrw2` → `156952/offer/oJmWhP`

### 2. `src/pages/Planos2.tsx`
- Linha 562: trocar `9trhhb9` → `156946/offer/C5k6VZ`
- Linha 563: trocar `y3u2u3d` → `156948/offer/lwl67R`
- Linha 564: trocar `vwfzrw2` → `156952/offer/oJmWhP`

Seis substituições simples de URL, sem mudança de lógica.

