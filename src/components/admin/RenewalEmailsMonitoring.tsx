import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Search, Mail, MailX, RefreshCw, Loader2, ChevronLeft, ChevronRight, Save, TrendingUp, Edit3, Eye, Code, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

// ========== TYPES ==========
interface ReminderLog {
  id: string;
  user_id: string;
  plan_slug: string;
  due_date: string;
  day_offset: number;
  email_sent_to: string;
  checkout_url: string | null;
  sent_at: string;
  stopped_reason: string | null;
  userName?: string;
}

interface RenewalTemplate {
  id: number;
  day_offset: number;
  subject: string;
  preheader: string;
  body_html: string;
  updated_at: string;
}

interface RenewalStats {
  email: string;
  name: string | null;
  plan_slug: string;
  due_date: string;
  total_emails_sent: number;
  last_email_day: number;
  renewed: boolean;
  renewed_after_day: number | null;
}

const PAGE_SIZE = 20;

const DAY_LABELS: Record<number, string> = {
  0: "Dia do Vencimento",
  1: "1 dia após",
  2: "2 dias após",
  3: "3 dias após",
  4: "4 dias após",
  5: "5 dias após (último)",
};

const PLAN_NAMES: Record<string, string> = {
  "plano-starter-mensal": "Starter Mensal",
  "plano-starter-anual": "Starter Anual",
  "plano-pro-mensal": "Pro Mensal",
  "plano-pro-anual": "Pro Anual",
  "plano-ultimate-mensal": "Ultimate Mensal",
  "plano-ultimate-anual": "Ultimate Anual",
  "plano-unlimited-mensal": "Unlimited Mensal",
  "plano-unlimited-anual": "Unlimited Anual",
};

