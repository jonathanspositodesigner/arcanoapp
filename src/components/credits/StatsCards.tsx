import { useEffect, useState } from "react";
import { Image, Video, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";

const socialProofImages = [
  "/images/social-proof-1.webp",
  "/images/social-proof-2.webp",
  "/images/social-proof-3.webp",
];

export const StatsCards = () => {
  const [totalImages, setTotalImages] = useState(0);
  const [totalVideos, setTotalVideos] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      // Fetch image stats
      const { data } = await supabase.rpc('get_ai_tools_cost_averages');
      if (data) {
        const total = data.reduce((acc: number, tool: any) => acc + (tool.total_completed || 0), 0);
        setTotalImages(total);
      }

      // Fetch real video count from ALL video tables
      const [videoGen, movieled, seedance, videoUpscaler] = await Promise.all([
        supabase.from('video_generator_jobs').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('movieled_maker_jobs').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('seedance_jobs').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('video_upscaler_jobs').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      ]);
      setTotalVideos((videoGen.count || 0) + (movieled.count || 0) + (seedance.count || 0) + (videoUpscaler.count || 0));

      // Fetch real user count
      const { count: userCount } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      setTotalUsers(userCount || 0);

      setLoaded(true);
    };
    fetchStats();
  }, []);

  const animatedImages = useAnimatedNumber(totalImages, 1500);
  const animatedVideos = useAnimatedNumber(totalVideos, 1500);
  const animatedUsers = useAnimatedNumber(totalUsers, 1500);
  const animatedSatisfaction = useAnimatedNumber(loaded ? 100 : 0, 1500);

  return (
    <div className="max-w-5xl mx-auto mb-8 px-2">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center gap-4 sm:gap-0">
        {/* Left: Avatars + Text */}
        <div className="flex items-center gap-3 sm:flex-1 min-w-0">
          <div className="flex -space-x-2 shrink-0">
            {socialProofImages.map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                width="32"
                height="32"
                decoding="async"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-[#0d0b1a] object-cover"
              />
            ))}
          </div>
          <span className="text-white/80 text-xs sm:text-sm font-medium leading-tight">
            Junte-se a mais de {animatedUsers.displayValue.toLocaleString('pt-BR')} criadores em todo o mundo.
          </span>
        </div>

        {/* Right: Stats */}
        <div className="flex items-center gap-6 sm:gap-8 shrink-0">
          {/* Images */}
          <div className="flex flex-col items-center gap-0.5">
            <Image className="w-5 h-5 text-purple-400 mb-1" />
            <div className="flex items-center gap-1">
              <span className="text-white font-bold text-base sm:text-lg">
                {animatedImages.displayValue.toLocaleString('pt-BR')}
              </span>
              <span className="text-purple-400 text-lg font-bold">+</span>
            </div>
            <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider font-medium">
              Imagens Geradas
            </span>
          </div>

          {/* Videos */}
          <div className="flex flex-col items-center gap-0.5">
            <Video className="w-5 h-5 text-purple-400 mb-1" />
            <div className="flex items-center gap-1">
              <span className="text-white font-bold text-base sm:text-lg">
                {animatedVideos.displayValue.toLocaleString('pt-BR')}
              </span>
              <span className="text-purple-400 text-lg font-bold">+</span>
            </div>
            <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider font-medium">
              Vídeos Gerados
            </span>
          </div>

          {/* Satisfaction */}
          <div className="flex flex-col items-center gap-0.5">
            <Award className="w-5 h-5 text-yellow-500 mb-1" />
            <div className="flex items-center gap-0.5">
              <span className="text-white font-bold text-base sm:text-lg">
                {animatedSatisfaction.displayValue}
              </span>
              <span className="text-yellow-500 text-lg font-bold">%</span>
            </div>
            <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider font-medium">
              Satisfação
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
