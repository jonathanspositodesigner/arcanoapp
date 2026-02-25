

# Limpeza Automatica de TODOS os Arquivos de IA (Inputs + Outputs) - 24 Horas

## Resumo
Criar uma Edge Function (`cleanup-ai-storage`) que roda automaticamente a cada 6 horas e apaga TODOS os arquivos com mais de 24 horas das pastas de ferramentas de IA no bucket `artes-cloudinary`. Isso inclui tanto os inputs (imagens que o usuario sobe) quanto os outputs (resultados gerados pela RunningHub ou Gemini).

## Pastas que serao limpas

Todas as pastas de IA no bucket `artes-cloudinary`:

```text
Pasta                    | Conteudo
-------------------------|----------------------------------
upscaler/                | Input + Output do Upscaler Arcano
arcano-cloner/           | Input (rosto + referencia) do Arcano Cloner
pose-changer/            | Input (pessoa + referencia) do Pose Changer
veste-ai/                | Input (pessoa + roupa) do Veste AI
character-generator/     | Input (4 fotos rosto) do Gerador Avatar
flyer-maker/             | Input (referencia + fotos) do Flyer Maker
video-upscaler/          | Input (video original) do Video Upscaler
image-generator/         | Output (imagem gerada por texto) do Gerar Imagem
video-generator/         | Output (video gerado) do Gerar Video
```

Pastas que NAO serao afetadas (conteudo permanente da plataforma):
- Raiz do bucket (artes admin/parceiros)
- `downloads/` (artes para download)
- `admin_artes/` (artes admin)
- Qualquer outra pasta que nao seja das IAs listadas acima

## O que sera criado

### 1. Edge Function `cleanup-ai-storage/index.ts`
- Usa o padrao estavel (`serve` + `npm:@supabase/supabase-js@2`) conforme RULES.md
- Usa `service_role` key para ter permissao de deletar arquivos de qualquer usuario
- Para cada pasta de IA:
  - Lista todos os subdiretorios (user_ids)
  - Para cada user_id, lista os arquivos
  - Filtra arquivos com `created_at` mais velho que 24 horas
  - Deleta em batch usando `storage.from().remove()`
- Retorna relatorio JSON com total deletado por pasta
- `verify_jwt = false` no config.toml (sera chamado pelo cron)

### 2. Cron Job (pg_cron)
- Roda a cada 6 horas: `0 */6 * * *`
- Chama a edge function via `net.http_post`
- Usa as extensoes `pg_cron` e `pg_net` ja habilitadas no projeto

### 3. Entrada no `supabase/config.toml`
- Adicionar `[functions.cleanup-ai-storage]` com `verify_jwt = false`

## Garantias de seguranca

- A lista de pastas de IA e fixa e explicita no codigo (whitelist) -- nao apaga nada fora dessas pastas
- Qualquer nova ferramenta de IA que siga o padrao `nome-ferramenta/{user_id}/arquivo` pode ser adicionada simplesmente acrescentando o nome na lista
- Conteudo da plataforma (artes, downloads, admin) NAO e afetado
- Nenhum upload existente das ferramentas de IA sera quebrado -- os uploads continuam funcionando normalmente, apenas os arquivos sao limpos depois de 24h

## Impacto no dashboard de Custos IA

O slider antes/depois no modal de jobs continuara funcionando normalmente nas primeiras 24 horas. Apos isso, as imagens terao sido apagadas do storage e o slider mostrara "Resultado expirado (mais de 24h)" -- que ja esta implementado.

## Detalhes tecnicos

**Nenhuma alteracao no frontend** -- apenas backend.

**Arquivos criados/modificados:**
1. `supabase/functions/cleanup-ai-storage/index.ts` (nova edge function)
2. `supabase/config.toml` (nova entrada) -- atualizado automaticamente
3. Cron job via SQL insert (nao migracao, pois contem dados especificos do projeto)

**Nenhuma migracao SQL necessaria** -- apenas a edge function + cron.

