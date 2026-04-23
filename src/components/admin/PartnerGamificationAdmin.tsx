import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trophy, Target, Users, Crown, ArrowUpDown, Sparkles, Plus, X, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const formatBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const LEVEL_NAMES: Record<number, string> = { 1: "Iniciante", 2: "Criador", 3: "Colaborador", 4: "Especialista", 5: "Elite" };
const UNLOCK_RATES: Record<number, number> = { 1: 0.05, 2: 0.07, 3: 0.07, 4: 0.10, 5: 0.12 };

interface PartnerGamRow {
  partner_id: string;
  partner_name: string;
  level: number;
  xp_total: number;
  current_streak: number;
  badge_count: number;
  unlock_earned: number;
  tool_earned: number;
}

interface ChallengeRow {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  target_count: number;
  target_value: number | null;
  category_target: string | null;
  xp_reward: number;
  week_start: string;
  week_end: string;
  is_active: boolean;
  completed_count?: number;
}

interface RankEntry {
  partner_id: string;
  partner_name: string;
  week_total: number;
  bonus_paid: boolean;
}

interface XpLogEntry {
  id: string;
  xp_amount: number;
  reason: string;
  reference_id: string | null;
  created_at: string;
}

const PartnerGamificationAdmin = () => {
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [partnersTable, setPartnersTable] = useState<PartnerGamRow[]>([]);
  const [totalActivePartners, setTotalActivePartners] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [showXpLog, setShowXpLog] = useState<string | null>(null);
  const [xpLogData, setXpLogData] = useState<XpLogEntry[]>([]);
  const [xpLogPartnerName, setXpLogPartnerName] = useState("");
  const [payingBonus, setPayingBonus] = useState<string | null>(null);

  // New challenge form
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState("send_prompts");
  const [newTarget, setNewTarget] = useState("1");
  const [newValue, setNewValue] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newXp, setNewXp] = useState("50");
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadRanking(), loadChallenges(), loadPartnersTable()]);
    } finally {
      setIsLoading(false);
    }
  };

  const getWeekStart = () => {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    return monday.toISOString().split("T")[0];
  };

  const loadRanking = async () => {
    const weekStart = getWeekStart();

    const [unlockRes, toolRes, bonusRes, partnersRes, countRes] = await Promise.all([
      supabase.from("collaborator_unlock_earnings").select("collaborator_id, amount").gte("unlocked_at", weekStart),
      supabase.from("collaborator_tool_earnings").select("collaborator_id, amount").gte("created_at", weekStart),
      supabase.from("partner_bonus_payments").select("partner_id").eq("week_start", weekStart),
      supabase.from("partners").select("id, name").eq("is_active", true),
      supabase.from("partners").select("id", { count: "exact", head: true }).eq("is_active", true),
    ]);

    setTotalActivePartners(countRes.count || 0);

    const totals: Record<string, number> = {};
    (unlockRes.data || []).forEach(e => { totals[e.collaborator_id] = (totals[e.collaborator_id] || 0) + (e.amount || 0); });
    (toolRes.data || []).forEach(e => { totals[e.collaborator_id] = (totals[e.collaborator_id] || 0) + (e.amount || 0); });

    const paidSet = new Set((bonusRes.data || []).map(b => b.partner_id));
    const nameMap: Record<string, string> = {};
    (partnersRes.data || []).forEach(p => { nameMap[p.id] = p.name || "Colaborador"; });

    const sorted = Object.entries(totals)
      .map(([pid, total]) => ({
        partner_id: pid,
        partner_name: nameMap[pid] || "Colaborador",
        week_total: total,
        bonus_paid: paidSet.has(pid),
      }))
      .sort((a, b) => b.week_total - a.week_total);

    setRanking(sorted);
  };

  const loadChallenges = async () => {
    const { data } = await supabase
      .from("partner_weekly_challenges")
      .select("*")
      .order("week_start", { ascending: false })
      .limit(20);

    if (!data) return;

    // Get completion counts
    const ids = data.map(c => c.id);
    const { data: progressData } = await supabase
      .from("partner_challenge_progress")
      .select("challenge_id")
      .in("challenge_id", ids)
      .eq("completed", true);

    const completionMap: Record<string, number> = {};
    (progressData || []).forEach(p => {
      completionMap[p.challenge_id] = (completionMap[p.challenge_id] || 0) + 1;
    });

    setChallenges(data.map(c => ({ ...c, completed_count: completionMap[c.id] || 0 })));
  };

  const loadPartnersTable = async () => {
    const [partnersRes, gamRes, badgesRes, unlockRes, toolRes] = await Promise.all([
      supabase.from("partners").select("id, name").eq("is_active", true),
      supabase.from("partner_gamification").select("partner_id, xp_total, level, current_streak"),
      supabase.from("partner_badges").select("partner_id"),
      supabase.from("collaborator_unlock_earnings").select("collaborator_id, amount"),
      supabase.from("collaborator_tool_earnings").select("collaborator_id, amount"),
    ]);

    const gamMap: Record<string, { xp_total: number; level: number; current_streak: number }> = {};
    (gamRes.data || []).forEach(g => { gamMap[g.partner_id] = g; });

    const badgeCount: Record<string, number> = {};
    (badgesRes.data || []).forEach(b => { badgeCount[b.partner_id] = (badgeCount[b.partner_id] || 0) + 1; });

    const unlockTotals: Record<string, number> = {};
    (unlockRes.data || []).forEach(e => { unlockTotals[e.collaborator_id] = (unlockTotals[e.collaborator_id] || 0) + (e.amount || 0); });

    const toolTotals: Record<string, number> = {};
    (toolRes.data || []).forEach(e => { toolTotals[e.collaborator_id] = (toolTotals[e.collaborator_id] || 0) + (e.amount || 0); });

    const rows: PartnerGamRow[] = (partnersRes.data || []).map(p => ({
      partner_id: p.id,
      partner_name: p.name || "Colaborador",
      level: gamMap[p.id]?.level || 1,
      xp_total: gamMap[p.id]?.xp_total || 0,
      current_streak: gamMap[p.id]?.current_streak || 0,
      badge_count: badgeCount[p.id] || 0,
      unlock_earned: unlockTotals[p.id] || 0,
      tool_earned: toolTotals[p.id] || 0,
    }));

    rows.sort((a, b) => b.xp_total - a.xp_total);
    setPartnersTable(rows);
  };

  const payBonus = async (partnerId: string, amount: number, position: number) => {
    setPayingBonus(partnerId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const weekStart = getWeekStart();
      const reason = `Bônus ranking semanal - ${position}º lugar`;

      const { error: insertErr } = await supabase.from("partner_bonus_payments").insert({
        partner_id: partnerId,
        amount,
        reason,
        week_start: weekStart,
        added_by: user.id,
      });

      if (insertErr) throw insertErr;

      // Update balance
      const { error: balErr } = await supabase.rpc("add_partner_xp" as any, {
        _partner_id: partnerId,
        _xp_amount: 0,
        _reason: "bonus_ranking_semanal",
      });

      // Increment total_earned in collaborator_balances
      const { data: existing } = await supabase
        .from("collaborator_balances")
        .select("total_earned")
        .eq("collaborator_id", partnerId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("collaborator_balances")
          .update({ total_earned: existing.total_earned + amount, updated_at: new Date().toISOString() })
          .eq("collaborator_id", partnerId);
      } else {
        await supabase
          .from("collaborator_balances")
          .insert({ collaborator_id: partnerId, total_earned: amount, total_unlocks: 0 });
      }

      // Award top3 badge for positions 1-3
      if (position <= 3) {
        await supabase.rpc("award_partner_badge" as any, { _partner_id: partnerId, _badge_slug: "top3" });
      }

      toast.success(`Bônus de ${formatBRL(amount)} pago com sucesso!`);
      await loadRanking();
    } catch (err: any) {
      toast.error("Erro ao pagar bônus: " + err.message);
    } finally {
      setPayingBonus(null);
    }
  };

  const createChallenge = async () => {
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const { error } = await supabase.from("partner_weekly_challenges").insert({
        title: newTitle,
        description: newDesc,
        challenge_type: newType,
        target_count: parseInt(newTarget) || 1,
        target_value: newType === "earn_tool_value" ? parseFloat(newValue) || null : null,
        category_target: newType === "send_category" ? newCategory || null : null,
        xp_reward: parseInt(newXp) || 50,
        week_start: monday.toISOString().split("T")[0],
        week_end: sunday.toISOString().split("T")[0],
        created_by: user.id,
      });

      if (error) throw error;
      toast.success("Desafio criado!");
      setShowCreateChallenge(false);
      setNewTitle(""); setNewDesc(""); setNewType("send_prompts"); setNewTarget("1"); setNewValue(""); setNewCategory(""); setNewXp("50");
      await loadChallenges();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const deactivateChallenge = async (id: string) => {
    await supabase.from("partner_weekly_challenges").update({ is_active: false }).eq("id", id);
    toast.success("Desafio desativado");
    await loadChallenges();
  };

  const openXpLog = async (partnerId: string, partnerName: string) => {
    setShowXpLog(partnerId);
    setXpLogPartnerName(partnerName);
    const { data } = await supabase
      .from("partner_xp_log")
      .select("*")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false })
      .limit(100);
    setXpLogData(data || []);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const bonusPrizes = [15, 10, 5];
  const showRankingToCollaborators = totalActivePartners >= 20;

  return (
    <div className="space-y-8">
      {/* Weekly Ranking */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-400" /> Ranking Semanal
        </h2>
        <div className="flex items-center gap-3 mb-4">
          <Badge variant="outline" className={showRankingToCollaborators ? "border-green-500/30 text-green-400" : "border-red-500/30 text-red-400"}>
            {totalActivePartners}/20 colaboradores — {showRankingToCollaborators ? "Visível" : "Oculto"} para colaboradores
          </Badge>
        </div>

        {ranking.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum ganho registrado esta semana</p>
        ) : (
          <div className="space-y-2">
            {ranking.slice(0, 20).map((entry, idx) => {
              const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}º`;
              const prize = idx < 3 ? bonusPrizes[idx] : 0;
              return (
                <div
                  key={entry.partner_id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    idx < 3 ? "bg-yellow-500/5 border-yellow-500/10" : "bg-muted/20 border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg min-w-[2rem] text-center">{medal}</span>
                    <span className="text-sm font-medium text-foreground">{entry.partner_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-green-400">{formatBRL(entry.week_total)}</span>
                    {idx < 3 && prize > 0 && (
                      <Button
                        size="sm"
                        disabled={entry.bonus_paid || payingBonus === entry.partner_id}
                        onClick={() => payBonus(entry.partner_id, prize, idx + 1)}
                        className={entry.bonus_paid ? "bg-green-600/50 cursor-not-allowed" : "bg-yellow-600 hover:bg-yellow-700"}
                      >
                        {entry.bonus_paid ? "✓ Pago" : payingBonus === entry.partner_id ? "..." : `Pagar ${formatBRL(prize)}`}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Weekly Challenges */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-400" /> Desafios Semanais
          </h2>
          <Button size="sm" onClick={() => setShowCreateChallenge(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Criar Desafio
          </Button>
        </div>

        <div className="space-y-3">
          {challenges.map(ch => (
            <Card key={ch.id} className={`p-4 ${ch.is_active ? "" : "opacity-50"}`}>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="text-sm font-medium text-foreground">{ch.title}</p>
                  <p className="text-xs text-muted-foreground">{ch.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{ch.completed_count || 0} completaram</Badge>
                  <Badge variant="outline">+{ch.xp_reward} XP</Badge>
                  {ch.is_active && (
                    <Button size="sm" variant="ghost" onClick={() => deactivateChallenge(ch.id)}>
                      <X className="h-4 w-4 text-red-400" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {ch.week_start} — {ch.week_end} | Tipo: {ch.challenge_type}
                {ch.target_value ? ` | Meta: ${formatBRL(ch.target_value)}` : ` | Meta: ${ch.target_count}`}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* Partners Progress Table */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-400" /> Progresso dos Colaboradores
        </h2>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground">Nome</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground">Nível</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-muted-foreground">XP</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground">🔥 Sequência</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground">Badges</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-muted-foreground">Taxa Unlock</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-muted-foreground">G. Unlock</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-muted-foreground">G. Tool</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground">XP Log</th>
              </tr>
            </thead>
            <tbody>
              {partnersTable.map(p => (
                <tr key={p.partner_id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2 px-3 text-foreground font-medium">{p.partner_name}</td>
                  <td className="py-2 px-3 text-center">
                    <Badge variant="outline" className="text-xs">
                      {p.level} — {LEVEL_NAMES[p.level] || "?"}
                    </Badge>
                  </td>
                  <td className="py-2 px-3 text-right text-purple-400 font-bold">{p.xp_total}</td>
                  <td className="py-2 px-3 text-center text-orange-400">{p.current_streak}🔥</td>
                  <td className="py-2 px-3 text-center">{p.badge_count}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground">{formatBRL(UNLOCK_RATES[p.level] || 0.05)}</td>
                  <td className="py-2 px-3 text-right text-green-400">{formatBRL(p.unlock_earned)}</td>
                  <td className="py-2 px-3 text-right text-emerald-400">{formatBRL(p.tool_earned)}</td>
                  <td className="py-2 px-3 text-center">
                    <Button size="sm" variant="ghost" onClick={() => openXpLog(p.partner_id, p.partner_name)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Create Challenge Dialog */}
      <Dialog open={showCreateChallenge} onOpenChange={setShowCreateChallenge}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Desafio Semanal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: Envie 3 prompts" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Descrição do desafio" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="send_prompts">Enviar prompts</SelectItem>
                  <SelectItem value="get_unlocks">Receber prompts copiados</SelectItem>
                  <SelectItem value="get_tool_uses">Uso em ferramentas</SelectItem>
                  <SelectItem value="earn_tool_value">Ganhar valor em ferramentas</SelectItem>
                  <SelectItem value="send_category">Enviar por categoria</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Meta (contagem)</Label>
                <Input type="number" value={newTarget} onChange={e => setNewTarget(e.target.value)} />
              </div>
              <div>
                <Label>Recompensa XP</Label>
                <Input type="number" value={newXp} onChange={e => setNewXp(e.target.value)} />
              </div>
            </div>
            {newType === "earn_tool_value" && (
              <div>
                <Label>Meta de valor (R$)</Label>
                <Input type="number" step="0.01" value={newValue} onChange={e => setNewValue(e.target.value)} />
              </div>
            )}
            {newType === "send_category" && (
              <div>
                <Label>Categoria alvo</Label>
                <Input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Ex: Seedance 2" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateChallenge(false)}>Cancelar</Button>
            <Button onClick={createChallenge} disabled={creating || !newTitle || !newDesc}>
              {creating ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* XP Log Dialog */}
      <Dialog open={!!showXpLog} onOpenChange={() => setShowXpLog(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico XP — {xpLogPartnerName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {xpLogData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum XP registrado</p>
            ) : xpLogData.map(log => (
              <div key={log.id} className="flex items-center justify-between p-2 rounded border border-border/50 bg-muted/20">
                <div>
                  <p className="text-sm text-foreground">{log.reason.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString("pt-BR")}
                    {log.reference_id && <span className="ml-2 opacity-60">ref: {log.reference_id.slice(0, 8)}...</span>}
                  </p>
                </div>
                <Badge variant="outline" className="text-purple-400 border-purple-500/30">+{log.xp_amount} XP</Badge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnerGamificationAdmin;