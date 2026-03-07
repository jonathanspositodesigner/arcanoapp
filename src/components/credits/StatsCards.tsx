import { useEffect, useState } from "react";
import { Image, Video, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";

export const StatsCards = () => {
  const [totalImages, setTotalImages] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase.rpc('get_ai_tools_cost_averages');
      if (data) {
        const total = data.reduce((acc: number, tool: any) => acc + (tool.total_completed || 0), 0);
        setTotalImages(total);
      }
      setLoaded(true);
    };
    fetchStats();
  }, []);

  const animatedImages = useAnimatedNumber(totalImages, 1500);
  const animatedVideos = useAnimatedNumber(loaded ? 247 : 0, 1500);
  const animatedSatisfaction = useAnimatedNumber(loaded ? 100 : 0, 1500);

  const stats = [
    {
      icon: Image,
      value: `+${animatedImages.displayValue.toLocaleString('pt-BR')}`,
      label: "Imagens geradas",
      color: "from-purple-500 to-fuchsia-500",
      iconColor: "text-purple-400",
    },
    {
      icon: Video,
      value: `+${animatedVideos.displayValue.toLocaleString('pt-BR')}`,
      label: "Vídeos gerados",
      color: "from-fuchsia-500 to-pink-500",
      iconColor: "text-fuchsia-400",
    },
    {
      icon: ThumbsUp,
      value: `${animatedSatisfaction.displayValue}%`,
      label: "Satisfação",
      color: "from-green-500 to-emerald-500",
      iconColor: "text-green-400",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto mb-8">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="relative rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-4 sm:p-6 flex flex-col items-center text-center transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]"
          >
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-xl sm:text-3xl font-bold text-white tracking-tight">
              {stat.value}
            </span>
            <span className="text-xs sm:text-sm text-purple-300 mt-1">
              {stat.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};
