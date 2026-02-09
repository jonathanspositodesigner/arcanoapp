import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ToolSetting {
  tool_name: string;
  credit_cost: number;
  has_api_cost: boolean;
  api_cost: number;
  updated_at: string;
}

export const useAIToolSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["ai-tool-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_tool_settings" as any)
        .select("*");

      if (error) {
        console.error("[useAIToolSettings] Error fetching settings:", error);
        return [] as ToolSetting[];
      }

      return (data || []) as unknown as ToolSetting[];
    },
    staleTime: 30_000, // 30s cache
  });

  const settingsMap = (settings || []).reduce<Record<string, ToolSetting>>(
    (acc, s) => {
      acc[s.tool_name] = s;
      return acc;
    },
    {}
  );

  const getCreditCost = (toolName: string, fallback: number = 60): number => {
    return settingsMap[toolName]?.credit_cost ?? fallback;
  };

  const getApiCost = (toolName: string) => {
    const s = settingsMap[toolName];
    return {
      hasApiCost: s?.has_api_cost ?? false,
      apiCost: s?.api_cost ?? 0,
    };
  };

  const updateToolSettings = async (
    toolName: string,
    data: { credit_cost: number; has_api_cost: boolean; api_cost: number }
  ) => {
    const { error } = await supabase
      .from("ai_tool_settings" as any)
      .update(data)
      .eq("tool_name", toolName);

    if (error) {
      console.error("[useAIToolSettings] Update error:", error);
      toast.error("Erro ao salvar configuração");
      return false;
    }

    await queryClient.invalidateQueries({ queryKey: ["ai-tool-settings"] });
    toast.success(`Configuração de "${toolName}" atualizada!`);
    return true;
  };

  return {
    settings: settings || [],
    settingsMap,
    isLoading,
    getCreditCost,
    getApiCost,
    updateToolSettings,
  };
};
