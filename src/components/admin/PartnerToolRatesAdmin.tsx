import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Wrench, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ToolRate {
  id: string;
  tool_table: string;
  tool_display_name: string;
  earning_per_use: number;
  is_active: boolean;
  updated_at: string;
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const PartnerToolRatesAdmin = () => {
  const [rates, setRates] = useState<ToolRate[]>([]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRates = async () => {
    const { data, error } = await supabase
      .from("collaborator_tool_rates")
      .select("*")
      .order("tool_display_name");
    if (error) {
      console.error("Error fetching rates:", error);
      toast.error("Erro ao carregar taxas");
      return;
    }
    setRates((data as ToolRate[]) || []);
    const vals: Record<string, string> = {};
    (data || []).forEach((r: ToolRate) => {
      vals[r.id] = Number(r.earning_per_use).toFixed(2).replace(".", ",");
    });
    setEditValues(vals);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const handleSave = async (rate: ToolRate) => {
    const raw = editValues[rate.id]?.replace(",", ".") || "0";
    const newValue = parseFloat(raw);
    if (isNaN(newValue) || newValue < 0) {
      toast.error("Valor inválido");
      return;
    }

    setSavingId(rate.id);
    const { error } = await supabase
      .from("collaborator_tool_rates")
      .update({
        earning_per_use: newValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rate.id);

    if (error) {
      console.error("Error updating rate:", error);
      toast.error("Erro ao salvar");
    } else {
      toast.success(
        `${rate.tool_display_name} atualizado para ${formatBRL(newValue)}`
      );
      await fetchRates();
    }
    setSavingId(null);
  };

  const handleToggleActive = async (rate: ToolRate) => {
    const { error } = await supabase
      .from("collaborator_tool_rates")
      .update({
        is_active: !rate.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rate.id);

    if (error) {
      toast.error("Erro ao alterar status");
    } else {
      toast.success(
        `${rate.tool_display_name} ${!rate.is_active ? "ativado" : "desativado"}`
      );
      await fetchRates();
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6 mb-6">
        <p className="text-muted-foreground text-center">Carregando taxas...</p>
      </Card>
    );
  }

  return (
    <Card className="p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Wrench className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">
          Taxas por Ferramenta
        </h2>
        <Badge variant="outline" className="ml-auto text-xs">
          Alterações valem para novos usos
        </Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 text-xs font-semibold text-muted-foreground">
                Ferramenta
              </th>
              <th className="text-left py-2 px-2 text-xs font-semibold text-muted-foreground">
                Tabela
              </th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-muted-foreground">
                Valor Atual
              </th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-muted-foreground">
                Novo Valor (R$)
              </th>
              <th className="text-center py-2 px-2 text-xs font-semibold text-muted-foreground">
                Ativo
              </th>
              <th className="text-center py-2 px-2 text-xs font-semibold text-muted-foreground">
                Ação
              </th>
            </tr>
          </thead>
          <tbody>
            {rates.map((rate) => {
              const currentEdit = editValues[rate.id] || "";
              const currentNum = parseFloat(currentEdit.replace(",", "."));
              const hasChange =
                !isNaN(currentNum) &&
                Math.abs(currentNum - Number(rate.earning_per_use)) > 0.001;

              return (
                <tr
                  key={rate.id}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-2.5 px-2 font-medium text-foreground">
                    {rate.tool_display_name}
                  </td>
                  <td className="py-2.5 px-2 text-xs text-muted-foreground font-mono">
                    {rate.tool_table}
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <Badge
                      className={
                        rate.is_active
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {formatBRL(Number(rate.earning_per_use))}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <Input
                      value={currentEdit}
                      onChange={(e) =>
                        setEditValues((prev) => ({
                          ...prev,
                          [rate.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && hasChange) handleSave(rate);
                      }}
                      className="w-24 text-right ml-auto"
                      placeholder="0,00"
                    />
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <Switch
                      checked={rate.is_active}
                      onCheckedChange={() => handleToggleActive(rate)}
                    />
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <Button
                      size="sm"
                      variant={hasChange ? "default" : "ghost"}
                      disabled={!hasChange || savingId === rate.id}
                      onClick={() => handleSave(rate)}
                    >
                      {savingId === rate.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default PartnerToolRatesAdmin;