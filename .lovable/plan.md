
## Página de Obrigado — Arcano Cloner

### O que será criado

Uma página `/obrigado-arcanocloner` com identidade visual idêntica à página `/planos-arcanocloner`, com mensagem de boas-vindas, agradecimento pela compra e um botão de acesso ao produto.

---

### Identidade Visual (copiada da página de planos)

- Fundo: `bg-gradient-to-br from-[#0f0a15] via-[#1a0f25] to-[#0a0510]`
- Fonte: `font-space-grotesk`
- Cores de destaque: gradiente `fuchsia-400 → purple-500`
- Bordas e cards: `border-white/10`, `bg-white/5`, `rounded-3xl`
- Glow roxo de fundo (blur fuchsia)
- Logo `logo_horizontal.png` no topo

---

### Conteúdo da Página

**Seção principal (centralizada, tela cheia):**
- Logo no topo
- Ícone de check verde animado (celebração de compra)
- Título: **"Obrigado pela sua compra! 🎉"**
- Subtítulo: **"Seja bem-vindo ao Arcano Cloner"**
- Texto: *"Se o pagamento já foi processado, clique no botão abaixo para acessar sua compra e começar a criar ensaios fotográficos profissionais agora mesmo."*
- **Botão principal verde** → "Acessar minha compra" → link para `/ferramentas-ia-aplicativo`
- Pequena nota: *"Pode levar alguns minutos para o acesso ser liberado após o pagamento."*

**Seção de lembrete (cards menores abaixo):**
- O que o usuário recebeu: ~70 fotos, biblioteca +300 referências, Upscaler bônus, suporte via WhatsApp

---

### Arquivos a Serem Criados/Editados

| Arquivo | Ação |
|---|---|
| `src/pages/ObrigadoArcanoCloner.tsx` | Criar — página de obrigado completa |
| `src/App.tsx` | Editar — adicionar rota `/obrigado-arcanocloner` |
