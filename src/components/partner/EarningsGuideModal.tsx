import { ReactNode, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  MousePointerClick,
  Sparkles,
  TrendingUp,
  Trophy,
  Flame,
  Heart,
  Target,
  Wand2,
  Crown,
  Zap,
} from "lucide-react";

const LEVELS = [
  { level: 1, name: "Iniciante", minXp: 0, unlockRate: "R$ 0,05" },
  { level: 2, name: "Criador", minXp: 400, unlockRate: "R$ 0,07" },
  { level: 3, name: "Colaborador", minXp: 900, unlockRate: "R$ 0,07" },
  { level: 4, name: "Especialista", minXp: 2000, unlockRate: "R$ 0,10" },
  { level: 5, name: "Elite", minXp: 6000, unlockRate: "R$ 0,12" },
];

const FOUNDER_LEVELS = [
  { level: 1, name: "Iniciante", minXp: 0, unlockRate: "R$ 0,10" },
  { level: 2, name: "Criador", minXp: 400, unlockRate: "R$ 0,10" },
  { level: 3, name: "Colaborador", minXp: 900, unlockRate: "R$ 0,12" },
  { level: 4, name: "Especialista", minXp: 2000, unlockRate: "R$ 0,15" },
  { level: 5, name: "Elite", minXp: 6000, unlockRate: "R$ 0,20" },
];

interface EarningsGuideModalProps {
  trigger: ReactNode;
  /** Hide the "send your first prompt" CTA inside the modal (default false). */
  hideFirstPromptCta?: boolean;
  isFounder?: boolean;
}

