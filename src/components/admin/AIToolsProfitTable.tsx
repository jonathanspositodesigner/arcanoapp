import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  RefreshCw, Settings, Plus, TrendingUp, Coins, 
  Calculator, Trash2, Info, Sparkles, Pencil
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAIToolSettings } from "@/hooks/useAIToolSettings";

interface ToolCostData {
  tool_name: string;
  total_jobs: number;
  avg_rh_cost: number;
  avg_credit_cost: number;
  total_rh_cost: number;
  total_credit_cost: number;
}

interface CustomTool {
  id: string;
  name: string;
  credits: number;
  estimatedRhCost: number;
  hasApiCost: boolean;
  apiCost: number;
}

interface GlobalConfig {
  revenuePerCredit: number;
  costPerRhCoin: number;
  planPrice: number;
  planCredits: number;
}

const DEFAULT_CONFIG: GlobalConfig = {
  revenuePerCredit: 0.00925,
  costPerRhCoin: 0.002,
  planPrice: 99.90,
  planCredits: 10800,
};

const STORAGE_KEY_CONFIG = "ai_tools_profit_config";
const STORAGE_KEY_CUSTOM_TOOLS = "ai_tools_profit_custom_tools";

const AIToolsProfitTable = () => {
  const [toolsData, setToolsData] = useState<ToolCostData[]>([]);
  const [customTools, setCustomTools] = useState<CustomTool[]>([]);
  const [config, setConfig] = useState<GlobalConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  
  // Hook for dynamic settings from DB
  const { settingsMap, getCreditCost, getApiCost, updateToolSettings, isLoading: settingsLoading } = useAIToolSettings();
  
  // Modals
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAddToolModal, setShowAddToolModal] = useState(false);
  const [showEditToolModal, setShowEditToolModal] = useState(false);
  
  // Form states
  const [editConfig, setEditConfig] = useState<GlobalConfig>(DEFAULT_CONFIG);
  const [newTool, setNewTool] = useState<Omit<CustomTool, "id">>({
    name: "",
    credits: 60,
    estimatedRhCost: 30,
    hasApiCost: false,
    apiCost: 0,
  });

  // Edit tool state
  const [editingToolName, setEditingToolName] = useState("");
  const [editCredits, setEditCredits] = useState(60);
  const [editHasApiCost, setEditHasApiCost] = useState(false);
  const [editApiCost, setEditApiCost] = useState(0);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
    const savedTools = localStorage.getItem(STORAGE_KEY_CUSTOM_TOOLS);
    
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
        setEditConfig(parsed);
      } catch (e) {
        console.error("Error parsing saved config:", e);
      }
    }
    
    if (savedTools) {
      try {
        setCustomTools(JSON.parse(savedTools));
      } catch (e) {
        console.error("Error parsing saved custom tools:", e);
      }
    }
  }, []);

  // Fetch data from RPC
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_ai_tools_cost_averages');
      
      if (error) throw error;
      setToolsData(data || []);
    } catch (error) {
      console.error("Error fetching tools data:", error);
      toast.error("Erro ao carregar dados de custo");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save config
  const handleSaveConfig = () => {
    const calculatedRevenue = editConfig.planPrice / editConfig.planCredits;
    const newConfig = {
      ...editConfig,
      revenuePerCredit: calculatedRevenue,
    };
    
    setConfig(newConfig);
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(newConfig));
    setShowConfigModal(false);
    toast.success("Configurações salvas!");
  };

  // Add custom tool
  const handleAddTool = () => {
    if (!newTool.name.trim()) {
      toast.error("Nome da ferramenta é obrigatório");
      return;
    }
    
    const tool: CustomTool = {
      id: crypto.randomUUID(),
      ...newTool,
    };
    
    const updated = [...customTools, tool];
    setCustomTools(updated);
    localStorage.setItem(STORAGE_KEY_CUSTOM_TOOLS, JSON.stringify(updated));
    
    setNewTool({
      name: "",
      credits: 60,
      estimatedRhCost: 30,
      hasApiCost: false,
      apiCost: 0,
    });
    setShowAddToolModal(false);
    toast.success(`Ferramenta "${tool.name}" adicionada!`);
  };

  // Remove custom tool
  const handleRemoveTool = (id: string) => {
    const updated = customTools.filter(t => t.id !== id);
    setCustomTools(updated);
    localStorage.setItem(STORAGE_KEY_CUSTOM_TOOLS, JSON.stringify(updated));
    toast.success("Ferramenta removida");
  };

  // Open edit modal for a DB tool
  const handleOpenEditTool = (toolName: string) => {
    const s = settingsMap[toolName];
    setEditingToolName(toolName);
    setEditCredits(s?.credit_cost ?? 60);
    setEditHasApiCost(s?.has_api_cost ?? false);
    setEditApiCost(s?.api_cost ?? 0);
    setShowEditToolModal(true);
  };

  // Save edited tool settings to DB
  const handleSaveEditTool = async () => {
    setIsSavingEdit(true);
    const success = await updateToolSettings(editingToolName, {
      credit_cost: editCredits,
      has_api_cost: editHasApiCost,
      api_cost: editHasApiCost ? editApiCost : 0,
    });
    setIsSavingEdit(false);
    if (success) {
      setShowEditToolModal(false);
    }
  };

  // Calculate profitability for a tool
  const calculateProfit = (credits: number, rhCost: number, apiCost: number = 0) => {
    const revenue = credits * config.revenuePerCredit;
    const rhCostBRL = rhCost * config.costPerRhCoin;
    const totalCost = rhCostBRL + apiCost;
    const profit = revenue - totalCost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    
    return { revenue, rhCostBRL, totalCost, profit, margin };
  };

  // Combined table data - uses DB settings instead of hardcoded constants
  const tableData = useMemo(() => {
    const fromDb = toolsData.map(tool => {
      const credits = getCreditCost(tool.tool_name, tool.avg_credit_cost);
      const { apiCost: toolApiCost } = getApiCost(tool.tool_name);
      const calc = calculateProfit(credits, tool.avg_rh_cost, toolApiCost);
      
      const totalRevenue = calc.revenue * tool.total_jobs;
      const totalCostAccum = calc.totalCost * tool.total_jobs;
      const totalProfitAccum = calc.profit * tool.total_jobs;
      
      return {
        name: tool.tool_name,
        credits,
        avgRhCost: tool.avg_rh_cost,
        totalJobs: tool.total_jobs,
        apiCost: toolApiCost,
        isCustom: false,
        totalRevenue,
        totalCostAccum,
        totalProfitAccum,
        ...calc,
      };
    });
    
    const fromCustom = customTools.map(tool => {
      const calc = calculateProfit(tool.credits, tool.estimatedRhCost, tool.hasApiCost ? tool.apiCost : 0);
      
      return {
        name: tool.name,
        credits: tool.credits,
        avgRhCost: tool.estimatedRhCost,
        totalJobs: 0,
        apiCost: tool.hasApiCost ? tool.apiCost : 0,
        isCustom: true,
        customId: tool.id,
        totalRevenue: 0,
        totalCostAccum: 0,
        totalProfitAccum: 0,
        ...calc,
      };
    });
    
    return [...fromDb, ...fromCustom];
  }, [toolsData, customTools, config, settingsMap]);

  // Totals
  const totals = useMemo(() => {
    return tableData.reduce((acc, row) => ({
      totalJobs: acc.totalJobs + row.totalJobs,
      totalRevenue: acc.totalRevenue + (row.revenue * row.totalJobs),
      totalCost: acc.totalCost + (row.totalCost * row.totalJobs),
      totalProfit: acc.totalProfit + (row.profit * row.totalJobs),
    }), { totalJobs: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0 });
  }, [tableData]);

  const formatBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Global Config Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Configurações de Cálculo
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                setEditConfig(config);
                setShowConfigModal(true);
              }}>
                <Settings className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Plano Base</p>
              <p className="font-semibold">{formatBRL(config.planPrice)} / {config.planCredits.toLocaleString()} créditos</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">💰 Receita/Crédito</p>
              <p className="font-semibold text-green-600">{formatBRL(config.revenuePerCredit)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">🪙 Custo/RH Coin</p>
              <p className="font-semibold text-orange-600">{formatBRL(config.costPerRhCoin)}</p>
            </div>
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <p className="text-xs text-green-600 mb-1">📊 Lucro Total Histórico</p>
              <p className="font-bold text-green-600">{formatBRL(totals.totalProfit)}</p>
              <p className="text-[10px] text-muted-foreground">{totals.totalJobs} jobs processados</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profitability Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Tabela de Rentabilidade
            </CardTitle>
            <Button size="sm" onClick={() => setShowAddToolModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Ferramenta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Operação</TableHead>
                  <TableHead className="whitespace-nowrap text-center">Jobs</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Créditos</TableHead>
                  <TableHead className="whitespace-nowrap text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 ml-auto">
                          Custo RH
                          <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Média de RH coins gastos por execução
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-right">Extra API</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Receita/Job</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Custo/Job</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Lucro/Job</TableHead>
                  <TableHead className="whitespace-nowrap text-right bg-green-500/5">Receita Total</TableHead>
                  <TableHead className="whitespace-nowrap text-right bg-orange-500/5">Custo Total</TableHead>
                  <TableHead className="whitespace-nowrap text-right bg-green-500/5">Lucro Total</TableHead>
                  <TableHead className="whitespace-nowrap text-center">Margem</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(isLoading || settingsLoading) ? (
                <TableRow>
                    <TableCell colSpan={13} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : tableData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                      Nenhum dado disponível
                    </TableCell>
                  </TableRow>
                ) : (
                  tableData.map((row, idx) => (
                    <TableRow key={row.name + idx}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {row.isCustom && <Sparkles className="h-4 w-4 text-amber-500" />}
                          {row.name}
                          {row.isCustom && (
                            <Badge variant="outline" className="text-[10px]">Estimado</Badge>
                          )}
                          {!row.isCustom && settingsMap[row.name] && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-primary"
                              onClick={() => handleOpenEditTool(row.name)}
                              title="Editar configuração"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {row.totalJobs > 0 ? row.totalJobs : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {row.credits}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {row.avgRhCost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {row.apiCost > 0 ? formatBRL(row.apiCost) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        {formatBRL(row.revenue)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-orange-600">
                        {formatBRL(row.totalCost)}
                      </TableCell>
                      <TableCell className={`text-right font-mono font-bold ${row.profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatBRL(row.profit)}
                      </TableCell>
                      {/* Accumulated Totals */}
                      <TableCell className="text-right font-mono text-green-600 bg-green-500/5">
                        {row.totalJobs > 0 ? formatBRL(row.totalRevenue) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-orange-600 bg-orange-500/5">
                        {row.totalJobs > 0 ? formatBRL(row.totalCostAccum) : "-"}
                      </TableCell>
                      <TableCell className={`text-right font-mono font-bold bg-green-500/5 ${row.totalProfitAccum > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {row.totalJobs > 0 ? formatBRL(row.totalProfitAccum) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant="outline" 
                          className={
                            row.margin >= 85 ? "bg-green-500/20 text-green-600 border-green-500/30" :
                            row.margin >= 70 ? "bg-yellow-500/20 text-yellow-600 border-yellow-500/30" :
                            "bg-red-500/20 text-red-600 border-red-500/30"
                          }
                        >
                          {formatPercent(row.margin)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {row.isCustom && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveTool((row as any).customId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary Footer */}
          {totals.totalJobs > 0 && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Jobs</p>
                  <p className="font-bold">{totals.totalJobs}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Receita Total</p>
                  <p className="font-bold text-green-600">{formatBRL(totals.totalRevenue)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Custo Total</p>
                  <p className="font-bold text-orange-600">{formatBRL(totals.totalCost)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Lucro Total</p>
                  <p className="font-bold text-green-600">{formatBRL(totals.totalProfit)}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Config Modal */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações de Cálculo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Preço do Plano (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={editConfig.planPrice}
                onChange={(e) => setEditConfig(prev => ({ ...prev, planPrice: parseFloat(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">
                Valor do seu plano mais caro de créditos
              </p>
            </div>
            <div className="space-y-2">
              <Label>Créditos do Plano</Label>
              <Input
                type="number"
                value={editConfig.planCredits}
                onChange={(e) => setEditConfig(prev => ({ ...prev, planCredits: parseInt(e.target.value) || 1 }))}
              />
              <p className="text-xs text-muted-foreground">
                Quantidade de créditos do plano acima
              </p>
            </div>
            <div className="space-y-2">
              <Label>Custo por RH Coin (R$)</Label>
              <Input
                type="number"
                step="0.001"
                value={editConfig.costPerRhCoin}
                onChange={(e) => setEditConfig(prev => ({ ...prev, costPerRhCoin: parseFloat(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">
                Custo em Reais de cada RH coin gasto no RunningHub
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Receita por crédito calculada: <strong className="text-foreground">
                  {formatBRL(editConfig.planPrice / editConfig.planCredits)}
                </strong>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveConfig}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Tool Modal */}
      <Dialog open={showAddToolModal} onOpenChange={setShowAddToolModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Nova Ferramenta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Ferramenta</Label>
              <Input
                placeholder="Ex: Arcano Cloner"
                value={newTool.name}
                onChange={(e) => setNewTool(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Custo em Créditos</Label>
              <Input
                type="number"
                value={newTool.credits}
                onChange={(e) => setNewTool(prev => ({ ...prev, credits: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Custo RH Estimado (coins)</Label>
              <Input
                type="number"
                step="0.01"
                value={newTool.estimatedRhCost}
                onChange={(e) => setNewTool(prev => ({ ...prev, estimatedRhCost: parseFloat(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">
                Estimativa de RH coins por execução
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasApiCost"
                checked={newTool.hasApiCost}
                onCheckedChange={(checked) => setNewTool(prev => ({ ...prev, hasApiCost: !!checked }))}
              />
              <Label htmlFor="hasApiCost" className="cursor-pointer">
                Tem taxa fixa de API externa
              </Label>
            </div>
            {newTool.hasApiCost && (
              <div className="space-y-2">
                <Label>Taxa de API (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newTool.apiCost}
                  onChange={(e) => setNewTool(prev => ({ ...prev, apiCost: parseFloat(e.target.value) || 0 }))}
                />
                <p className="text-xs text-muted-foreground">
                  Custo fixo por execução de API externa
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddToolModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddTool}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tool Settings Modal */}
      <Dialog open={showEditToolModal} onOpenChange={setShowEditToolModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar "{editingToolName}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Custo em Créditos</Label>
              <Input
                type="number"
                value={editCredits}
                onChange={(e) => setEditCredits(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Quantidade de créditos cobrados do usuário por execução
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="editHasApiCost"
                checked={editHasApiCost}
                onCheckedChange={(checked) => setEditHasApiCost(!!checked)}
              />
              <Label htmlFor="editHasApiCost" className="cursor-pointer">
                Tem custo extra de API
              </Label>
            </div>
            {editHasApiCost && (
              <div className="space-y-2">
                <Label>Valor Extra API (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editApiCost}
                  onChange={(e) => setEditApiCost(parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Custo fixo adicional por execução (ex: API do Replicate)
                </p>
              </div>
            )}
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-700">
                ⚠️ Alterações valem apenas para novos jobs. Jobs anteriores não serão recalculados.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditToolModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEditTool} disabled={isSavingEdit}>
              {isSavingEdit ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Pencil className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIToolsProfitTable;
