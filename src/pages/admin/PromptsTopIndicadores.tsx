import { useState, useEffect } from "react";
import AdminLayoutPlatform from "@/components/AdminLayoutPlatform";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Users, Award, Gift, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

const PAGE_SIZE = 20;

interface TopReferrer {
  referrer_id: string;
  name: string;
  email: string;
  total_credits: number;
  lifetime_balance: number;
  recruited_count: number;
}

interface ReferredUser {
  referred_id: string;
  name: string;
  email: string;
  created_at: string;
}

const PromptsTopIndicadores = () => {
  const [referrers, setReferrers] = useState<TopReferrer[]>([]);
  const [totalReferrers, setTotalReferrers] = useState(0);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [referredTotal, setReferredTotal] = useState(0);
  const [referredPage, setReferredPage] = useState(0);
  const [referredLoading, setReferredLoading] = useState(false);

  // Fetch summary stats
  useEffect(() => {
    const fetchStats = async () => {
      const { data: allReferrals } = await supabase
        .from("referrals")
        .select("referrer_id, credits_given_referrer");

      if (allReferrals) {
        const uniqueReferrers = new Set(allReferrals.map((r) => r.referrer_id));
        setTotalReferrers(uniqueReferrers.size);
        setTotalReferrals(allReferrals.length);
        setTotalCredits(allReferrals.reduce((sum, r) => sum + (r.credits_given_referrer || 0), 0));
      }
    };
    fetchStats();
  }, []);

  // Fetch top referrers page
  useEffect(() => {
    const fetchReferrers = async () => {
      setLoading(true);

      // Get all referrals grouped by referrer
      const { data: allReferrals } = await supabase
        .from("referrals")
        .select("referrer_id, credits_given_referrer");

      if (!allReferrals) {
        setLoading(false);
        return;
      }

      // Aggregate
      const map = new Map<string, { total_credits: number; count: number }>();
      for (const r of allReferrals) {
        const existing = map.get(r.referrer_id) || { total_credits: 0, count: 0 };
        existing.total_credits += r.credits_given_referrer || 0;
        existing.count += 1;
        map.set(r.referrer_id, existing);
      }

      // Sort by count desc
      const sorted = Array.from(map.entries())
        .map(([id, v]) => ({ referrer_id: id, ...v }))
        .sort((a, b) => b.count - a.count);

      const pageSlice = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

      if (pageSlice.length === 0) {
        setReferrers([]);
        setLoading(false);
        return;
      }

      // Fetch profiles
      const ids = pageSlice.map((r) => r.referrer_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", ids);

      // Fetch credits
      const { data: credits } = await supabase
        .from("upscaler_credits")
        .select("user_id, lifetime_balance")
        .in("user_id", ids);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      const creditMap = new Map((credits || []).map((c) => [c.user_id, c.lifetime_balance]));

      const result: TopReferrer[] = pageSlice.map((r) => {
        const profile = profileMap.get(r.referrer_id);
        return {
          referrer_id: r.referrer_id,
          name: profile?.name || "N/A",
          email: profile?.email || "N/A",
          total_credits: r.total_credits,
          lifetime_balance: creditMap.get(r.referrer_id) || 0,
          recruited_count: r.count,
        };
      });

      setReferrers(result);
      setLoading(false);
    };
    fetchReferrers();
  }, [page]);

  // Fetch referred users when expanding
  useEffect(() => {
    if (!expandedId) return;
    const fetchReferred = async () => {
      setReferredLoading(true);

      const { count } = await supabase
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("referrer_id", expandedId);

      setReferredTotal(count || 0);

      const { data } = await supabase
        .from("referrals")
        .select("referred_id, created_at")
        .eq("referrer_id", expandedId)
        .order("created_at", { ascending: false })
        .range(referredPage * PAGE_SIZE, (referredPage + 1) * PAGE_SIZE - 1);

      if (data && data.length > 0) {
        const refIds = data.map((d) => d.referred_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", refIds);

        const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

        setReferredUsers(
          data.map((d) => {
            const p = profileMap.get(d.referred_id);
            return {
              referred_id: d.referred_id,
              name: p?.name || "N/A",
              email: p?.email || "N/A",
              created_at: d.created_at,
            };
          })
        );
      } else {
        setReferredUsers([]);
      }

      setReferredLoading(false);
    };
    fetchReferred();
  }, [expandedId, referredPage]);

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setReferredUsers([]);
      setReferredPage(0);
    } else {
      setExpandedId(id);
      setReferredPage(0);
    }
  };

  const totalPages = Math.ceil(totalReferrers / PAGE_SIZE);
  const referredTotalPages = Math.ceil(referredTotal / PAGE_SIZE);

  return (
    <AdminLayoutPlatform platform="prompts">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Top Indicadores</h1>
        <p className="text-muted-foreground mb-6">Ranking de usuários que mais indicaram novos membros</p>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Indicadores Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalReferrers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Indicações</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalReferrals}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Créditos Distribuídos</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCredits.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead className="text-right">Créditos Ganhos</TableHead>
                  <TableHead className="text-right">Créditos Restantes</TableHead>
                  <TableHead className="text-right">Recrutados</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : referrers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum indicador encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  referrers.map((r, i) => (
                    <>
                      <TableRow
                        key={r.referrer_id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => toggleExpand(r.referrer_id)}
                      >
                        <TableCell className="font-medium">{page * PAGE_SIZE + i + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{r.name}</p>
                            <p className="text-xs text-muted-foreground">{r.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{r.total_credits.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{r.lifetime_balance.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">{r.recruited_count}</TableCell>
                        <TableCell>
                          {expandedId === r.referrer_id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Expanded referred list */}
                      {expandedId === r.referrer_id && (
                        <TableRow key={`${r.referrer_id}-detail`}>
                          <TableCell colSpan={6} className="bg-muted/30 p-4">
                            <p className="text-sm font-semibold mb-3">
                              Pessoas indicadas por {r.name}
                            </p>
                            {referredLoading ? (
                              <p className="text-sm text-muted-foreground">Carregando...</p>
                            ) : referredUsers.length === 0 ? (
                              <p className="text-sm text-muted-foreground">Nenhum indicado encontrado</p>
                            ) : (
                              <>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Nome</TableHead>
                                      <TableHead>Email</TableHead>
                                      <TableHead>Data da Indicação</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {referredUsers.map((u) => (
                                      <TableRow key={u.referred_id}>
                                        <TableCell>{u.name}</TableCell>
                                        <TableCell>{u.email}</TableCell>
                                        <TableCell>
                                          {format(new Date(u.created_at), "dd/MM/yyyy HH:mm")}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                                {referredTotalPages > 1 && (
                                  <div className="flex items-center justify-between mt-3">
                                    <p className="text-xs text-muted-foreground">
                                      Página {referredPage + 1} de {referredTotalPages}
                                    </p>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={referredPage === 0}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setReferredPage((p) => p - 1);
                                        }}
                                      >
                                        <ChevronLeft className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={referredPage >= referredTotalPages - 1}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setReferredPage((p) => p + 1);
                                        }}
                                      >
                                        <ChevronRight className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Main Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Página {page + 1} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayoutPlatform>
  );
};

export default PromptsTopIndicadores;
