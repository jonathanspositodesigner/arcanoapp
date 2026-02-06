

# Plano: Botão "Minhas Criações" no Mobile

## Problema Identificado

O botão "Minhas Criações" está com `hidden sm:flex` (linha 125), ficando **invisível em telas mobile**.

---

## Solução Proposta

Adicionar "Minhas Criações" dentro do **dropdown de perfil do usuário**, que já existe e funciona no mobile.

```text
┌─────────────────────────────────────────┐
│  Dropdown de Perfil (mobile + desktop)  │
├─────────────────────────────────────────┤
│  👤 Nome do Usuário                     │
│  📧 email@exemplo.com                   │
│  ─────────────────────────────          │
│  🪙 Créditos               [120] [+]    │
│  ─────────────────────────────          │
│  📚 Minhas Criações         ← NOVO      │
│  ─────────────────────────────          │
│  🔒 Alterar Senha                       │
│  ⚙️ Configurações                       │
│  ─────────────────────────────          │
│  🚪 Sair                                │
└─────────────────────────────────────────┘
```

---

## Vantagens desta Abordagem

| Benefício | Descrição |
|-----------|-----------|
| ✅ Funciona no mobile | Dropdown já existe e é acessível |
| ✅ Não ocupa espaço no header | Header mobile continua limpo |
| ✅ Consistente com UX existente | Mesmo padrão das outras opções |
| ✅ Botão desktop permanece | Continua visível em telas grandes |

---

## Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/ToolsHeader.tsx` | Adicionar item "Minhas Criações" no DropdownMenu |

---

## Código a Adicionar

Após a seção de "Créditos" e antes de "Alterar Senha" (por volta da linha 228):

```tsx
{/* Minhas Criações - acessível no mobile via dropdown */}
<DropdownMenuItem
  onClick={() => setShowCreationsModal(true)}
  className="cursor-pointer hover:bg-purple-500/20 focus:bg-purple-500/20"
>
  <Library className="w-4 h-4 mr-2" />
  Minhas Criações
</DropdownMenuItem>

<DropdownMenuSeparator className="bg-purple-500/20" />
```

---

## Resultado Final

- **Desktop**: Botão no header + opção no dropdown
- **Mobile**: Opção no dropdown (ícone de usuário → Minhas Criações)

