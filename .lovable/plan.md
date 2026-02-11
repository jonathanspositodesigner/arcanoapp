

## Adicionar Criatividade da IA + Instrucoes Personalizadas ao Arcano Cloner

### Resumo

Adicionar dois novos controles ao Arcano Cloner:
1. **Slider "Criatividade da IA"** (1 a 6, sem decimais) - abaixo da Proporcao
2. **Switch "Instrucoes Personalizadas"** - ao ligar, revela um textarea para o usuario digitar instrucoes livres

Alem disso, otimizar o layout para que o botao "Gerar Imagem" fique visivel sem scroll, tanto no desktop quanto no mobile.

### Mudancas

#### 1. Migracao SQL - novas colunas na tabela `arcano_cloner_jobs`
- `creativity` (integer, default 4) - valor de 1 a 6
- `custom_prompt` (text, nullable) - instrucoes personalizadas do usuario

#### 2. `src/pages/ArcanoClonerTool.tsx`
- Adicionar estados: `creativity` (default 4), `customPromptEnabled` (default false), `customPrompt` (default '')
- Inserir os novos controles no painel esquerdo, abaixo do AspectRatioSelector
- Passar `creativity` e `customPrompt` no insert do job e na chamada da edge function
- Reduzir gaps e paddings para compactar o layout no mobile e desktop

#### 3. Novo componente `src/components/arcano-cloner/CreativitySlider.tsx`
- Slider de 1 a 6 (inteiros apenas)
- Labels: "Mais fiel" no lado esquerdo, "Muito criativo" no lado direito
- Estilo consistente com o AspectRatioSelector (bg-purple-900/20, border-purple-500/30)

#### 4. Novo componente `src/components/arcano-cloner/CustomPromptToggle.tsx`
- Switch com label "Instrucoes Personalizadas"
- Ao ligar, revela um textarea compacto para digitar
- Placeholder: "Ex: Use roupas vermelhas, cenario na praia..."
- Estilo consistente com os outros controles

#### 5. `supabase/functions/runninghub-arcano-cloner/index.ts`
- Receber `creativity` e `customPrompt` do body
- Adicionar Node 133 (creativity) e Node 135 (custom prompt/instrucoes) ao `nodeInfoList`
- Se `customPrompt` estiver vazio, enviar string vazia no Node 135
- Remover o `FIXED_PROMPT` do Node 69 e mover a logica: se o usuario enviou `customPrompt`, usar ele no Node 135; senao, enviar vazio

#### 6. `supabase/functions/runninghub-queue-manager/index.ts`
- No case `arcano_cloner_jobs`, adicionar Node 133 e Node 135 ao nodeInfoList, lendo `job.creativity` e `job.custom_prompt`

#### 7. Otimizacao de layout (compactacao)
- Reduzir paddings/gaps dos componentes PersonInputSwitch e ReferenceImageCard no contexto do Arcano Cloner
- No mobile: reduzir alturas dos containers de upload para ~120px
- No desktop: os dois cards de imagem ficam menores para tudo caber sem scroll

### Detalhes tecnicos

**Novos nodes na API (conforme documentacao):**

```text
Node 133 - fieldName: "value", fieldValue: "4" (string do numero 1-6)
Node 135 - fieldName: "text", fieldValue: "" (instrucoes livres ou vazio)
```

**Edge function - nodeInfoList atualizado:**

```text
[
  { nodeId: "58", fieldName: "image", fieldValue: userFileName },
  { nodeId: "62", fieldName: "image", fieldValue: referenceFileName },
  { nodeId: "69", fieldName: "text", fieldValue: FIXED_PROMPT },
  { nodeId: "85", fieldName: "aspectRatio", fieldValue: aspectRatio },
  { nodeId: "133", fieldName: "value", fieldValue: String(creativity) },
  { nodeId: "135", fieldName: "text", fieldValue: customPrompt || "" }
]
```

### Arquivos

| Arquivo | Tipo |
|---------|------|
| Nova migracao SQL | Colunas `creativity` e `custom_prompt` |
| `src/components/arcano-cloner/CreativitySlider.tsx` | Novo componente |
| `src/components/arcano-cloner/CustomPromptToggle.tsx` | Novo componente |
| `src/pages/ArcanoClonerTool.tsx` | Integrar novos controles + compactar layout |
| `supabase/functions/runninghub-arcano-cloner/index.ts` | Nodes 133 e 135 |
| `supabase/functions/runninghub-queue-manager/index.ts` | Nodes 133 e 135 |
