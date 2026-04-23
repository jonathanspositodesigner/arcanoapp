import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Trophy, Flame, Star, Target, Crown, Zap, Award, Sparkles, Shield, Film, Cpu, DollarSign, MousePointerClick } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePartnerGamificationNotifications } from "@/hooks/usePartnerGamificationNotifications";

// Level definitions
const LEVELS = [
  { level: 1, name: "Iniciante", minXp: 0, maxXp: 149, unlockRate: 0.05 },
  { level: 2, name: "Criador", minXp: 150, maxXp: 399, unlockRate: 0.07 },
  { level: 3, name: "Colaborador", minXp: 400, maxXp: 899, unlockRate: 0.07 },
  { level: 4, name: "Especialista", minXp: 900, maxXp: 1999, unlockRate: 0.10 },
  { level: 5, name: "Elite", minXp: 2000, maxXp: Infinity, unlockRate: 0.12 },
];

const ALL_BADGES = [
  { slug: "first_prompt", name: "Primeira Contribuição", icon: "⭐", hint: "Tenha 1 prompt aprovado" },
  { slug: "on_fire", name: "Em Chamas 🔥", icon: "🔥", hint: "Streak de 7 dias" },
  { slug: "diamond", name: "Diamante 💎", icon: "💎", hint: "50 prompts aprovados" },
  { slug: "viral", name: "Viral ⚡", icon: "⚡", hint: "1 prompt com 100+ desbloqueios" },
  { slug: "top3", name: "Pódio 🏆", icon: "🏆", hint: "Top 3 no ranking semanal" },
  { slug: "millionaire", name: "R$50 Ganhos 💰", icon: "💰", hint: "Ganhar R$50+ no total" },
  { slug: "legendary", name: "Lendário 👑", icon: "👑", hint: "Atingir nível 5 (Elite)" },
  { slug: "ai_master", name: "Mestre das IAs 🤖", icon: "🤖", hint: "10+ usos em ferramentas" },
  { slug: "seedance_star", name: "Estrela Seedance 🎬", icon: "🎬", hint: "5 jobs Seedance concluídos" },
];

interface GamificationData {
  xp_total: number;
  level: number;
  current_streak: number;
  best_streak: number;
  streak_protection_available: boolean;
}

interface BadgeData {
  badge_slug: string;
  earned_at: string;
}

interface ChallengeData {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  target_count: number;
  target_value: number | null;
  xp_reward: number;
}

interface ChallengeProgress {
  challenge_id: string;
  current_count: number;
  current_value: number;
  completed: boolean;
}

interface RankingEntry {
  partner_id: string;
  partner_name: string;
  week_total: number;
}