const EarningsGuideModal = ({ trigger, hideFirstPromptCta = false, isFounder = false }: EarningsGuideModalProps) => {
  const [open, setOpen] = useState(false);
  const levels = isFounder ? FOUNDER_LEVELS : LEVELS;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-full max-w-3xl h-[100dvh] max-h-[100dvh] rounded-none p-0 gap-0 !flex flex-col overflow-hidden sm:h-auto sm:max-h-[92vh] sm:rounded-2xl">
        <DialogHeader className="px-5 pt-5 pb-3 sm:px-7 sm:pt-6 border-b border-border/60 shrink-0 text-left">
          <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {isFounder ? "Programa Arcano Founder" : "Como você ganha como colaborador"}
          </DialogTitle>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {isFounder
              ? "Veja como a tabela Founder transforma prompts aprovados em ganhos maiores desde o primeiro nível."
              : "Entenda todas as formas de ganhar dinheiro publicando seu conteúdo no Arcano."}
          </p>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 sm:py-6 space-y-8">
            {/* Forma 1 — Cliques de liberação */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MousePointerClick className="h-4.5 w-4.5 text-primary" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground">
                  1. Liberação de prompts (cliques)
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Toda vez que um usuário libera (copia/desbloqueia) um prompt seu marcado como{" "}
                <strong className="text-foreground">Premium</strong>, você recebe um valor fixo
                conforme o seu <strong className="text-foreground">nível na plataforma</strong>.
                {isFounder
                  ? "  Como Arcano Founder, você começa ganhando R$ 0,10 por prompt liberado, sobe para R$ 0,12, R$ 0,15 e pode chegar a R$ 0,20 no Elite."
                  : " Quanto mais alto o seu nível, maior o valor por liberação."}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
                {levels.map((lvl) => (
                  <Card key={lvl.level} className="border-primary/15 bg-primary/5">
                    <CardContent className="p-3 text-center space-y-1">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Nível {lvl.level}
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-foreground">
                        {lvl.name}
                      </div>
                      <div className="text-sm sm:text-base font-bold text-primary">
                        {lvl.unlockRate}
                      </div>
                      <div className="text-[10px] text-muted-foreground">por liberação</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Forma 2 — Ferramentas de IA */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Wand2 className="h-4.5 w-4.5 text-primary" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground">
                  2. Uso do seu prompt nas ferramentas de IA
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sempre que um usuário utiliza o seu prompt como referência dentro de uma das
                ferramentas de IA do Arcano, você recebe{" "}
                <strong className="text-foreground">
                  20% do valor que o usuário gasta em créditos na ferramenta
                </strong>
                . A comissão acontece quando o seu prompt é usado como referência em ferramentas
                elegíveis da plataforma.
              </p>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
                <p className="text-[11px] text-muted-foreground pt-1">
                  Mesmo prompts <strong>gratuitos</strong> geram comissão para você quando usados
                  como referência nas ferramentas de IA.
                </p>
              </div>
            </section>

            {/* Forma 3 — Ranking & Níveis */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Trophy className="h-4.5 w-4.5 text-primary" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground">
                  3. Escale como Colaborador Arcano
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Você acumula <strong className="text-foreground">XP</strong> realizando ações na
                plataforma. Conforme você sobe de nível, o valor que recebe por cada liberação
                aumenta — chegando a <strong className="text-foreground">{isFounder ? "R$ 0,20" : "2,4× mais"}</strong>{" "}
                {isFounder ? "por prompt no nível Elite." : "no nível Elite em comparação ao Iniciante."}
              </p>
              {isFounder && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Exclusivo:</strong> apenas 15 criadores serão aceitos como Arcano Founder. Para manter o selo e crescer na tabela, publique prompts originais, evite rejeições e mantenha boa performance.
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-2.5">
                <div className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-card/50 p-3">
                  <Flame className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Streak diário</p>
                    <p className="text-xs text-muted-foreground">
                      Ganhe XP entrando todos os dias na plataforma.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-card/50 p-3">
                  <Heart className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Curtidas no seu conteúdo</p>
                    <p className="text-xs text-muted-foreground">
                      Cada like recebido em seus prompts gera XP.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-card/50 p-3">
                  <Target className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Desafios e conquistas</p>
                    <p className="text-xs text-muted-foreground">
                      Complete missões semanais e ganhe bônus de XP.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-card/50 p-3">
                  <Crown className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Ranking público</p>
                    <p className="text-xs text-muted-foreground">
                      Os Arcano Founders com melhor desempenho ganham mais destaque na plataforma.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Simulação */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4.5 w-4.5 text-primary" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground">
                  Possibilidades de ganho
                </h3>
              </div>
              <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 sm:p-5 space-y-3">
                <p className="text-sm text-foreground/90 leading-relaxed">
                  Um Arcano Founder <strong>nível Especialista</strong> com{" "}
                  <strong>20 prompts populares</strong> liberados em média 50× por dia pode chegar a:
                </p>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="rounded-lg bg-background/60 border border-border/40 p-2.5 sm:p-3 text-center">
                    <div className="text-base sm:text-xl font-bold text-primary">{isFounder ? "R$ 150" : "R$ 100"}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">por dia</div>
                  </div>
                  <div className="rounded-lg bg-background/60 border border-border/40 p-2.5 sm:p-3 text-center">
                    <div className="text-base sm:text-xl font-bold text-primary">{isFounder ? "R$ 1.050" : "R$ 700"}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">por semana</div>
                  </div>
                  <div className="rounded-lg bg-background/60 border border-border/40 p-2.5 sm:p-3 text-center">
                    <div className="text-base sm:text-xl font-bold text-primary">{isFounder ? "R$ 4.500+" : "R$ 3.000+"}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">por mês</div>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground italic">
                  *Valores simulados. Os ganhos reais variam conforme volume e qualidade do
                  conteúdo, engajamento dos usuários e nível Founder.
                </p>
              </div>
            </section>

            {/* Dicas */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Zap className="h-4.5 w-4.5 text-primary" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground">
                  Dicas para virar um {isFounder ? "Founder" : "Colaborador"} desejado
                </h3>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1.5 pl-1">
                <li>✅ Publique prompts originais, específicos e com resultado visual forte.</li>
                <li>✅ Venda o clique pelo título e pela capa — prompt bom precisa parecer irresistível.</li>
                <li>✅ Use tags e categorias certas para aparecer nas buscas internas.</li>
                <li>✅ Mantenha consistência: Founder que publica sempre tem mais chance de dominar categorias.</li>
                <li>✅ Vincule seus prompts às ferramentas de IA — você ganha em dobro.</li>
              </ul>
            </section>
        </div>

        <div className="px-5 py-3 sm:px-7 sm:py-4 border-t border-border/60 bg-background shrink-0">
          <Button
            onClick={() => setOpen(false)}
            className="w-full h-11 text-sm sm:text-base font-semibold"
          >
            Entendi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EarningsGuideModal;
