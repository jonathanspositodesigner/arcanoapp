
# Refatoração Concluída: Fila Global Centralizada

## Arquitetura Anterior (Problema)
Cada ferramenta de IA tinha sua própria lógica duplicada de contagem de fila global, criando inconsistências e bugs.

## Nova Arquitetura (Solução)

### 1. `runninghub-queue-manager` (NOVO)
Função ÚNICA e CENTRALIZADA que gerencia a fila global de todas as 4 ferramentas:
- `/check` - Verifica slots disponíveis (conta running em TODAS as tabelas)
- `/process-next` - Processa próximo job na fila global (FIFO cross-tool)
- `/status` - Status completo da fila

### 2. Webhooks Simplificados
- `runninghub-webhook` - Recebe callbacks e chama Queue Manager
- `runninghub-video-upscaler-webhook` - Recebe callbacks de vídeo e chama Queue Manager

### 3. Funções Individuais Atualizadas
Todas as 4 ferramentas agora usam o Queue Manager para verificar disponibilidade:
- `runninghub-upscaler`
- `runninghub-pose-changer`
- `runninghub-veste-ai`
- `runninghub-video-upscaler`

## Fluxo de Processamento
1. Usuário inicia job → Função individual chama `/check` do Queue Manager
2. Se slot disponível → Executa imediatamente
3. Se não → Enfileira com status "queued"
4. Quando job termina → Webhook chama `/process-next` do Queue Manager
5. Queue Manager pega o job mais antigo de QUALQUER ferramenta e inicia

## Resultado
- Fila global consistente em todas as ferramentas
- Máximo de 3 jobs simultâneos respeitado corretamente
- Um único ponto de controle para toda a lógica de fila
