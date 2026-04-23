import { ReactNode, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface EarningsGuideModalProps {
  trigger: ReactNode;
  /** Hide the "send your first prompt" CTA inside the modal (default false). */
  hideFirstPromptCta?: boolean;
}

const EarningsGuideModal = ({ trigger, hideFirstPromptCta = false }: EarningsGuideModalProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[92vh] p-0 gap-0 sm:rounded-2xl">
        <DialogHeader className="px-5 pt-5 pb-3 sm:px-7 sm:pt-7 border-b border-border/60">
          <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Como você ganha como colaborador
          </DialogTitle>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Entenda todas as formas de ganhar dinheiro publicando seu conteúdo no Arcano.
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] sm:max-h-[68vh]">
          <div className="px-5 py-5 sm:px-7 sm:py-6 space-y-8">
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
                Quanto mais alto o seu nível, maior o valor por liberação.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
                {LEVELS.map((lvl) => (
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
                . Quanto mais cara a geração (vídeos, upscales, etc.), maior a sua comissão.
              </p>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-semibold text-foreground">Ferramentas que pagam comissão:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Gerar Imagem",
                    "Gerar Vídeo",
                    "Veste AI",
                    "Pose Changer",
                    "Arcano Cloner",
                    "Flyer Maker",
                    "MovieLED Maker",
                    "Cinema Studio",
                    "Seedance 2",
                    "Upscaler Arcano",
                  ].map((t) => (
                    <span
                      key={t}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                    >
                      {t}
                    </span>
                  ))}
                </div>
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
                  3. Suba de nível e ganhe mais
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Você acumula <strong className="text-foreground">XP</strong> realizando ações na
                plataforma. Conforme você sobe de nível, o valor que recebe por cada liberação
                aumenta — chegando a <strong className="text-foreground">2,4× mais</strong> no
                nível Elite em comparação ao Iniciante.
              </p>
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
                      Os melhores colaboradores ganham destaque na plataforma.
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
                  Um colaborador <strong>nível Especialista</strong> com{" "}
                  <strong>20 prompts populares</strong> liberados em média 50× por dia pode chegar a:
                </p>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="rounded-lg bg-background/60 border border-border/40 p-2.5 sm:p-3 text-center">
                    <div className="text-base sm:text-xl font-bold text-primary">R$ 100</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">por dia</div>
                  </div>
                  <div className="rounded-lg bg-background/60 border border-border/40 p-2.5 sm:p-3 text-center">
                    <div className="text-base sm:text-xl font-bold text-primary">R$ 700</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">por semana</div>
                  </div>
                  <div className="rounded-lg bg-background/60 border border-border/40 p-2.5 sm:p-3 text-center">
                    <div className="text-base sm:text-xl font-bold text-primary">R$ 3.000+</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">por mês</div>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground italic">
                  *Valores simulados. Os ganhos reais variam conforme volume e qualidade do
                  conteúdo, engajamento dos usuários e nível do colaborador.
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
                  Dicas para ganhar mais
                </h3>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1.5 pl-1">
                <li>✅ Publique conteúdos originais e de alta qualidade visual.</li>
                <li>✅ Capriche no título e na imagem de capa — isso aumenta as liberações.</li>
                <li>✅ Use tags e categorias certas para aparecer nas buscas internas.</li>
                <li>✅ Mantenha um ritmo constante de publicações para subir de nível mais rápido.</li>
                <li>✅ Vincule seus prompts às ferramentas de IA — você ganha em dobro.</li>
              </ul>
            </section>
          </div>
        </ScrollArea>

        <div className="px-5 py-4 sm:px-7 border-t border-border/60 bg-background/95 backdrop-blur sticky bottom-0">
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