const PartnerConquistas = () => {
  const navigate = useNavigate();
  const [partnerId, setPartnerId] = useState<string | null>(null);
  usePartnerGamificationNotifications(partnerId);
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [challenges, setChallenges] = useState<ChallengeData[]>([]);
  const [challengeProgress, setChallengeProgress] = useState<ChallengeProgress[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [totalPartners, setTotalPartners] = useState(0);
  const [myRankPosition, setMyRankPosition] = useState<number | null>(null);
  const [unlockEarnings, setUnlockEarnings] = useState({ total: 0, count: 0 });
  const [toolEarnings, setToolEarnings] = useState({ total: 0, count: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { data: partner } = await supabase
        .from("partners")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!partner) { navigate("/"); return; }
      setPartnerId(partner.id);

      // Parallel fetches
      const [gamRes, badgeRes, challengeRes, progressRes, unlockRes, toolRes, partnersCountRes] = await Promise.all([
        supabase.from("partner_gamification").select("*").eq("partner_id", partner.id).maybeSingle(),
        supabase.from("partner_badges").select("badge_slug, earned_at").eq("partner_id", partner.id),
        supabase.from("partner_weekly_challenges").select("*").eq("is_active", true).gte("week_end", new Date().toISOString().split("T")[0]),
        supabase.from("partner_challenge_progress").select("*").eq("partner_id", partner.id),
        supabase.from("collaborator_unlock_earnings").select("amount").eq("collaborator_id", partner.id),
        supabase.from("collaborator_tool_earnings").select("amount").eq("collaborator_id", partner.id),
        supabase.from("partners").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);

      setGamification(gamRes.data || { xp_total: 0, level: 1, current_streak: 0, best_streak: 0, streak_protection_available: true });
      setBadges(badgeRes.data || []);
      setChallenges(challengeRes.data || []);
      setChallengeProgress(progressRes.data || []);
      setTotalPartners(partnersCountRes.count || 0);

      const unlocks = unlockRes.data || [];
      setUnlockEarnings({ total: unlocks.reduce((s, e) => s + (e.amount || 0), 0), count: unlocks.length });
      const tools = toolRes.data || [];
      setToolEarnings({ total: tools.reduce((s, e) => s + (e.amount || 0), 0), count: tools.length });

      // Weekly ranking
      await loadWeeklyRanking(partner.id);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar conquistas");
    } finally {
      setIsLoading(false);
    }
  };

  const loadWeeklyRanking = async (myPartnerId: string) => {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    const weekStart = monday.toISOString().split("T")[0];

    // Get all unlock earnings this week
    const { data: weekUnlocks } = await supabase
      .from("collaborator_unlock_earnings")
      .select("collaborator_id, amount")
      .gte("unlocked_at", weekStart);

    const { data: weekTools } = await supabase
      .from("collaborator_tool_earnings")
      .select("collaborator_id, amount")
      .gte("created_at", weekStart);

    // Aggregate
    const totals: Record<string, number> = {};
    (weekUnlocks || []).forEach(e => { totals[e.collaborator_id] = (totals[e.collaborator_id] || 0) + (e.amount || 0); });
    (weekTools || []).forEach(e => { totals[e.collaborator_id] = (totals[e.collaborator_id] || 0) + (e.amount || 0); });

    // Get partner names
    const partnerIds = Object.keys(totals);
    if (partnerIds.length === 0) return;

    const { data: partners } = await supabase
      .from("partners")
      .select("id, name")
      .in("id", partnerIds);

    const nameMap: Record<string, string> = {};
    (partners || []).forEach(p => { nameMap[p.id] = p.name || "Colaborador"; });

    const sorted = Object.entries(totals)
      .map(([pid, total]) => ({ partner_id: pid, partner_name: nameMap[pid] || "Colaborador", week_total: total }))
      .sort((a, b) => b.week_total - a.week_total);

    setRanking(sorted.slice(0, 10));
    const myPos = sorted.findIndex(r => r.partner_id === myPartnerId);
    setMyRankPosition(myPos >= 0 ? myPos + 1 : null);
  };

  const currentLevel = useMemo(() => {
    const lvl = gamification?.level || 1;
    return LEVELS.find(l => l.level === lvl) || LEVELS[0];
  }, [gamification]);

  const nextLevel = useMemo(() => {
    return LEVELS.find(l => l.level === currentLevel.level + 1);
  }, [currentLevel]);

  const xpProgress = useMemo(() => {
    if (!gamification || !nextLevel) return 100;
    const xpInLevel = gamification.xp_total - currentLevel.minXp;
    const xpNeeded = nextLevel.minXp - currentLevel.minXp;
    return Math.min(100, (xpInLevel / xpNeeded) * 100);
  }, [gamification, currentLevel, nextLevel]);

  const getProgressForChallenge = (challengeId: string) => {
    return challengeProgress.find(p => p.challenge_id === challengeId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const daysUntilMonday = (() => {
    const now = new Date();
    const day = now.getDay();
    return day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  })();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/parceiro")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              🎮 Conquistas
            </h1>
            <p className="text-sm text-muted-foreground">Seu progresso como colaborador</p>
          </div>
        </div>

        {/* Level & XP Card */}
        <Card className="p-5 mb-4 bg-purple-500/10 border-purple-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Crown className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  Nível {currentLevel.level} — {currentLevel.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {gamification?.xp_total || 0} XP total
                </p>
              </div>
            </div>
          </div>
          {nextLevel ? (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{gamification?.xp_total || 0} XP</span>
                <span>{nextLevel.minXp} XP</span>
              </div>
              <Progress value={xpProgress} className="h-3" />
              <p className="text-xs text-muted-foreground mt-1">
                Faltam {nextLevel.minXp - (gamification?.xp_total || 0)} XP para o próximo nível
              </p>
            </div>
          ) : (
            <p className="text-sm text-purple-400 font-medium">Nível máximo atingido 👑</p>
          )}
          <div className="mt-3 p-2 rounded-lg bg-purple-500/10">
            <p className="text-sm text-foreground">
              💰 Sua taxa por desbloqueio: <span className="font-bold text-green-400">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentLevel.unlockRate)}
              </span>
            </p>
          </div>
        </Card>

        {/* Earnings Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card className="p-4 bg-green-500/10 border-green-500/20">
            <div className="flex items-center gap-2 mb-1">
              <MousePointerClick className="h-4 w-4 text-green-400" />
              <p className="text-xs text-muted-foreground">Desbloqueios</p>
            </div>
            <p className="text-xl font-bold text-green-400">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(unlockEarnings.total)}
            </p>
            <p className="text-xs text-muted-foreground">{unlockEarnings.count} desbloqueios</p>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="h-4 w-4 text-emerald-400" />
              <p className="text-xs text-muted-foreground">Uso em Ferramentas</p>
            </div>
            <p className="text-xl font-bold text-emerald-400">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(toolEarnings.total)}
            </p>
            <p className="text-xs text-muted-foreground">{toolEarnings.count} jobs</p>
          </Card>
        </div>

        {/* Streak */}
        <Card className="p-5 mb-4 bg-orange-500/10 border-orange-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🔥</div>
              <div>
                <p className="text-2xl font-bold text-orange-400">
                  {gamification?.current_streak || 0} dias
                </p>
                <p className="text-sm text-muted-foreground">Streak atual</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Recorde</p>
              <p className="text-lg font-bold text-foreground">{gamification?.best_streak || 0} dias</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-400" />
            <p className="text-xs text-muted-foreground">
              Proteção mensal: {gamification?.streak_protection_available
                ? <span className="text-green-400 font-medium">Disponível ✓</span>
                : <span className="text-red-400 font-medium">Usada este mês</span>}
            </p>
          </div>
        </Card>

        {/* Badges */}
        <Card className="p-5 mb-4">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-400" /> Badges
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {ALL_BADGES.map(b => {
              const earned = badges.some(eb => eb.badge_slug === b.slug);
              return (
                <div
                  key={b.slug}
                  className={`text-center p-3 rounded-xl border transition-all ${
                    earned
                      ? "bg-yellow-500/10 border-yellow-500/30 shadow-[0_0_12px_rgba(234,179,8,0.15)]"
                      : "bg-muted/30 border-border opacity-50"
                  }`}
                >
                  <div className="text-2xl mb-1">{b.icon}</div>
                  <p className={`text-xs font-medium ${earned ? "text-foreground" : "text-muted-foreground"}`}>
                    {b.name.replace(/[🔥💎⚡🏆💰👑🤖🎬]/g, '').trim()}
                  </p>
                  {!earned && (
                    <p className="text-[10px] text-muted-foreground mt-1">{b.hint}</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Weekly Challenges */}
        <Card className="p-5 mb-4">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-400" /> Desafios da Semana
          </h2>
          <div className="space-y-3">
            {challenges.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum desafio ativo esta semana</p>
            ) : challenges.map(ch => {
              const prog = getProgressForChallenge(ch.id);
              const isValue = ch.challenge_type === "earn_tool_value";
              const current = isValue ? (prog?.current_value || 0) : (prog?.current_count || 0);
              const target = isValue ? (ch.target_value || 0) : ch.target_count;
              const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
              const done = prog?.completed || false;

              return (
                <div key={ch.id} className={`p-3 rounded-lg border ${done ? "bg-green-500/10 border-green-500/20" : "bg-blue-500/5 border-blue-500/10"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-foreground">{ch.title}</p>
                    <Badge variant={done ? "default" : "outline"} className={done ? "bg-green-600 text-white" : ""}>
                      {done ? "✓ Concluído" : `+${ch.xp_reward} XP`}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{ch.description}</p>
                  <Progress value={pct} className="h-2 mb-1" />
                  <p className="text-xs text-muted-foreground">
                    {isValue
                      ? `R$${Number(current).toFixed(2)} / R$${Number(target).toFixed(2)}`
                      : `${current} / ${target}`}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Weekly Ranking */}
        {totalPartners >= 20 && (
          <Card className="p-5 mb-4">
            <h2 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-400" /> Ranking Semanal
            </h2>
            <p className="text-xs text-muted-foreground mb-1">
              🥇 R$15 | 🥈 R$10 | 🥉 R$5
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Reset em {daysUntilMonday} dia{daysUntilMonday > 1 ? "s" : ""} • Bônus pagos manualmente pelo admin toda segunda
            </p>

            <div className="space-y-2">
              {ranking.map((entry, idx) => {
                const isMine = entry.partner_id === partnerId;
                const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}º`;
                return (
                  <div
                    key={entry.partner_id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isMine ? "bg-purple-500/10 border-purple-500/30 ring-1 ring-purple-500/30" :
                      idx < 3 ? "bg-yellow-500/5 border-yellow-500/10" : "bg-muted/20 border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg min-w-[2rem] text-center">{medal}</span>
                      <span className={`text-sm font-medium ${isMine ? "text-purple-400" : "text-foreground"}`}>
                        {isMine ? "👉 Você" : entry.partner_name}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-green-400">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.week_total)}
                    </span>
                  </div>
                );
              })}
            </div>

            {myRankPosition && myRankPosition > 10 && (
              <div className="mt-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <p className="text-sm text-foreground">
                  Sua posição: <span className="font-bold text-purple-400">{myRankPosition}º lugar</span>
                </p>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default PartnerConquistas;