
## Arcano Cloner - Nova Ferramenta de IA

### O que vai fazer
Ferramenta que permite criar imagens realistas clonando o rosto da pessoa em uma foto de referência. O usuário sobe sua foto, escolhe uma imagem de referência (upload ou biblioteca de prompts categoria "Fotos") e seleciona a proporção desejada.

---

### Estrutura de Arquivos a Criar

**Frontend:**
- `src/pages/ArcanoClonerTool.tsx` - Página principal da ferramenta
- `src/components/arcano-cloner/PhotoLibraryModal.tsx` - Modal para selecionar fotos da biblioteca (categoria "Fotos")
- `src/components/arcano-cloner/AspectRatioSelector.tsx` - Seletor de proporção com ícones

**Backend (depois que você enviar a documentação da API):**
- `supabase/functions/runninghub-arcano-cloner/index.ts` - Edge Function
- Tabela `arcano_cloner_jobs` no banco

---

### Design da Página (ArcanoClonerTool.tsx)

**Layout idêntico ao Pose Changer e Veste AI:**
- Header com `ToolsHeader` (título "Arcano Cloner")
- Banner de aviso durante processamento
- Grid responsivo: 2/7 para inputs (esquerda), 5/7 para resultado (direita)

**Inputs no painel esquerdo:**
1. **Card "Sua Foto"** - Upload da foto do usuário (reutiliza `ImageUploadCard`)
2. **Card "Foto de Referência"** - Upload ou seleção da biblioteca
   - Botão "Biblioteca de Fotos" que abre o modal
3. **Seletor de Proporção** - Novo componente com 4 opções:
   - Stories (9:16) - ícone de celular vertical
   - Quadrado (1:1) - ícone de quadrado
   - Feed Vertical (3:4) - ícone retângulo vertical
   - Retangular (16:9) - ícone retângulo horizontal
4. **Botão "Gerar Imagem"** - 80 créditos

**Painel de resultado (direita):**
- Visualizador com zoom/pan (mesmo do Pose Changer)
- Estados: idle, uploading, processing, waiting (fila), completed, error
- Botões "Nova" e "Baixar HD" quando concluído

---

### Modal de Biblioteca de Fotos (PhotoLibraryModal.tsx)

**Funcionalidade:**
- Busca imagens da tabela `admin_prompts` onde `category = 'Fotos'`
- Filtro por gênero: Masculino | Feminino (tags no nome ou campo adicional se existir)
- Paginação: 20 imagens por página com "Carregar mais"
- Ao clicar na foto, fecha o modal e coloca a URL no input de referência

**Layout:**
- Mesmo estilo visual do `ClothingLibraryModal` e `PoseLibraryModal`
- Header com título e ícone
- Tabs de filtro (Masculino/Feminino)
- Grid de imagens 3x4 colunas
- Cada card mostra preview da imagem + título

---

### Seletor de Proporção (AspectRatioSelector.tsx)

**Opções com ícones:**
```text
| STORIES  | QUADRADO | FEED VERT | RETANGULAR |
|   9:16   |   1:1    |    3:4    |    16:9    |
|  📱↕     |   ⬜     |   📐↕     |    📺      |
```

**Visual:**
- 4 botões lado a lado (toggle group)
- Ícone representativo + label
- Selecionado = roxo/fúcsia, não selecionado = outline
- Valor default: "1:1" (Quadrado)

**Valores enviados para API:**
- Stories: `"9:16"`
- Quadrado: `"1:1"`
- Feed Vertical: `"3:4"`
- Retangular: `"16:9"`

---

### Hooks e Lógica (mesma arquitetura das outras ferramentas)

**Reutilizados:**
- `useSmartBackNavigation` - navegação
- `usePremiumStatus` - usuário
- `useUpscalerCredits` - saldo de créditos
- `useQueueSessionCleanup` - limpeza de jobs na fila ao sair
- `useProcessingButton` - prevenção de duplo clique
- `useJobStatusSync` - sincronização tripla (Realtime + Polling + Visibility)
- `useResilientDownload` - download com fallbacks
- `useNotificationTokenRecovery` - recuperação via push
- `useJobPendingWatchdog` - watchdog para jobs travados

**Componentes reutilizados:**
- `ImageUploadCard` - upload de imagens
- `NoCreditsModal` - modal sem créditos
- `ActiveJobBlockModal` - bloqueio de job ativo
- `JobDebugPanel` - painel de debug
- `DownloadProgressOverlay` - overlay de download
- `NotificationPromptToast` - toast de notificação

---

### Integração com Sistema Existente

**Rota:**
- `/arcano-cloner-tool`
- Adicionar no `App.tsx` com lazy loading

**Custo:**
- 80 créditos por geração (conforme especificado)
- Débito feito no backend igual às outras ferramentas

**Fila:**
- Usa o mesmo `runninghub-queue-manager` global
- Máximo 3 jobs simultâneos compartilhados

---

### Próximos Passos (após você aprovar o design)

1. Implementar o design da página completo
2. Criar o modal de biblioteca de fotos (buscando do banco real)
3. Criar o seletor de proporção
4. Você me envia a documentação da API da RunningHub
5. Criar a Edge Function e webhook
6. Criar a tabela `arcano_cloner_jobs` no banco
7. Integrar tudo e testar

---

### Prévia Visual do Layout

```text
┌─────────────────────────────────────────────────────────┐
│  ← Arcano Cloner                         👤 ⚡ 1.234    │
├─────────────────────────────────────────────────────────┤
│  ⚠️ Não feche esta página durante o processamento       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐  ┌────────────────────────────────────┐  │
│  │ Sua Foto │  │                                    │  │
│  │  [📷]    │  │                                    │  │
│  │          │  │           RESULTADO                │  │
│  └──────────┘  │                                    │  │
│  ┌──────────┐  │      O resultado aparecerá aqui    │  │
│  │Referência│  │                                    │  │
│  │  [🖼️]    │  │                                    │  │
│  │[Bibliot] │  │                                    │  │
│  └──────────┘  │                                    │  │
│  ┌──────────┐  │                                    │  │
│  │ PROPORÇÃO│  │                                    │  │
│  │[📱][⬜]..│  │                                    │  │
│  └──────────┘  │                                    │  │
│  ┌──────────┐  └────────────────────────────────────┘  │
│  │ ✨ Gerar │                                          │
│  │  80 ⚡   │                                          │
│  └──────────┘                                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```
