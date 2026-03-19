

## Diagnóstico

As imagens dos 2 avatares do Jonathan estão quebradas porque o `SaveCharacterDialog` salva diretamente a URL temporária do RunningHub (`rh-images-1252422369.cos.ap-beijing.myqcloud.com/...`). Essas URLs expiram após alguns dias/semanas, quebrando todas as imagens salvas.

**Evidência no banco:**
- MARIA CLARA - AVATAR → `https://rh-images-1252422369.cos.ap-beijing.myqcloud.com/.../ComfyUI_00001_ycgug_1771855792.png`
- Jonathan → `https://rh-images-1252422369.cos.ap-beijing.myqcloud.com/.../ComfyUI_00003_uftvr_1770670311.png`

Ambas são URLs temporárias que já expiraram. As imagens **não foram deletadas do banco** — o registro está lá, mas o link externo morreu.

---

## Plano de Correção

### 1. Criar bucket `saved-avatars` (público)
Migration SQL para criar o bucket com RLS permitindo upload/select/delete apenas pelo próprio usuário.

### 2. Corrigir `SaveCharacterDialog.tsx` — upload permanente ao salvar
Ao clicar "Salvar", o componente vai:
1. Fazer fetch da imagem (URL temporária ainda válida naquele momento)
2. Fazer upload para `saved-avatars/{userId}/{uuid}.png`
3. Salvar a URL pública permanente no `image_url` do banco

### 3. Migrar os 2 avatares existentes do Jonathan
Como as URLs já expiraram, **não é possível recuperar as imagens originais**. As opções são:
- Marcar os registros como "imagem indisponível" com fallback visual
- Ou deletar os registros quebrados para o usuário recriar

Vou implementar um fallback visual (imagem quebrada mostra placeholder com nome) para que registros antigos não causem confusão, e os novos salvamentos sempre usem storage permanente.

### 4. Adicionar fallback visual nos componentes que exibem avatares
- `SavedCharactersPanel.tsx` — `onError` no `<img>` para mostrar placeholder
- `PersonInputSwitch.tsx` — mesmo tratamento

### Arquivos a alterar
- **Migration SQL** — criar bucket `saved-avatars` + políticas RLS
- **`src/components/character-generator/SaveCharacterDialog.tsx`** — upload para storage antes de salvar
- **`src/components/character-generator/SavedCharactersPanel.tsx`** — fallback de imagem quebrada
- **`src/components/ai-tools/PersonInputSwitch.tsx`** — fallback de imagem quebrada