// ========== SUB-TAB: EMAIL LOGS ==========
const EmailLogsTab = () => {
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("subscription_billing_reminders")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      const items = (data || []) as ReminderLog[];

      // Enrich with profile names
      const emails = [...new Set(items.map((i) => i.email_sent_to))];
      if (emails.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("email, name")
          .in("email", emails.slice(0, 100));
        
        if (profiles) {
          const profileMap = new Map(
            (profiles as any[]).map((p: any) => [p.email?.toLowerCase(), p.name])
          );
          items.forEach((i) => {
            i.userName = profileMap.get(i.email_sent_to?.toLowerCase()) || undefined;
          });
        }
      }

      setLogs(items);
    } catch (err) {
      console.error("Error fetching reminder logs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter(
      (l) =>
        l.email_sent_to?.toLowerCase().includes(q) ||
        l.userName?.toLowerCase().includes(q) ||
        l.plan_slug?.toLowerCase().includes(q)
    );
  }, [logs, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const getStatusBadge = (log: ReminderLog) => {
    if (log.stopped_reason === "paid") {
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Renovou</Badge>;
    }
    if (log.stopped_reason === "unsubscribed") {
      return <Badge variant="destructive">Descadastrado</Badge>;
    }
    return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Enviado</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por email, nome ou plano..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="max-w-sm"
        />
        <Button variant="outline" size="sm" onClick={fetchLogs} className="ml-auto gap-1">
          <RefreshCw className="h-3 w-3" /> Atualizar
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 text-center bg-card border-border">
          <p className="text-2xl font-bold text-foreground">{logs.length}</p>
          <p className="text-xs text-muted-foreground">Total enviados</p>
        </Card>
        <Card className="p-3 text-center bg-card border-border">
          <p className="text-2xl font-bold text-emerald-400">
            {logs.filter((l) => l.stopped_reason === "paid").length}
          </p>
          <p className="text-xs text-muted-foreground">Renovaram</p>
        </Card>
        <Card className="p-3 text-center bg-card border-border">
          <p className="text-2xl font-bold text-destructive">
            {logs.filter((l) => l.stopped_reason === "unsubscribed").length}
          </p>
          <p className="text-xs text-muted-foreground">Descadastraram</p>
        </Card>
        <Card className="p-3 text-center bg-card border-border">
          <p className="text-2xl font-bold text-blue-400">
            {logs.filter((l) => !l.stopped_reason).length}
          </p>
          <p className="text-xs text-muted-foreground">Em sequência</p>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center bg-card border-border">
          <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Nenhum email de renovação enviado ainda</p>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {paginated.map((log) => (
              <Card
                key={log.id}
                className="p-3 bg-card border-border hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground truncate">
                        {log.userName || log.email_sent_to}
                      </span>
                      {getStatusBadge(log)}
                    </div>
                    {log.userName && (
                      <p className="text-xs text-muted-foreground truncate">{log.email_sent_to}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>📧 {DAY_LABELS[log.day_offset] || `Dia ${log.day_offset}`}</span>
                      <span>📋 {PLAN_NAMES[log.plan_slug] || log.plan_slug}</span>
                      <span>📅 Venc: {log.due_date}</span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {format(new Date(log.sent_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-muted-foreground">
                Página {page + 1} de {totalPages} ({filtered.length} registros)
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ========== SUB-TAB: TEMPLATE EDITOR ==========
const TemplateEditorTab = () => {
  const [templates, setTemplates] = useState<RenewalTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editPreheader, setEditPreheader] = useState("");
  const [editBodyHtml, setEditBodyHtml] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [previewDay, setPreviewDay] = useState<number | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("renewal_email_templates")
        .select("*")
        .order("day_offset", { ascending: true });

      if (error) throw error;
      setTemplates((data || []) as RenewalTemplate[]);
    } catch (err) {
      console.error("Error fetching templates:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (t: RenewalTemplate) => {
    setEditingDay(t.day_offset);
    setEditSubject(t.subject);
    setEditPreheader(t.preheader);
    setEditBodyHtml(t.body_html);
  };

  const saveTemplate = async (dayOffset: number) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("renewal_email_templates")
        .update({
          subject: editSubject,
          preheader: editPreheader,
          body_html: editBodyHtml,
          updated_at: new Date().toISOString(),
        })
        .eq("day_offset", dayOffset);

      if (error) throw error;
      toast.success(`Template do ${DAY_LABELS[dayOffset]} salvo!`);
      setEditingDay(null);
      fetchTemplates();
    } catch (err) {
      toast.error("Erro ao salvar template");
    } finally {
      setIsSaving(false);
    }
  };

  const getPreviewHtml = (bodyHtml: string) => {
    // Replace placeholders with sample data for preview
    return bodyHtml
      .replace(/\{\{USER_NAME\}\}/g, "João Silva")
      .replace(/\{\{PLAN_NAME\}\}/g, "Pro")
      .replace(/\{\{PLAN_VALUE\}\}/g, "R$ 49,90")
      .replace(/\{\{DUE_DATE\}\}/g, "13/03/2026")
      .replace(/\{\{BENEFITS_LIST\}\}/g, '<li style="color:#e2d8f0;font-size:15px;padding:6px 0;line-height:1.5;">✅ 4.200 créditos mensais</li><li style="color:#e2d8f0;font-size:15px;padding:6px 0;line-height:1.5;">✅ 10 prompts premium por dia</li>')
      .replace(/\{\{LOSSES_LIST\}\}/g, '<li style="color:#fca5a5;font-size:15px;padding:6px 0;line-height:1.5;">❌ Seus 4.200 créditos mensais</li><li style="color:#fca5a5;font-size:15px;padding:6px 0;line-height:1.5;">❌ O acesso a 10 prompts premium por dia</li>');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Edite os emails de renovação. Variáveis disponíveis:{" "}
        <code className="bg-muted px-1 rounded text-xs">{"{{USER_NAME}}"}</code>{" "}
        <code className="bg-muted px-1 rounded text-xs">{"{{PLAN_NAME}}"}</code>{" "}
        <code className="bg-muted px-1 rounded text-xs">{"{{PLAN_VALUE}}"}</code>{" "}
        <code className="bg-muted px-1 rounded text-xs">{"{{DUE_DATE}}"}</code>{" "}
        <code className="bg-muted px-1 rounded text-xs">{"{{BENEFITS_LIST}}"}</code>{" "}
        <code className="bg-muted px-1 rounded text-xs">{"{{LOSSES_LIST}}"}</code>
      </p>

      {/* Preview Modal */}
      {previewDay !== null && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreviewDay(null)}>
          <div className="bg-[#0d0015] rounded-xl max-w-[660px] w-full max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#0d0015] border-b border-border p-3 flex items-center justify-between z-10">
              <span className="text-sm font-medium text-foreground">
                Preview: {DAY_LABELS[previewDay]}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setPreviewDay(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div
              dangerouslySetInnerHTML={{
                __html: getPreviewHtml(
                  editingDay === previewDay
                    ? editBodyHtml
                    : templates.find((t) => t.day_offset === previewDay)?.body_html || ""
                ),
              }}
              className="p-6"
            />
          </div>
        </div>
      )}

      {templates.map((t) => (
        <Card key={t.day_offset} className="p-4 bg-card border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {DAY_LABELS[t.day_offset]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Atualizado: {format(new Date(t.updated_at), "dd/MM/yy HH:mm", { locale: ptBR })}
              </span>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewDay(t.day_offset)}
                className="gap-1 text-xs"
              >
                <Eye className="h-3 w-3" /> Preview
              </Button>
              {editingDay !== t.day_offset && (
                <Button variant="ghost" size="sm" onClick={() => startEditing(t)} className="gap-1 text-xs">
                  <Edit3 className="h-3 w-3" /> Editar
                </Button>
              )}
            </div>
          </div>

          {editingDay === t.day_offset ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Assunto</label>
                <Input
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Pré-header</label>
                <Textarea
                  value={editPreheader}
                  onChange={(e) => setEditPreheader(e.target.value)}
                  className="text-sm min-h-[60px]"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1">
                  <Code className="h-3 w-3" /> Conteúdo HTML do email
                </label>
                <Textarea
                  value={editBodyHtml}
                  onChange={(e) => setEditBodyHtml(e.target.value)}
                  className="text-xs min-h-[300px] font-mono"
                  placeholder="HTML do corpo do email..."
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveTemplate(t.day_offset)} disabled={isSaving} className="gap-1">
                  {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Salvar
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPreviewDay(t.day_offset)} className="gap-1">
                  <Eye className="h-3 w-3" /> Preview
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingDay(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-foreground font-medium">{t.subject}</p>
              <p className="text-xs text-muted-foreground mt-1">{t.preheader}</p>
              <p className="text-xs text-muted-foreground mt-1 italic">
                {t.body_html ? `${t.body_html.length} caracteres de HTML` : "Sem conteúdo HTML"}
              </p>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

// ========== SUB-TAB: RENEWAL ANALYTICS ==========
const RenewalAnalyticsTab = () => {
  const [stats, setStats] = useState<RenewalStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      // Get all reminders grouped by user + due_date
      const { data: reminders, error } = await supabase
        .from("subscription_billing_reminders")
        .select("user_id, email_sent_to, plan_slug, due_date, day_offset, stopped_reason, sent_at")
        .order("due_date", { ascending: false });

      if (error) throw error;

      // Group by user_id + due_date
      const grouped = new Map<string, {
        email: string;
        plan_slug: string;
        due_date: string;
        reminders: typeof reminders;
      }>();

      for (const r of (reminders || [])) {
        const key = `${r.user_id}|${r.due_date}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            email: (r as any).email_sent_to,
            plan_slug: (r as any).plan_slug,
            due_date: (r as any).due_date,
            reminders: [],
          });
        }
        grouped.get(key)!.reminders!.push(r);
      }

      // Build stats
      const result: RenewalStats[] = [];
      for (const [, group] of grouped) {
        const rems = group.reminders || [];
        const totalSent = rems.filter((r: any) => !r.stopped_reason).length;
        const lastSent = rems.filter((r: any) => !r.stopped_reason).sort((a: any, b: any) => b.day_offset - a.day_offset)[0];
        const paidRem = rems.find((r: any) => r.stopped_reason === "paid");

        result.push({
          email: group.email,
          name: null,
          plan_slug: group.plan_slug,
          due_date: group.due_date,
          total_emails_sent: totalSent,
          last_email_day: (lastSent as any)?.day_offset ?? -1,
          renewed: !!paidRem,
          renewed_after_day: paidRem ? (paidRem as any).day_offset : null,
        });
      }

      // Enrich with names
      const emails = [...new Set(result.map((r) => r.email))];
      if (emails.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("email, name")
          .in("email", emails.slice(0, 200));

        if (profiles) {
          const nameMap = new Map(
            (profiles as any[]).map((p: any) => [p.email?.toLowerCase(), p.name])
          );
          result.forEach((r) => {
            r.name = nameMap.get(r.email?.toLowerCase()) || null;
          });
        }
      }

      setStats(result);
    } catch (err) {
      console.error("Error fetching renewal stats:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return stats;
    const q = search.toLowerCase();
    return stats.filter(
      (s) => s.email?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q)
    );
  }, [stats, search]);

  const totalUsers = stats.length;
  const renewedUsers = stats.filter((s) => s.renewed).length;
  const renewalRate = totalUsers > 0 ? ((renewedUsers / totalUsers) * 100).toFixed(1) : "0";

  // Which day triggered most renewals
  const renewalsByDay = stats
    .filter((s) => s.renewed && s.renewed_after_day !== null)
    .reduce((acc, s) => {
      const day = s.renewed_after_day!;
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 text-center bg-card border-border">
          <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
          <p className="text-xs text-muted-foreground">Usuários notificados</p>
        </Card>
        <Card className="p-3 text-center bg-card border-border">
          <p className="text-2xl font-bold text-emerald-400">{renewedUsers}</p>
          <p className="text-xs text-muted-foreground">Renovaram</p>
        </Card>
        <Card className="p-3 text-center bg-card border-border">
          <p className="text-2xl font-bold text-primary">{renewalRate}%</p>
          <p className="text-xs text-muted-foreground">Taxa de renovação</p>
        </Card>
        <Card className="p-3 text-center bg-card border-border">
          <p className="text-2xl font-bold text-foreground">{totalUsers - renewedUsers}</p>
          <p className="text-xs text-muted-foreground">Não renovaram</p>
        </Card>
      </div>

      {/* Renewal by day breakdown */}
      {Object.keys(renewalsByDay).length > 0 && (
        <Card className="p-4 bg-card border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Renovações por email enviado
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[0, 1, 2, 3, 4, 5].map((day) => (
              <div key={day} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                <span className="text-xs text-muted-foreground">{DAY_LABELS[day]}</span>
                <span className="text-sm font-bold text-foreground">{renewalsByDay[day] || 0}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* User table */}
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por email ou nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center bg-card border-border">
          <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Nenhum dado de renovação ainda</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((stat, idx) => (
            <Card key={idx} className="p-3 bg-card border-border hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground truncate">
                      {stat.name || stat.email}
                    </span>
                    {stat.renewed ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        Renovou após email {stat.renewed_after_day}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Não renovou</Badge>
                    )}
                  </div>
                  {stat.name && (
                    <p className="text-xs text-muted-foreground truncate">{stat.email}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>📋 {PLAN_NAMES[stat.plan_slug] || stat.plan_slug}</span>
                    <span>📅 Venc: {stat.due_date}</span>
                    <span>📧 {stat.total_emails_sent} emails enviados</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ========== MAIN COMPONENT ==========
const RenewalEmailsMonitoring = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Mail className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold text-foreground">Emails de Renovação</h2>
          <p className="text-sm text-muted-foreground">Monitoramento dos emails de cobrança Pix</p>
        </div>
      </div>

      <Tabs defaultValue="logs" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="logs" className="text-xs">📧 Emails Enviados</TabsTrigger>
          <TabsTrigger value="templates" className="text-xs">✏️ Templates</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs">📊 Taxa de Renovação</TabsTrigger>
        </TabsList>
        <TabsContent value="logs" className="mt-4">
          <EmailLogsTab />
        </TabsContent>
        <TabsContent value="templates" className="mt-4">
          <TemplateEditorTab />
        </TabsContent>
        <TabsContent value="analytics" className="mt-4">
          <RenewalAnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RenewalEmailsMonitoring;
