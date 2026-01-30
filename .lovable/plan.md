
# Plano: Mensagens de Fila Aleatórias

## O que vou fazer

Criar um array com os 10 combos de mensagens e selecionar um aleatoriamente cada vez que o usuário entrar na fila.

## Mudanças no Arquivo

### `src/pages/UpscalerArcanoTool.tsx`

**1. Adicionar array de combos (início do componente):**

```typescript
const queueMessageCombos = [
  { emoji: "🔥", title: "Tá bombando!", position: (n: number) => `Você é o ${n}º da fila`, subtitle: "Relaxa que já já é sua vez!" },
  { emoji: "☕", title: "Hora do cafezinho", position: (n: number) => `Posição: ${n}`, subtitle: "Aproveita pra dar aquela relaxada" },
  { emoji: "🎨", title: "Artistas trabalhando...", position: (n: number) => `${n > 1 ? n - 1 : 0} pessoas na sua frente`, subtitle: "Grandes obras levam tempo, confia!" },
  { emoji: "🚀", title: "Decolagem em breve", position: (n: number) => `Você é o ${n}º na pista`, subtitle: "Preparando sua foto para o espaço!" },
  { emoji: "⚡", title: "Alta demanda agora", position: (n: number) => `Posição ${n} na fila`, subtitle: "Isso aqui tá voando, já já chega sua vez!" },
  { emoji: "🤖", title: "Robôzinhos a mil!", position: (n: number) => `Faltam ${n > 1 ? n - 1 : 0} na sua frente`, subtitle: "Eles tão trabalhando pesado pra você" },
  { emoji: "✨", title: "Preparando sua mágica", position: (n: number) => `${n}º lugar na fila VIP`, subtitle: "Magia de qualidade leva um tempinho" },
  { emoji: "🎮", title: "Loading...", position: (n: number) => `Player ${n} na fila`, subtitle: "Próxima fase desbloqueando em breve!" },
  { emoji: "🌟", title: "Sucesso gera fila", position: (n: number) => `Você é o ${n}º`, subtitle: "Todo mundo quer essa qualidade, né?" },
  { emoji: "😎", title: "Fica tranquilo", position: (n: number) => `${n}º da galera esperando`, subtitle: "Vale a pena esperar, resultado top vem aí!" },
];
```

**2. Adicionar state para guardar o combo selecionado:**

```typescript
const [currentQueueCombo, setCurrentQueueCombo] = useState<number>(0);
```

**3. Selecionar combo aleatório quando entrar na fila:**

Onde a fila é ativada, adicionar:
```typescript
setCurrentQueueCombo(Math.floor(Math.random() * queueMessageCombos.length));
```

**4. Atualizar o JSX da fila (linhas 570-578):**

```typescript
<p className="text-xl font-bold text-yellow-300">
  {queueMessageCombos[currentQueueCombo].emoji} {queueMessageCombos[currentQueueCombo].title}
</p>
<p className="text-4xl font-bold text-white mt-2">
  {queueMessageCombos[currentQueueCombo].position(queuePosition)}
</p>
<p className="text-sm text-purple-300/70 mt-2">
  {queueMessageCombos[currentQueueCombo].subtitle}
</p>
```

## Resultado

Cada vez que o usuário entrar na fila, vai ver uma mensagem diferente e divertida aleatória dos 10 combos!
