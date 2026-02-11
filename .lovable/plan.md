

## Politica Universal de Storage para Todas as IAs (Atuais e Futuras)

### Problema

Cada ferramenta de IA tem sua propria politica individual de Storage RLS. Quando uma nova ferramenta e criada, se a politica nao for adicionada manualmente, da erro "violates row-level security policy". Isso ja aconteceu com o Arcano Cloner e pode acontecer com qualquer IA futura.

### Solucao

Criar UMA UNICA politica universal que cobre qualquer ferramenta de IA, atual ou futura. A regra e simples:

- Bucket: `artes-cloudinary`
- Pasta: `{qualquer-nome}/{user_id}/`
- Requisito: usuario autenticado e o segundo nivel da pasta e o proprio user_id

Isso significa que qualquer nova IA que siga o padrao `nome-da-ia/{user_id}/arquivo.webp` vai funcionar automaticamente, sem precisar criar politica nova.

### Mudancas no Banco de Dados

1. **Remover** as 6 politicas individuais que ja existem (arcano-cloner, character-generator, pose-changer, veste-ai, video-upscaler, upscaler)
2. **Criar** 1 politica universal que substitui todas

```text
-- Remove as 6 politicas individuais
DROP POLICY IF EXISTS "Authenticated users can upload to arcano-cloner folder" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to character-generator folder" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to pose-changer folder" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to veste-ai folder" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to video-upscaler folder" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to upscaler folder" ON storage.objects;

-- Cria 1 politica universal
CREATE POLICY "Authenticated users can upload to own AI tool folders"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'artes-cloudinary'
  AND (storage.foldername(name))[2] = (auth.uid())::text
  AND auth.uid() IS NOT NULL
);
```

3. **Manter** as politicas de `user/` e `reference/` (essas nao seguem o padrao `{tool}/{user_id}/`)

### Regra no RULES.md

Adicionar regra permanente no arquivo `.lovable/RULES.md` para que toda IA futura siga o padrao de upload `nome-da-ferramenta/{user_id}/` e nunca mais precise de politica individual.

### Resumo

| Tipo | Detalhe |
|------|---------|
| Migration SQL | Remover 6 politicas, criar 1 universal |
| RULES.md | Adicionar regra de padrao de Storage para IAs |
| Arquivos de codigo | Nenhum - todas as ferramentas ja usam o padrao correto |

A partir desta mudanca, qualquer nova ferramenta de IA que fizer upload para `artes-cloudinary` no padrao `nome-da-ia/{user_id}/` vai funcionar automaticamente sem nenhuma configuracao adicional.

