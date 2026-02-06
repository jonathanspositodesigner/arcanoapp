
# Plano: Migrar 6 Arquivos de Movies para Telão

## Resumo
Mover 6 arquivos que foram subidos incorretamente na Biblioteca de Artes Arcanas para a Biblioteca de Prompts, na categoria "Movies para Telão".

---

## Arquivos a serem migrados

| Título | Status Atual | Destino |
|--------|--------------|---------|
| Paredão | admin_artes (telao-led) | admin_prompts (Movies para Telão) |
| Retrô syntwave | admin_artes (telao-led) | admin_prompts (Movies para Telão) |
| Arrocha | admin_artes (telao-led) | admin_prompts (Movies para Telão) |
| Sofrência | admin_artes (telao-led) | admin_prompts (Movies para Telão) |
| Retrô 80s | admin_artes (telao-led) | admin_prompts (Movies para Telão) |
| Cyberpunk | admin_artes (telao-led) | admin_prompts (Movies para Telão) |

---

## Etapas

### 1. Inserir os 6 registros na tabela admin_prompts
- Copiar os dados (título, image_url, is_premium) para a Biblioteca de Prompts
- Usar categoria "Movies para Telão" (já existe)
- Campo `prompt` ficará com texto padrão "Prompt a ser adicionado" para você editar depois no painel de gerenciamento

### 2. Remover os 6 registros da tabela admin_artes
- Deletar os registros originais para não ficarem duplicados

---

## Resultado Final

Após a migração:
- Os 6 movies aparecerão na Biblioteca de Prompts, categoria "Movies para Telão"
- Você poderá editar cada um pelo painel admin para adicionar os prompts
- Os arquivos de vídeo (MP4) continuam no mesmo storage, apenas a referência muda de tabela
