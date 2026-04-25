## Plano de Implementação Aprovado

### 1. `src/pages/BibliotecaPrompts.tsx`
- Adicionar botão **"Gerar sua versão"** nos cards do grid e no modal de detalhes
- **Categorias incluídas**: Cenários, Logos, Selos 3D, Outros, Produtos/Comida
- **Categorias excluídas**: Flyers com IA, Fotos, Controles de Câmera, Movies para Telão, Seedance 2 (já tem botão próprio), todos os vídeos
- Navegação:
  ```tsx
  navigate('/gerar-imagem', { state: {
    prefillPrompt: item.prompt,
    prefillImageUrl: item.imageUrl,
    prefillEngine: 'nano_banana',
    prefillPromptId: item.partnerId ? item.id : null,
    prefillPromptType: item.partnerId ? 'partner' : null,
  }})
  ```

### 2. `src/pages/GerarImagemTool.tsx` (ou equivalente)
- Ler `prefillPrompt`, `prefillImageUrl`, forçar engine `nano_banana`
- Baixar a imagem da URL e adicioná-la como referência
- Manter `referencePromptId` ativo na sessão mesmo se o usuário modificar prompt/imagem (via `useCollaboratorAttribution`)
- Limpar `referencePromptId` apenas ao sair da página/criar nova geração depois da primeira

### 3. Banco de dados — Atribuição vitalícia
- Adicionar UNIQUE constraint em `collaborator_earnings(collaborator_id, payer_user_id, prompt_id)` (ou tabela equivalente)
- Atualizar a RPC `register_collaborator_tool_earning` para usar `ON CONFLICT DO NOTHING` substituindo a janela diária pela trava vitalícia
- Garantir que a tool "Gerar Imagem" (já cadastrada com R$ 0,10) seja debitada apenas quando job completar com `referencePromptId` presente

### 4. Version bump
- `APP_BUILD_VERSION` → `1.3.7` em `src/pages/Index.tsx`

### 5. Build errors pré-existentes
- Os erros TS18046/TS2339 listados são de funções não tocadas neste plano. Não vou corrigi-los nesta task para não desviar do escopo.