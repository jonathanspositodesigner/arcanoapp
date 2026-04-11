import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayoutPlatform from "@/components/AdminLayoutPlatform";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Cpu, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const CUSTO_RH = 0.002;
const TAXA_RH = 0.2;
const MULT = 3;
const FALLBACK_RECEITA_CREDITO = 0.0057;

function calcular(apiR: number, tempoMin: number, receitaCredito: number) {
  const seg = tempoMin * 60;
  const rhCoins = seg * TAXA_RH;
  const custoRH = rhCoins * CUSTO_RH;
  const total = apiR + custoRH;
  const creditos = Math.ceil(total / receitaCredito);
  const cobrar3x = total * MULT;
  const creditos3x = Math.ceil(cobrar3x / receitaCredito);
  return { seg, rhCoins, custoRH, total, creditos, cobrar3x, creditos3x };
}

function fmt(n: number, d = 3) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
}

const PromptsMotoresIA = () => {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [modo, setModo] = useState("Standard");
  const [apiCost, setApiCost] = useState("");
  const [tempo, setTempo] = useState("");
  const [saving, setSaving] = useState(false);

  // Dynamic revenue per credit from real sales
  const { data: receitaData, isLoading: loadingReceita } = useQuery({
    queryKey: ["receita-por-credito-real"],
    queryFn: async () => {
      // Fetch from Pagar.me/Asaas
      const { data: pagarme } = await supabase
        .from("asaas_orders")
        .select("product_id, net_amount, amount")
        .eq("status", "paid")
        .not("product_id", "is", null);

      // Fetch from Stripe
      const { data: stripeOrders } = await supabase
        .from("stripe_orders" as any)
        .select("product_id, net_amount, amount")
        .eq("status", "paid")
        .not("product_id", "is", null);

      // Fetch products with credits
      const { data: products } = await supabase
        .from("mp_products" as any)
        .select("id, credits_amount")
        .gt("credits_amount", 0);

      if (!products || products.length === 0) return null;

      const productMap = new Map<string, number>();
      (products as any[]).forEach((p: any) => productMap.set(p.id, p.credits_amount));

      let totalReceita = 0;
      let totalCreditos = 0;
      let totalVendas = 0;

      const processOrders = (orders: any[] | null) => {
        if (!orders) return;
        orders.forEach((o: any) => {
          const creds = productMap.get(o.product_id);
          if (creds && creds > 0) {
            totalReceita += o.net_amount ?? o.amount ?? 0;
            totalCreditos += creds;
            totalVendas++;
          }
        });
      };

      processOrders(pagarme);
      processOrders(stripeOrders as any);

      if (totalCreditos === 0) return null;

      return {
        receitaPorCredito: totalReceita / totalCreditos,
        totalReceita,
        totalCreditos,
        totalVendas,
      };
    },
    refetchInterval: 60000, // refresh every minute
  });

  const receitaCredito = receitaData?.receitaPorCredito ?? FALLBACK_RECEITA_CREDITO;

  const { data: dados = [], isLoading } = useQuery({
    queryKey: ["ai-engine-costs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_engine_costs" as any)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Recalculate all rows with dynamic receita
  const dadosRecalculados = useMemo(() => {
    return dados.map((d: any) => {
      const total = d.custo_total;
      const creditos = Math.ceil(total / receitaCredito);
      const cobrar3x = total * MULT;
      const creditos3x = Math.ceil(cobrar3x / receitaCredito);
      return { ...d, creditos_cobrir: creditos, cobrar_3x: cobrar3x, creditos_3x: creditos3x };
    });
  }, [dados, receitaCredito]);

  const preview = useMemo(() => {
    const a = parseFloat(apiCost);
    const t = parseFloat(tempo);
    if (isNaN(a) || isNaN(t) || t <= 0) return null;
    return calcular(a, t, receitaCredito);
  }, [apiCost, tempo, receitaCredito]);

  const adicionar = async () => {
    const a = parseFloat(apiCost);
    const t = parseFloat(tempo);
    if (!nome.trim() || isNaN(a) || isNaN(t) || t <= 0) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }
    setSaving(true);
    const c = calcular(a, t, receitaCredito);
    const { error } = await supabase.from("ai_engine_costs" as any).insert({
      nome: nome.trim(),
      modo,
      api_cost: a,
      tempo_segundos: c.seg,
      rh_coins: c.rhCoins,
      custo_rh: c.custoRH,
      custo_total: c.total,
      creditos_cobrir: c.creditos,
      cobrar_3x: c.cobrar3x,
      creditos_3x: c.creditos3x,
    } as any);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar modelo.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["ai-engine-costs"] });
    setNome("");
    setApiCost("");
    setTempo("");
    toast.success(`Modelo "${nome.trim()}" adicionado!`);
  };

  const remover = async (id: string) => {
    const { error } = await supabase.from("ai_engine_costs" as any).delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["ai-engine-costs"] });
    toast.success("Modelo removido.");
  };

  return (
    <AdminLayoutPlatform platform="prompts">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1 flex items-center gap-3">
            <Cpu className="h-8 w-8 text-primary" />
            Motores IA — Tabela de Custos
          </h1>
          <p className="text-muted-foreground text-sm">Calculadora de custos e créditos por modelo de IA</p>
        </div>

        {/* Reference Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="p-4 text-center border-border">
            <p className="text-[0.7rem] text-muted-foreground uppercase tracking-wider">Custo / RH Coin</p>
            <p className="text-lg font-bold text-primary mt-1">R$ 0,0020</p>
          </Card>
          <Card className="p-4 text-center border-emerald-500/30 bg-emerald-500/5">
            <p className="text-[0.7rem] text-emerald-400 uppercase tracking-wider font-semibold flex items-center justify-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Receita / Crédito
            </p>
            {loadingReceita ? (
              <Loader2 className="h-4 w-4 animate-spin mx-auto mt-2 text-emerald-400" />
            ) : (
              <>
                <p className="text-lg font-bold text-emerald-400 mt-1">
                  R$ {receitaCredito.toFixed(4)}
                </p>
                {receitaData && (
                  <p className="text-[0.6rem] text-emerald-400/60 mt-0.5">
                    {receitaData.totalVendas} vendas · {receitaData.totalCreditos.toLocaleString("pt-BR")} créd
                  </p>
                )}
              </>
            )}
          </Card>
          <Card className="p-4 text-center border-border">
            <p className="text-[0.7rem] text-muted-foreground uppercase tracking-wider">Taxa RH (Standard)</p>
            <p className="text-lg font-bold text-primary mt-1">0,2 coins/seg</p>
          </Card>
          <Card className="p-4 text-center border-amber-500/30">
            <p className="text-[0.7rem] text-amber-400 uppercase tracking-wider font-semibold">Meta de Lucro</p>
            <p className="text-lg font-bold text-amber-400 mt-1">3× por geração</p>
          </Card>
          <Card className="p-4 text-center border-blue-500/30 bg-blue-500/5">
            <p className="text-[0.7rem] text-blue-400 uppercase tracking-wider font-semibold">Receita Total Créd.</p>
            {loadingReceita ? (
              <Loader2 className="h-4 w-4 animate-spin mx-auto mt-2 text-blue-400" />
            ) : (
              <p className="text-lg font-bold text-blue-400 mt-1">
                R$ {(receitaData?.totalReceita ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Colunas em <span className="text-amber-400 font-bold">dourado</span> = o que cobrar para lucrar 3× em cada geração · 
          <span className="text-emerald-400 font-bold"> Receita/Crédito</span> = média real das vendas (atualiza em tempo real)
        </p>

        {/* Table */}
        <Card className="overflow-hidden border-border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-primary font-semibold text-[0.7rem] uppercase">Modelo</TableHead>
                  <TableHead className="text-primary font-semibold text-[0.7rem] uppercase">Modo</TableHead>
                  <TableHead className="text-primary font-semibold text-[0.7rem] uppercase">Custo API</TableHead>
                  <TableHead className="text-primary font-semibold text-[0.7rem] uppercase">Tempo</TableHead>
                  <TableHead className="text-primary font-semibold text-[0.7rem] uppercase">RH Coins</TableHead>
                  <TableHead className="text-primary font-semibold text-[0.7rem] uppercase">Custo RH (R$)</TableHead>
                  <TableHead className="text-primary font-semibold text-[0.7rem] uppercase">Custo Total (R$)</TableHead>
                  <TableHead className="text-primary font-semibold text-[0.7rem] uppercase">Créditos p/ cobrir</TableHead>
                  <TableHead className="text-amber-400 font-bold text-[0.7rem] uppercase border-l-2 border-amber-500/20">💰 Cobrar 3× (R$)</TableHead>
                  <TableHead className="text-amber-400 font-bold text-[0.7rem] uppercase">🎯 Créditos 3×</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : dadosRecalculados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                      Nenhum modelo cadastrado. Adicione abaixo ⬇️
                    </TableCell>
                  </TableRow>
                ) : (
                  dadosRecalculados.map((d: any) => (
                    <TableRow key={d.id} className="hover:bg-muted/20">
                      <TableCell className="font-bold text-foreground">{d.nome}</TableCell>
                      <TableCell>
                        <Badge variant={d.modo === "Free" ? "default" : "destructive"} className={d.modo === "Free" ? "bg-emerald-900/60 text-emerald-300 hover:bg-emerald-900/60" : "bg-red-900/60 text-red-300 hover:bg-red-900/60"}>
                          {d.modo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-amber-400 font-semibold">R$ {fmt(d.api_cost)}</TableCell>
                      <TableCell className="text-muted-foreground">{d.tempo_segundos}s ({d.tempo_segundos / 60}min)</TableCell>
                      <TableCell className="text-muted-foreground">{fmt(d.rh_coins, 1)}</TableCell>
                      <TableCell className="text-muted-foreground">R$ {fmt(d.custo_rh)}</TableCell>
                      <TableCell className="text-red-400 font-bold">R$ {fmt(d.custo_total)}</TableCell>
                      <TableCell className="text-emerald-400 font-bold">{d.creditos_cobrir} créditos</TableCell>
                      <TableCell className="text-amber-400 font-extrabold text-[0.95rem] border-l-2 border-amber-500/20">R$ {fmt(d.cobrar_3x)}</TableCell>
                      <TableCell className="text-amber-300 font-extrabold text-[0.95rem]">{d.creditos_3x} créditos</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => remover(d.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Add Form */}
        <Card className="p-6 border-border max-w-2xl mx-auto">
          <h2 className="text-base font-bold text-primary mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Adicionar novo modelo
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase">Nome do Modelo</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex: Kling 1.6, Sora, Runway Gen-4..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase">Modo</Label>
              <Select value={modo} onValueChange={setModo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Free">Free</SelectItem>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Plus">Plus</SelectItem>
                  <SelectItem value="API">API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase">Custo API / geração (R$)</Label>
              <Input type="number" step="0.001" value={apiCost} onChange={(e) => setApiCost(e.target.value)} placeholder="ex: 1.50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase">Tempo estimado (min)</Label>
              <Input type="number" step="0.5" value={tempo} onChange={(e) => setTempo(e.target.value)} placeholder="ex: 2" />
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <Card className="mt-4 p-4 bg-muted/20 border-border space-y-1.5">
              <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Pré-visualização do cálculo</p>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">RH Coins consumidos</span><span className="text-primary font-semibold">{fmt(preview.rhCoins, 1)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Custo RH (R$)</span><span className="text-primary font-semibold">R$ {fmt(preview.custoRH)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Custo Total (R$)</span><span className="text-primary font-semibold">R$ {fmt(preview.total)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Créditos p/ cobrir custo</span><span className="text-primary font-semibold">{preview.creditos} créditos</span></div>
              <div className="flex justify-between text-sm"><span className="text-emerald-400">Receita/crédito usado</span><span className="text-emerald-400 font-semibold">R$ {receitaCredito.toFixed(4)}</span></div>
              <div className="border-t border-amber-500/20 mt-2 pt-2">
                <div className="flex justify-between text-sm"><span className="text-amber-400 font-bold">💰 Cobrar para 3× (R$)</span><span className="text-amber-400 font-extrabold text-base">R$ {fmt(preview.cobrar3x)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-amber-400 font-bold">🎯 Créditos cobrar 3×</span><span className="text-amber-400 font-extrabold text-base">{preview.creditos3x} créditos</span></div>
              </div>
            </Card>
          )}

          <Button className="w-full mt-4 font-bold" onClick={adicionar} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Adicionar à Tabela
          </Button>
        </Card>
      </div>
    </AdminLayoutPlatform>
  );
};

export default PromptsMotoresIA;
