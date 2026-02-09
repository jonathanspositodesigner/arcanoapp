
## Tornar desbloqueio dinamico baseado no numero real de aulas (3, nao 4)

### Problema atual

O codigo tem `[1, 2, 3, 4]` hardcoded em varios lugares. Como agora sao 3 aulas, o sistema NUNCA desbloqueia porque exige aula 4 que nao existe.

### Mudancas no arquivo `src/pages/ToolVersionLessons.tsx`

**1. `isToolUnlocked` - usar `lessons.length` em vez de hardcoded `[1,2,3,4]` (linhas 207-210)**

```typescript
// ANTES:
const isToolUnlocked = useMemo(() => {
  return [1, 2, 3, 4].every(num => watchedLessons.includes(num));
}, [watchedLessons]);

// DEPOIS:
const isToolUnlocked = useMemo(() => {
  const totalLessons = lessons.length;
  return totalLessons > 0 && Array.from({ length: totalLessons }, (_, i) => i + 1).every(num => watchedLessons.includes(num));
}, [watchedLessons, lessons.length]);
```

**2. `progressCount` - usar `lessons.length` em vez de hardcoded 4 (linhas 212-215)**

```typescript
// ANTES:
const progressCount = useMemo(() => {
  return Math.min(watchedLessons.filter(n => n <= 4).length, 4);
}, [watchedLessons]);

// DEPOIS:
const totalLessons = lessons.length;
const progressCount = useMemo(() => {
  return Math.min(watchedLessons.filter(n => n <= totalLessons).length, totalLessons);
}, [watchedLessons, totalLessons]);
```

**3. Progress bar condicional - mudar `>= 4` para `>= 1` (linha 417)**

```typescript
// ANTES:
{toolSlug === 'upscaller-arcano' && lessons.length >= 4 && (

// DEPOIS:
{toolSlug === 'upscaller-arcano' && lessons.length >= 1 && (
```

**4. Progress bar width - usar `totalLessons` em vez de 4 (linha 434)**

```typescript
// ANTES:
style={{ width: `${(progressCount / 4) * 100}%` }}

// DEPOIS:
style={{ width: `${(progressCount / totalLessons) * 100}%` }}
```

**5. Indicadores de aula - gerar dinamicamente (linha 440-442)**

```typescript
// ANTES:
{[1, 2, 3, 4].map((num) => {
  const nextLesson = [1, 2, 3, 4].find(n => !watchedLessons.includes(n)) || 5;

// DEPOIS:
{Array.from({ length: totalLessons }, (_, i) => i + 1).map((num) => {
  const nextLesson = Array.from({ length: totalLessons }, (_, i) => i + 1).find(n => !watchedLessons.includes(n)) || totalLessons + 1;
```

**6. Botao da ferramenta - aplicar mudancas do plano anterior (linhas 480-515)**

- Remover `disabled={!isToolUnlocked}` - botao sempre ativo
- Sempre usar estilo dourado
- Substituir mensagem "assista para desbloquear" por aviso fixo: "Atencao: e muito importante que voce assista as videoaulas para saber como usar a ferramenta"

**7. WhatsApp condicional - so aparece apos assistir TODAS as aulas (linhas 673-684)**

```typescript
// Mobile:
{(toolSlug !== 'upscaller-arcano' || isToolUnlocked) && (
  <div className="lg:hidden mt-6">
    <WhatsAppSupportButton />
  </div>
)}

// Desktop:
{(toolSlug !== 'upscaller-arcano' || isToolUnlocked) && (
  <div className="hidden lg:block container mx-auto px-4 pb-8 max-w-6xl">
    <WhatsAppSupportButton />
  </div>
)}
```

**8. Light Version Notice - mudar `>= 4` para `>= 1` (linha 659)**

Mesmo ajuste para consistencia: `lessons.length >= 4` -> `lessons.length >= 1`

### Resumo

| Item | Antes | Depois |
|------|-------|--------|
| Aulas necessarias | Hardcoded 4 | Dinamico (baseado em `lessons.length`) |
| Botao ferramenta | Bloqueado ate assistir 4 | Sempre liberado |
| Aviso abaixo do botao | "Assista para desbloquear" | "Atencao: assista as videoaulas" |
| Suporte WhatsApp | Sempre visivel | So aparece apos todas as aulas assistidas |
| Progress bar | /4 fixo | /totalLessons dinamico |

Arquivo unico modificado: `src/pages/ToolVersionLessons.tsx`
