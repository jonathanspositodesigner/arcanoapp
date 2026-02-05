
# Plano: Remover Completamente a Lógica de unlock_days

## Objetivo

Eliminar toda a lógica de bloqueio por dias do Upscaler Arcano, tanto do frontend quanto do banco de dados. Quem comprou o pack terá acesso imediato a TODAS as versões.

---

## Resumo das Mudanças

### Arquivos Frontend a Modificar

| Arquivo | Mudança |
|---------|---------|
| `UpscalerArcanoVersionSelect.tsx` | Remover funções `getUnlockDate`, `getDaysRemaining`, simplificar `isVersionUnlocked` |
| `UpscalerArcanoV2.tsx` | Remover verificação de 7 dias, definir `isUnlocked = true` |
| `ToolVersionLessons.tsx` | Simplificar `isVersionUnlocked`, remover tela de bloqueio |
| `ToolVersionEditor.tsx` | Remover campo "Dias para Desbloqueio" do admin |
| `AdminManagePacks.tsx` | Remover `unlock_days` da criação de versões |

### Atualização do Banco de Dados

| Tabela | Mudança |
|--------|---------|
| `artes_packs.tool_versions` | Setar `unlock_days: 0` para todas as versões existentes |

---

## Mudanças Técnicas Detalhadas

### Arquivo 1: `src/pages/UpscalerArcanoVersionSelect.tsx`

#### Remover interface ToolVersion.unlock_days
```typescript
// Antes (linha 34)
unlock_days: number;

// Depois - REMOVER esta linha
```

#### Remover FALLBACK_VERSIONS unlock_days
```typescript
// Antes (linhas 58-83)
const FALLBACK_VERSIONS: ToolVersion[] = [
  {
    ...
    unlock_days: 0,  // ← REMOVER
    ...
  },
  {
    ...
    unlock_days: 7,  // ← REMOVER
    ...
  }
];
```

#### Remover estados e efeitos de purchaseDate (linhas 100-190)
```typescript
// REMOVER completamente:
const [purchaseDate, setPurchaseDate] = useState<Date | null>(null);
const [isLoadingPurchase, setIsLoadingPurchase] = useState(true);

// REMOVER useEffect que busca purchaseDate (linhas 142-190)
```

#### Simplificar isLoading
```typescript
// Antes
const isLoading = premiumLoading || promptsLoading || isLoadingPurchase || loadingVersions;

// Depois
const isLoading = premiumLoading || promptsLoading || loadingVersions;
```

#### Simplificar/Remover funções helper (linhas 232-269)
```typescript
// REMOVER getUnlockDate, getDaysRemaining completamente
// Simplificar isVersionUnlocked:
const isVersionUnlocked = (version: ToolVersion) => {
  // Todas as versões são desbloqueadas imediatamente
  return true;
};
```

#### Simplificar lógica de renderização dos cards
- Remover verificações de `version.unlock_days > 0`
- Remover exibição de "unlockDate" e "daysRemaining"
- Remover ícone de cadeado para versões bloqueadas
- Remover badge "BLOQUEADO"
- Todos os cards mostram "Disponível"

---

### Arquivo 2: `src/pages/UpscalerArcanoV2.tsx`

#### Remover estado isUnlocked e isLoadingCheck
```typescript
// ANTES (linhas 45-46)
const [isUnlocked, setIsUnlocked] = useState(false);
const [isLoadingCheck, setIsLoadingCheck] = useState(true);

// DEPOIS - REMOVER e usar valores fixos
```

#### Substituir useEffect de verificação de 7 dias (linhas 149-206)
```typescript
// REMOVER todo o useEffect e simplificar:
// Não há mais verificação de dias - acesso imediato
```

#### Simplificar useEffect de redirecionamento (linhas 209-217)
```typescript
// Remover verificação de !isUnlocked
useEffect(() => {
  if (!premiumLoading && !promptsLoading) {
    if (!user || !hasAccess) {
      navigate("/ferramentas-ia");
    }
  }
}, [premiumLoading, promptsLoading, user, hasAccess, navigate]);
```

#### Simplificar verificação de renderização (linha 229)
```typescript
// ANTES
if (!user || !hasAccess || !isUnlocked) return null;

// DEPOIS
if (!user || !hasAccess) return null;
```

---

### Arquivo 3: `src/pages/ToolVersionLessons.tsx`

#### Remover interface ToolVersion.unlock_days
```typescript
// ANTES (linha 45)
unlock_days: number;

// DEPOIS - REMOVER
```

#### Remover estado purchaseDate e useEffect relacionado (linhas 145, 339-365)
```typescript
// REMOVER:
const [purchaseDate, setPurchaseDate] = useState<Date | null>(null);

// REMOVER useEffect que busca purchaseDate
```

