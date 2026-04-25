# 📺 MovieLed Maker — Modo Logo + Chroma Key Automático

## 🎯 Objetivo
Adicionar um switch **"Nome / Logo"** acima do campo atual de "Nome no Telão". Quando o usuário escolher **Logo**, ele faz upload de uma imagem e o sistema:
1. Detecta automaticamente se a logo tem fundo transparente
2. Se sim, aplica fundo **verde chroma key (#00B140)** antes de enviar
3. Roteia pro **WebApp ID novo** correspondente (Kling+Logo ou Wan+Logo) com o `nodeInfoList` correto

---

## 🧠 Resposta sobre Chroma Key automático
**SIM, totalmente viável e será implementado 100% client-side via Canvas API**:

1. **Detecção** — carrega a imagem num `<canvas>`, lê `getImageData()`, conta pixels com `alpha < 250`. Se mais de **3% dos pixels** tiverem transparência → é logo sem fundo.
2. **Aplicação do chroma** — cria novo canvas com mesmas dimensões, preenche com `#00B140` (verde chroma key padrão da indústria, não puro `#00FF00` para evitar oversaturation no encoder de vídeo da RH), desenha a logo por cima preservando anti-aliasing.
3. **Export** — converte para JPEG qualidade 95 (já com fundo opaco verde, menor que PNG).
4. **Vantagens**: zero latência de edge function, zero custo, processa em ~50ms no browser, e a RunningHub recebe uma imagem JPG sólida que os modelos Kling/Wan vão tratar como telão de LED real exibindo a logo.

Se a imagem **JÁ TEM fundo** (JPG ou PNG opaco) → envia direto, sem alterar nada.

---

## 📋 Implementação

### 1. Frontend — `src/pages/MovieLedMakerTool.tsx`

**Novos estados:**
```typescript
const [contentMode, setContentMode] = useState<'name' | 'logo'>('name');
const [logoFile, setLogoFile] = useState<File | null>(null);
const [logoPreview, setLogoPreview] = useState<string | null>(null);
const [logoProcessing, setLogoProcessing] = useState(false);
const [logoHasTransparency, setLogoHasTransparency] = useState(false);
```

**Novo utilitário** `src/lib/movieled-logo-processor.ts`:
- `detectTransparency(file: File): Promise<boolean>` — carrega via `URL.createObjectURL` num Image, desenha em canvas off-screen, varre alpha channel.
- `applyChromaKey(file: File): Promise<File>` — desenha fundo `#00B140` + logo + exporta `canvas.toBlob('image/jpeg', 0.95)`.
- `processLogoForUpload(file: File): Promise<{ file: File, hadTransparency: boolean }>` — orquestra: detecta → aplica se necessário → retorna File final.

**UI (substitui o campo único "Nome no Telão"):**
```tsx
<div className="space-y-2">
  <label className="text-sm font-medium">Conteúdo do Telão</label>
  
  {/* Switch Nome/Logo */}
  <div className="grid grid-cols-2 gap-0 bg-muted border border-border rounded-lg p-1">
    <button onClick={() => setContentMode('name')} className={contentMode === 'name' ? 'bg-primary text-primary-foreground' : ''}>
      <Type className="w-4 h-4" /> Nome
    </button>
    <button onClick={() => setContentMode('logo')} className={contentMode === 'logo' ? 'bg-primary text-primary-foreground' : ''}>
      <ImageIcon className="w-4 h-4" /> Logo
    </button>
  </div>

  {contentMode === 'name' ? (
    <Input value={inputText} onChange={...} placeholder="Ex: ARCANO LAB" />
  ) : (
    <LogoUploadField 
      onSelect={handleLogoSelect}
      preview={logoPreview}
      hadTransparency={logoHasTransparency}
    />
  )}
</div>
```

Quando o usuário envia uma logo, exibimos preview + badge informativo: *"✓ Fundo chroma key aplicado automaticamente"* (se `hadTransparency === true`).

**Lógica de geração:**
- Se `contentMode === 'logo'`: faz upload do `logoFile` (já processado) para Supabase Storage `artes-cloudinary/movieled-logos/{userId}/{uuid}.jpg`, pega public URL, e envia no payload como `logoImageUrl`.
- Mantém também o `imageUrl` (telão de referência) como antes.
- Bloqueia o engine `veo3.1` quando `contentMode === 'logo'` (Veo não tem fluxo com logo) — exibe mensagem orientando trocar para Kling ou Wan.

**Payload pro edge function:**
```typescript
{
  imageUrl,                    // telão de referência
  inputText: contentMode === 'name' ? inputText : null,
  logoImageUrl: contentMode === 'logo' ? logoPublicUrl : null,
  contentMode,                 // 'name' | 'logo'
  engine: selectedEngine,
  ...
}
```

---

### 2. Backend — `supabase/functions/runninghub-movieled-maker/index.ts`

**Validação no `handleRun`:**
- Se `contentMode === 'logo'`:
  - `logoImageUrl` é obrigatório (não `inputText`)
  - `engine` deve ser `kling2.5` ou `wan2.2` (rejeita `veo3.1` com erro claro)
- Se `contentMode === 'name'`: mantém regra atual (`inputText` obrigatório)

**Upload da logo pra RunningHub:**
- Quando `contentMode === 'logo'`, chama `uploadImageToRunningHub(logoImageUrl, null, 'logo')` além do upload do telão de referência.
- Salva ambos no `job_payload`:
```typescript
const jobPayload = {
  engine: selectedEngine,
  contentMode,
  inputText: contentMode === 'name' ? inputText.trim() : null,
  rhFileName,            // telão de referência (já existe)
  rhLogoFileName,        // NOVO: logo já uploaded
  imageUrl,
  logoImageUrl: logoImageUrl || null,
  fallbackImageUrl: promptFallbackUrl,
  referencePromptId: referencePromptId || null,
};
```

---

### 3. Backend — `supabase/functions/runninghub-queue-manager/index.ts`

**Novos WebApp IDs no mapa `WEBAPP_IDS.movieled_maker_jobs`:**
```typescript
movieled_maker_jobs: {
  'veo3.1': '2021398746331881473',
  'wan2.2': '2038686081360596993',
  'wan2.2_logo': '2048069532694093826',     // NOVO (doc Wan + Logo)
  'kling2.5': '2047044202881617921',
  'kling2.5_logo': '2047822588453326850',   // NOVO (doc Kling + Logo)
},
```

**Atualizar bloco `case 'movieled_maker_jobs'` (linha 1805):**
```typescript
case 'movieled_maker_jobs': {
  const movieEngine = p.engine || job.engine || 'veo3.1';
  const isLogoMode = p.contentMode === 'logo';
  const movieWebappIds = WEBAPP_IDS.movieled_maker_jobs as Record<string, string>;
  
  if (isLogoMode) {
    // Fluxo LOGO: usa WebApp ID dedicado e nodes diferentes
    const logoKey = `${movieEngine}_logo`;
    webappId = movieWebappIds[logoKey];
    if (!webappId) {
      throw new Error(`Logo mode not supported for engine: ${movieEngine}`);
    }
    
    if (movieEngine === 'kling2.5') {
      // Kling+Logo: nodeId 155 = telão ref, nodeId 160 = logo
      nodeInfoList = [
        { nodeId: "155", fieldName: "image", fieldValue: p.rhFileName, description: "IMAGEM REF" },
        { nodeId: "160", fieldName: "image", fieldValue: p.rhLogoFileName, description: "LOGO" },
      ];
    } else if (movieEngine === 'wan2.2') {
      // Wan+Logo: nodeId 135 = movie ref, nodeId 139 = logo
      nodeInfoList = [
        { nodeId: "135", fieldName: "image", fieldValue: p.rhFileName, description: "MOVIE REF" },
        { nodeId: "139", fieldName: "image", fieldValue: p.rhLogoFileName, description: "LOGO" },
      ];
    }
  } else {
    // Fluxo NOME (atual, sem mudanças)
    webappId = movieWebappIds[movieEngine] || movieWebappIds['veo3.1'];
    nodeInfoList = [
      { nodeId: "68", fieldName: "image", fieldValue: p.rhFileName || job.reference_file_name, description: "image" },
      { nodeId: "72", fieldName: "text", fieldValue: p.inputText || job.input_text || '', description: "text" },
    ];
  }
  break;
}
```

---

### 4. Database — Migration (mínima)

Adicionar 2 colunas opcionais para auditoria:
```sql
ALTER TABLE public.movieled_maker_jobs
  ADD COLUMN IF NOT EXISTS content_mode text DEFAULT 'name' CHECK (content_mode IN ('name', 'logo')),
  ADD COLUMN IF NOT EXISTS logo_image_url text;
```

---

### 5. Storage

Reutiliza bucket existente `artes-cloudinary` (público) com path `movieled-logos/{userId}/{uuid}.jpg`. Sem nova bucket, sem novas políticas RLS necessárias.

---

### 6. Memória + Versão

- **Atualizar memória** `mem://features/ai-tools/movieled-maker-tool` adicionando seção sobre modo Logo: WebApp IDs, nodes, lógica de chroma key.
- **Bump** `APP_BUILD_VERSION` → `1.4.6` em `src/pages/Index.tsx`.

---

## ⚠️ Edge cases tratados

| Caso | Comportamento |
|---|---|
| Usuário escolhe Veo 3.1 + Logo | UI desabilita Veo no modo Logo com tooltip "Disponível apenas em Kling 2.5 ou Wan 2.2" |
| Logo JPG (sem alpha) | Envia direto, sem chroma |
| Logo PNG com fundo branco/colorido opaco | Detecta `transparency < 3%` → envia direto |
| Logo PNG transparente | Aplica chroma `#00B140`, exporta JPG |
| Logo gigante (>5MB) | Já é redimensionada pelo `imageCompression` existente antes de processar chroma |
| Falha no upload da logo pra RH | Mesmo tratamento que falha no upload do telão (refund automático) |

---

## 📦 Arquivos impactados

1. ✏️ `src/pages/MovieLedMakerTool.tsx` — UI switch + estados + payload
2. 🆕 `src/lib/movieled-logo-processor.ts` — utilitário chroma key (Canvas API)
3. ✏️ `supabase/functions/runninghub-movieled-maker/index.ts` — validação + upload da logo + payload expandido
4. ✏️ `supabase/functions/runninghub-queue-manager/index.ts` — novos WebApp IDs + lógica de roteamento por modo
5. 🆕 Migration SQL — 2 colunas em `movieled_maker_jobs`
6. ✏️ `src/pages/Index.tsx` — bump versão
7. ✏️ Memória `mem://features/ai-tools/movieled-maker-tool`

**Posso prosseguir com essa implementação?**
