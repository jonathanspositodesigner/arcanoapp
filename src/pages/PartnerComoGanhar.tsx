import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, DollarSign, TrendingUp, Users, Zap, Star, Trophy, Sparkles, Target, Gift } from "lucide-react";

const LEVELS = [
  { level: 1, name: "Iniciante", minXp: 0, maxXp: 399, unlockRate: "R$ 0,05" },
  { level: 2, name: "Criador", minXp: 400, maxXp: 899, unlockRate: "R$ 0,07" },
  { level: 3, name: "Colaborador", minXp: 900, maxXp: 1999, unlockRate: "R$ 0,07" },
  { level: 4, name: "Especialista", minXp: 2000, maxXp: 5999, unlockRate: "R$ 0,10" },
  { level: 5, name: "Elite", minXp: 6000, maxXp: Infinity, unlockRate: "R$ 0,12" },
];

const TOOLS = [
  "Arcano Cloner",
  "Veste AI",
  "Pose Changer",
  "MovieLED Maker",
  "Seedance 2.0",
];

const PartnerComoGanhar = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* TopBar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base font-bold text-foreground">Como Ganhar na Plataforma</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5 pb-20">

        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-purple-900 via-purple-800 to-primary p-5 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Programa de Colaboradores</h2>
              <p className="text-xs text-white/60">Ganhe dinheiro compartilhando sua criatividade</p>
            </div>
          </div>
          <p className="text-sm text-white/80 leading-relaxed">
            Como colaborador, você ganha dinheiro real de <strong>duas formas</strong>: quando usuários copiam seus prompts e quando usam seus prompts nas ferramentas de IA.
          </p>
        </div>

        {/* Forma 1: Cópias de Prompt */}
        <Card className="border-border bg-card p-4 rounded-2xl">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-green-400" />
            </div>
            <h3 className="font-bold text-foreground text-sm">1. Ganho por Cópia de Prompt</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            Toda vez que um usuário <strong className="text-foreground">copia o texto do seu prompt</strong> na Biblioteca de Prompts, você ganha um valor fixo. O valor depende do seu <strong className="text-foreground">nível na plataforma</strong>.
          </p>
          <div className="bg-accent/50 rounded-xl p-3">
            <p className="text-[11px] font-semibold text-muted-foreground mb-2 tracking-wide">COMO FUNCIONA:</p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Você envia um prompt com imagem de referência
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                A equipe aprova e publica na Biblioteca de Prompts
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Cada vez que alguém copia seu prompt, você ganha!
              </li>
            </ul>
          </div>
        </Card>

        {/* Forma 2: Ferramentas de IA */}
        <Card className="border-border bg-card p-4 rounded-2xl">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-purple-500/15 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-purple-400" />
            </div>
            <h3 className="font-bold text-foreground text-sm">2. Ganho nas Ferramentas de IA</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            Quando um usuário usa o botão <strong className="text-foreground">"Gerar foto"</strong> diretamente no seu prompt, você ganha <strong className="text-foreground">20% do valor que o usuário gasta</strong> em créditos naquela ferramenta.
          </p>
          <div className="bg-accent/50 rounded-xl p-3 mb-3">
            <p className="text-[11px] font-semibold text-muted-foreground mb-2 tracking-wide">FERRAMENTAS QUE GERAM GANHO:</p>
            <div className="flex flex-wrap gap-1.5">
              {TOOLS.map(tool => (
                <span key={tool} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                  {tool}
                </span>
              ))}
            </div>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2.5">
            <p className="text-xs text-green-400 font-semibold flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              Quanto mais seus prompts forem usados nas ferramentas, mais você ganha!
            </p>
          </div>
        </Card>

        {/* Sistema de Níveis */}
        <Card className="border-border bg-card p-4 rounded-2xl">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-yellow-500/15 flex items-center justify-center">
              <Trophy className="h-4 w-4 text-yellow-400" />
            </div>
            <h3 className="font-bold text-foreground text-sm">Ranking & Níveis</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            Conforme você sobe de nível, <strong className="text-foreground">seu ganho por cópia de prompt aumenta</strong>. Você ganha XP enviando prompts, mantendo sequências diárias e completando desafios.
          </p>
          <div className="space-y-2">
            {LEVELS.map(lvl => (
              <div key={lvl.level} className="flex items-center justify-between bg-accent/50 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold text-white ${
                    lvl.level === 1 ? 'bg-gray-500' :
                    lvl.level === 2 ? 'bg-blue-500' :
                    lvl.level === 3 ? 'bg-purple-500' :
                    lvl.level === 4 ? 'bg-orange-500' :
                    'bg-yellow-500'
                  }`}>
                    {lvl.level}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{lvl.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {lvl.minXp} — {lvl.maxXp === Infinity ? '∞' : lvl.maxXp} XP
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-extrabold text-green-400">{lvl.unlockRate}</p>
                  <p className="text-[9px] text-muted-foreground">por cópia</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Como ganhar XP */}
        <Card className="border-border bg-card p-4 rounded-2xl">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center">
              <Target className="h-4 w-4 text-blue-400" />
            </div>
            <h3 className="font-bold text-foreground text-sm">Como Ganhar XP</h3>
          </div>
          <div className="space-y-2.5">
            {[
              { icon: "📤", title: "Enviar prompts", desc: "Ganhe XP ao enviar novos prompts aprovados" },
              { icon: "🔥", title: "Sequência diária", desc: "Mantenha uma sequência de dias ativos para ganhar XP bônus" },
              { icon: "🏆", title: "Desafios semanais", desc: "Complete desafios especiais para XP extra" },
              { icon: "❤️", title: "Curtidas nos prompts", desc: "Prompts populares com mais curtidas geram XP adicional" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-accent/30 rounded-xl px-3 py-2.5">
                <span className="text-lg mt-0.5">{item.icon}</span>
                <div>
                  <p className="text-xs font-bold text-foreground">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Simulação de Ganhos */}
        <Card className="border-border bg-card p-4 rounded-2xl">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <h3 className="font-bold text-foreground text-sm">Simulação de Ganhos</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Veja quanto você pode ganhar com base no número de prompts ativos e no seu nível:
          </p>
          <div className="space-y-2">
            {[
              { scenario: "10 prompts × 5 cópias/dia", level: "Iniciante", daily: "R$ 2,50", monthly: "R$ 75,00" },
              { scenario: "20 prompts × 10 cópias/dia", level: "Criador", daily: "R$ 14,00", monthly: "R$ 420,00" },
              { scenario: "30 prompts × 15 cópias/dia", level: "Especialista", daily: "R$ 45,00", monthly: "R$ 1.350,00" },
              { scenario: "50 prompts × 20 cópias/dia", level: "Elite", daily: "R$ 120,00", monthly: "R$ 3.600,00" },
            ].map((sim, i) => (
              <div key={i} className="bg-gradient-to-r from-emerald-500/5 to-emerald-500/10 border border-emerald-500/15 rounded-xl px-3 py-2.5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] text-muted-foreground">{sim.scenario}</p>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                    {sim.level}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-bold text-foreground">{sim.daily}</span>/dia
                  </p>
                  <p className="text-sm font-extrabold text-emerald-400">{sim.monthly}/mês</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 italic">
            * Valores estimados apenas de cópias de prompt. Ganhos com ferramentas de IA são adicionais (20% por uso).
          </p>
        </Card>

        {/* Saques */}
        <Card className="border-border bg-card p-4 rounded-2xl">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-pink-500/15 flex items-center justify-center">
              <Gift className="h-4 w-4 text-pink-400" />
            </div>
            <h3 className="font-bold text-foreground text-sm">Saques</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Quando seu saldo atingir o mínimo para saque, você pode solicitar a transferência via PIX diretamente pela plataforma na seção <strong className="text-foreground">Saldo & Saques</strong>.
          </p>
        </Card>

        {/* CTA */}
        <Button onClick={() => navigate('/parceiro-upload')} className="w-full h-12 text-sm font-bold rounded-2xl bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white">
          <Sparkles className="h-4 w-4 mr-2" />
          Enviar Meu Primeiro Prompt
        </Button>
      </div>
    </div>
  );
};

export default PartnerComoGanhar;