

## Correção da Pré-seleção do Pack no Modal de Edição

### Problema Identificado

O componente `Select` do Radix-UI precisa que exista um `<SelectItem>` com o mesmo `value` para exibir o texto selecionado. Quando o modal de edição abre:

1. O `handleEdit` define `editPack` com o valor do pack da arte (ex: "Pack Agendas")
2. **MAS** os `packs` podem ainda não ter carregado (array vazio) 
3. Sem um `<SelectItem value="Pack Agendas">` renderizado, o Select não consegue exibir o texto
4. O Select mostra apenas o placeholder "Selecione o pack"

Mesmo com o fallback existente (linhas 677-679), ele só funciona se `!packs.find(p => p.name === editPack)` - ou seja, quando o pack não está na lista. Mas há um problema de timing: se packs está vazio, `packs.find()` retorna undefined, então o fallback deveria funcionar...

O problema real pode ser que o Select precisa de uma `key` para forçar re-render quando os dados mudam.

---

### Solução

Adicionar uma `key` ao componente `Select` baseada no `editPack` e no comprimento de `packs` para forçar re-render quando esses valores mudam:

```typescript
<Select 
  key={`pack-${editPack}-${packs.length}`}
  value={editPack} 
  onValueChange={setEditPack}
>
```

E garantir que o fallback sempre mostre o item atual:

```typescript
{/* Sempre mostrar o pack atual como primeira opção se existir */}
{editPack && (
  <SelectItem value={editPack} className="font-medium">
    {editPack} {!packs.find(p => p.name === editPack) && '(salvo)'}
  </SelectItem>
)}
{packs.filter(p => p.name !== editPack).map(pack => (
  <SelectItem key={pack.id} value={pack.name}>{pack.name}</SelectItem>
))}
```

---

### Mudanças no Código

**Arquivo:** `src/pages/AdminManageArtes.tsx`

#### Linhas 672-685 - Refatorar o Select de Pack:

**De:**
```typescript
<div>
  <Label>Pack</Label>
  <Select value={editPack} onValueChange={setEditPack}>
    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o pack" /></SelectTrigger>
    <SelectContent className="bg-background border border-border z-50">
      {editPack && !packs.find(p => p.name === editPack) && (
        <SelectItem value={editPack}>{editPack}</SelectItem>
      )}
      {packs.map(pack => (
        <SelectItem key={pack.id} value={pack.name}>{pack.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

**Para:**
```typescript
<div>
  <Label>Pack</Label>
  <Select 
    key={`pack-select-${editPack}-${packs.length}`}
    value={editPack} 
    onValueChange={setEditPack}
  >
    <SelectTrigger className="mt-1">
      <SelectValue placeholder="Selecione o pack" />
    </SelectTrigger>
    <SelectContent className="bg-background border border-border z-50">
      {/* Sempre mostrar opção "Nenhum" para permitir remover pack */}
      <SelectItem value="">Nenhum pack</SelectItem>
      {/* Mostrar pack atual primeiro se existir e não estiver na lista carregada */}
      {editPack && !packs.find(p => p.name === editPack) && (
        <SelectItem value={editPack}>{editPack} (salvo)</SelectItem>
      )}
      {/* Lista de packs disponíveis */}
      {packs.map(pack => (
        <SelectItem key={pack.id} value={pack.name}>{pack.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

---

### Alterações Adicionais

Também aplicar a mesma correção no Select de **Categoria** para consistência (linhas 641-669).

---

### Resumo Técnico

| Mudança | Motivo |
|---------|--------|
| Adicionar `key` no Select | Força re-render quando editPack ou packs.length muda |
| Manter fallback com "(salvo)" | Indica visualmente que é o valor salvo mesmo que pack não esteja na lista |
| Adicionar opção "Nenhum pack" | Permite ao admin remover o pack de uma arte |

---

### Resultado Esperado

- Pack pré-selecionado aparece corretamente ao abrir modal de edição
- Se o pack salvo não estiver na lista de packs carregados, mostra "(salvo)" ao lado
- Admin pode selecionar "Nenhum pack" para remover associação
- Funciona mesmo com timing issues de carregamento

