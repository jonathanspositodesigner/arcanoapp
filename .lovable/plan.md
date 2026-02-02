

# Plano: Ajustar Layout da Página Ferramentas IA Aplicativo

## Mudanças Solicitadas

1. **Remover** o botão "Primeiro Acesso" (não mostrar para ninguém)
2. **Usar** o `ToolsHeader` que já mostra perfil + créditos no topo
3. **Remover** as seções separadas "Suas Ferramentas" e "Disponíveis para Aquisição"
4. **Colocar** todas as 4 ferramentas em um único grid, sem distinção

## Estrutura da Nova Página

```text
┌─────────────────────────────────────────────────────────────────┐
│  HEADER (ToolsHeader)                                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [←] Logo Ferramentas IA          [Créditos 123] [+] [Perfil]││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    GRID ÚNICO (4 colunas)                 │  │
│  │                                                           │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │  │
│  │  │Upscaler │  │ Forja   │  │  Muda   │  │  Muda   │      │  │
│  │  │ Arcano  │  │ Selos3D │  │  Pose   │  │  Roupa  │      │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘      │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## O Que Será Removido

| Elemento | Motivo |
|----------|--------|
| Botão "Primeiro Acesso" (linhas 311-325) | Não necessário nesta página |
| Seção "Suas Ferramentas" (linhas 333-344) | Grid único sem separação |
| Seção "Disponíveis para Aquisição" (linhas 346-357) | Grid único sem separação |
| Modais de Primeiro Acesso (linhas 367-459) | Não necessário |
| Estados de modal `showFirstAccessModal`, `firstAccessEmail`, etc. | Não necessário |
| Função `handleFirstAccessCheck` | Não necessário |

## O Que Será Mantido

| Elemento | Descrição |
|----------|-----------|
| `ToolsHeader` | Já tem perfil + créditos + login |
| Grid de cards | Todas as 4 ferramentas em um único grid |
| `renderToolCard()` | Renderização dos cards permanece igual |
| Lógica de acesso | `checkToolAccess()` continua funcionando |
| Links das ferramentas | `handleToolClick()` mantido (vamos mudar depois) |

## Código Simplificado

### Estrutura do JSX Principal

```tsx
return (
  <div className="min-h-screen bg-[#0D0221]">
    {/* Header com perfil e créditos */}
    <ToolsHeader 
      title={t('ferramentas.title')}
      onBack={goBack}
      showLogo={true}
    />

    {/* Conteúdo - Grid único com todas as ferramentas */}
    <main className="container mx-auto px-4 py-8">
      <p className="text-purple-300 text-center mb-8 max-w-2xl mx-auto hidden sm:block">
        {t('ferramentas.description')}
      </p>

      {/* Grid único - sem separação por acesso */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tools.map(renderToolCard)}
      </div>

      {tools.length === 0 && (
        <div className="text-center py-16">
          <Sparkles className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <p className="text-purple-300">{t('ferramentas.noToolsAvailable')}</p>
        </div>
      )}
    </main>
  </div>
);
```

## Arquivo a Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/FerramentasIAAplicativo.tsx` | Copiar estrutura de `FerramentasIA.tsx` e simplificar conforme descrito |

## Benefícios

1. **Layout limpo**: Sem botão extra de primeiro acesso
2. **Header consistente**: Igual às outras páginas de ferramentas (perfil + créditos)
3. **Grid único**: Todas as ferramentas visíveis igualmente
4. **Menos código**: Remove lógica desnecessária de modais de primeiro acesso
5. **Pronto para próxima etapa**: Links prontos para serem alterados