#### Simplificar função isVersionUnlocked (linhas 408-430)
```typescript
// ANTES - lógica complexa de unlock_days

// DEPOIS - sempre retorna true
const isVersionUnlocked = () => true;
```

#### Remover tela de bloqueio (linhas 446-471)
```typescript
// REMOVER todo este bloco:
if (!isVersionUnlocked()) {
  // ... tela de bloqueio
}
```

---

### Arquivo 4: `src/components/ToolVersionEditor.tsx`

#### Remover campo "Dias para Desbloqueio" do formulário admin (linhas 385-401)
```typescript
// REMOVER todo este bloco:
<div>
  <Label className="flex items-center gap-2">
    <Calendar className="w-4 h-4" />
    Dias para Desbloqueio
  </Label>
  <Input
    type="number"
    min={0}
    value={currentVersion.unlock_days}
    onChange={(e) => onUpdateVersion(selectedIndex, { unlock_days: parseInt(e.target.value) || 0 })}
    placeholder="0 = acesso imediato"
  />
  <p className="text-xs text-muted-foreground mt-1">
    0 = acesso imediato após compra
  </p>
</div>
```

#### Remover texto de status "Desbloqueia em X dias" (linha 278)
```typescript
// ANTES
{currentVersion.unlock_days === 0 ? 'Acesso imediato' : `Desbloqueia em ${currentVersion.unlock_days} dias`}

// DEPOIS
{'Acesso imediato'}
```

---

### Arquivo 5: `src/pages/AdminManagePacks.tsx`

#### Atualizar createEmptyVersion (linha 600)
```typescript
// ANTES
unlock_days: versionNumber === 1 ? 0 : 7,

// DEPOIS
unlock_days: 0,  // Todas as versões têm acesso imediato
```

---

## Atualização do Banco de Dados

### Query SQL para atualizar versões existentes

```sql
-- Setar unlock_days = 0 para todas as versões do Upscaler Arcano
UPDATE artes_packs
SET tool_versions = (
  SELECT jsonb_agg(
    CASE 
      WHEN elem->>'unlock_days' IS NOT NULL 
      THEN elem || '{"unlock_days": 0}'::jsonb
      ELSE elem
    END
  )
  FROM jsonb_array_elements(tool_versions) elem
)
WHERE slug = 'upscaller-arcano'
  AND tool_versions IS NOT NULL
  AND jsonb_array_length(tool_versions) > 0;
```

Esta query vai setar `unlock_days: 0` para todas as versões (v1, v2, v2.5) do Upscaler Arcano, garantindo acesso imediato para todos os compradores.

---

## Fluxo Antes vs Depois

```text
ANTES:
┌──────────────────────────────────────┐
│ Usuário compra Upscaler Arcano       │
└─────────────┬────────────────────────┘
              │
              ▼
┌──────────────────────────────────────┐
│ v1.0: Acesso imediato ✓              │
│ v2.0: Aguardar 7 dias (cadeado) ✗    │
│ v2.5: Aguardar 7 dias (cadeado) ✗    │
└──────────────────────────────────────┘

DEPOIS:
┌──────────────────────────────────────┐
│ Usuário compra Upscaler Arcano       │
└─────────────┬────────────────────────┘
              │
              ▼
┌──────────────────────────────────────┐
│ v1.0: Acesso imediato ✓              │
│ v2.0: Acesso imediato ✓              │
│ v2.5: Acesso imediato ✓              │
└──────────────────────────────────────┘
```

---

## Resumo Final

| Categoria | Ação |
|-----------|------|
| **Frontend** | Remover toda lógica de `unlock_days`, `purchaseDate`, cadeados e telas de bloqueio |
| **Admin** | Remover campo "Dias para Desbloqueio" do editor de versões |
| **Banco de Dados** | Atualizar `tool_versions` para setar `unlock_days: 0` em todas as versões |
| **Resultado** | Acesso imediato a TODAS as versões para quem comprou o pack |

---

## Arquivos Modificados

| Arquivo | Linhas Afetadas |
|---------|-----------------|
| `src/pages/UpscalerArcanoVersionSelect.tsx` | ~150 linhas removidas/simplificadas |
| `src/pages/UpscalerArcanoV2.tsx` | ~70 linhas removidas |
| `src/pages/ToolVersionLessons.tsx` | ~80 linhas removidas |
| `src/components/ToolVersionEditor.tsx` | ~20 linhas removidas |
| `src/pages/AdminManagePacks.tsx` | 1 linha modificada |
| Banco de dados | 1 query de update |
