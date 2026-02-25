import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminSidebarPlatform from "@/components/AdminSidebarPlatform";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Key, Image, Video, DollarSign, Eye, EyeOff, Save, RefreshCw } from "lucide-react";

const IMAGE_COST_NORMAL = 0.20;
const IMAGE_COST_PRO = 0.69;
const VIDEO_COST_PER_SECOND = 0.78;

const PromptsApiGoogle = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newApiKey, setNewApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("admin_authenticated");
    navigate("/admin-login");
  };

  // Fetch budget config
  const { data: budgetConfig } = useQuery({
    queryKey: ["google-api-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_api_config")
        .select("*")
        .eq("id", "default")
        .single();
      if (error) throw error;
      return data;
    },
  });

  const keyChangedAt = budgetConfig?.key_changed_at as string | undefined;

  // Fetch image jobs stats (only after key_changed_at) - counts ALL statuses since API is charged regardless
  const { data: imageStats } = useQuery({
    queryKey: ["google-image-stats", keyChangedAt],
    enabled: !!budgetConfig,
    queryFn: async () => {
      let allJobs: { model: string; status: string }[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        let query = supabase
          .from("image_generator_jobs")
          .select("model, status")
          .in("status", ["completed", "failed", "processing"]);
        if (keyChangedAt) query = query.gte("created_at", keyChangedAt);
        const { data, error } = await query.range(from, from + batchSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allJobs = [...allJobs, ...data];
        if (data.length < batchSize) break;
        from += batchSize;
      }

      const normalCount = allJobs.filter((j) => j.model === "normal").length;
      const proCount = allJobs.filter((j) => j.model === "pro").length;
      const completedCount = allJobs.filter((j) => j.status === "completed").length;
      const failedCount = allJobs.filter((j) => j.status === "failed").length;
      const processingCount = allJobs.filter((j) => j.status === "processing").length;
      return {
        normalCount,
        proCount,
        normalCost: normalCount * IMAGE_COST_NORMAL,
        proCost: proCount * IMAGE_COST_PRO,
        totalJobs: allJobs.length,
        completedCount,
        failedCount,
        processingCount,
      };
    },
  });

  // Fetch video jobs stats (only after key_changed_at) - counts ALL statuses since API is charged regardless
  const { data: videoStats } = useQuery({
    queryKey: ["google-video-stats", keyChangedAt],
    enabled: !!budgetConfig,
    queryFn: async () => {
      let allJobs: { duration_seconds: number | null; status: string }[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        let query = supabase
          .from("video_generator_jobs")
          .select("duration_seconds, status")
          .in("status", ["completed", "failed", "processing"]);
        if (keyChangedAt) query = query.gte("created_at", keyChangedAt);
        const { data, error } = await query.range(from, from + batchSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allJobs = [...allJobs, ...data];
        if (data.length < batchSize) break;
        from += batchSize;
      }

      const totalSeconds = allJobs.reduce((sum, j) => sum + (j.duration_seconds || 0), 0);
      const completedCount = allJobs.filter((j) => j.status === "completed").length;
      const failedCount = allJobs.filter((j) => j.status === "failed").length;
      const processingCount = allJobs.filter((j) => j.status === "processing").length;
      return {
        videoCount: allJobs.length,
        totalSeconds,
        videoCost: totalSeconds * VIDEO_COST_PER_SECOND,
        completedCount,
        failedCount,
        processingCount,
      };
    },
  });

  // Update API key mutation
  const updateKeyMutation = useMutation({
    mutationFn: async (apiKey: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await supabase.functions.invoke("admin-update-google-key", {
        body: { api_key: apiKey },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Chave API atualizada com sucesso! Budget resetado para R$ 1.900,00");
      setNewApiKey("");
      queryClient.invalidateQueries({ queryKey: ["google-api-config"] });
      queryClient.invalidateQueries({ queryKey: ["google-image-stats"] });
      queryClient.invalidateQueries({ queryKey: ["google-video-stats"] });
    },
    onError: (err: Error) => {
      toast.error(`Erro ao atualizar chave: ${err.message}`);
    },
  });

  const totalBudget = budgetConfig?.total_budget || 1900;
  const imageCostTotal = (imageStats?.normalCost || 0) + (imageStats?.proCost || 0);
  const videoCostTotal = videoStats?.videoCost || 0;
  const totalSpent = imageCostTotal + videoCostTotal;
  const percentage = Math.min((totalSpent / totalBudget) * 100, 100);
  const remaining = Math.max(totalBudget - totalSpent, 0);

  const getProgressColor = () => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebarPlatform platform="prompts" onLogout={handleLogout} />

      <main className="flex-1 p-6 space-y-6 overflow-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Key className="h-6 w-6 text-primary" />
            API Google - Gerenciamento
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie sua chave API e monitore o consumo de créditos Google
          </p>
        </div>

        {/* Budget Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Consumo de Créditos Google
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Gasto: <span className="font-bold text-foreground">R$ {totalSpent.toFixed(2)}</span>
              </span>
              <span className="text-muted-foreground">
                Budget: <span className="font-bold text-foreground">R$ {totalBudget.toFixed(2)}</span>
              </span>
            </div>
            <div className="relative">
              <Progress value={percentage} className="h-6" />
              <div
                className={`absolute inset-0 h-6 rounded-full ${getProgressColor()} transition-all`}
                style={{ width: `${percentage}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
                {percentage.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Restante: <span className="font-semibold text-emerald-500">R$ {remaining.toFixed(2)}</span>
              </span>
              <span className="text-muted-foreground">
                {percentage.toFixed(1)}% utilizado
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Usage Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Image className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nano Banana (Normal)</p>
                  <p className="text-2xl font-bold">{imageStats?.normalCount || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    R$ {(imageStats?.normalCost || 0).toFixed(2)} • R$ 0,20/img
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Inclui todos os status (API cobra independente)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <Image className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nano Banana Pro</p>
                  <p className="text-2xl font-bold">{imageStats?.proCount || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    R$ {(imageStats?.proCost || 0).toFixed(2)} • R$ 0,69/img
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    ✅ {imageStats?.completedCount || 0} • ❌ {imageStats?.failedCount || 0} • ⏳ {imageStats?.processingCount || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-amber-500/10">
                  <Video className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Veo 3.1 Fast</p>
                  <p className="text-2xl font-bold">{videoStats?.videoCount || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    R$ {(videoStats?.videoCost || 0).toFixed(2)} • {videoStats?.totalSeconds || 0}s total • R$ 0,78/s
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    ✅ {videoStats?.completedCount || 0} • ❌ {videoStats?.failedCount || 0} • ⏳ {videoStats?.processingCount || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Total Cost Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Custo Imagens (Normal)</p>
                <p className="text-lg font-bold text-blue-500">R$ {(imageStats?.normalCost || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Custo Imagens (Pro)</p>
                <p className="text-lg font-bold text-purple-500">R$ {(imageStats?.proCost || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Custo Vídeos</p>
                <p className="text-lg font-bold text-amber-500">R$ {(videoStats?.videoCost || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Custo Total</p>
                <p className="text-xl font-bold text-foreground">R$ {totalSpent.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Key Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Trocar Chave API Google Gemini
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Insira a nova chave API do Google Gemini. Ela será usada nas ferramentas Gerar Imagem e Gerar Vídeo.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="AIzaSy..."
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                onClick={() => updateKeyMutation.mutate(newApiKey)}
                disabled={!newApiKey.trim() || newApiKey.trim().length < 10 || updateKeyMutation.isPending}
              >
                {updateKeyMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PromptsApiGoogle;
