import { useNavigate } from "react-router-dom";
import { ArrowLeft, Image, Video, Sparkles, Zap } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

const UpscalerSelectionPage = () => {
  const navigate = useNavigate();

  const handleSelectImage = () => {
    navigate("/upscaler-arcano-tool");
  };

  const handleSelectVideo = () => {
    navigate("/video-upscaler-tool");
  };

  return (
    <AppLayout>

      <main className="container mx-auto px-4 py-4 sm:py-8 md:py-16">
        {/* Hero Section */}
        <div className="text-center mb-6 sm:mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 mb-3 sm:mb-6 shadow-lg shadow-purple-500/30">
            <Sparkles className="w-6 h-6 sm:w-10 sm:h-10 text-white" />
          </div>
          <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-4">
            Upscaler Arcano V3
          </h1>
          <p className="hidden sm:block text-purple-300 text-lg max-w-xl mx-auto">
            Escolha o tipo de mídia que deseja melhorar com nossa tecnologia de IA avançada
          </p>
        </div>

        {/* Selection Cards */}
        <div className="grid md:grid-cols-2 gap-3 sm:gap-6 max-w-4xl mx-auto">
          {/* Image Upscaler Card */}
          <button
            onClick={handleSelectImage}
            className="group relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-[#1A0A2E] to-[#0D0221] p-4 sm:p-8 text-left transition-all duration-300 hover:border-purple-400/60 hover:shadow-xl hover:shadow-purple-500/20 hover:scale-[1.02]"
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Icon */}
            <div className="relative mb-3 sm:mb-6">
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-shadow">
                <Image className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="relative">
              <h2 className="text-lg sm:text-2xl font-bold text-white mb-1.5 sm:mb-3 group-hover:text-purple-200 transition-colors">
                Upscaler de Imagem
              </h2>
              <p className="text-purple-300/80 mb-3 sm:mb-6 leading-relaxed text-sm sm:text-base">
                <span className="hidden sm:inline">
                  Aumente a resolução de suas imagens até 4x mantendo a qualidade e nitidez. 
                  Ideal para fotos, artes digitais e ilustrações.
                </span>
                <span className="sm:hidden">
                  Aumente até 4x a resolução das suas imagens
                </span>
              </p>

              {/* Features */}
              <div className="flex flex-wrap gap-2 mb-3 sm:mb-6">
                <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-purple-500/20 text-purple-200 text-xs sm:text-sm">
                  <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  Até 4x resolução
                </span>
                <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-purple-500/20 text-purple-200 text-xs sm:text-sm">
                  60-80 créditos
                </span>
              </div>

              {/* CTA */}
              <div className="flex items-center gap-2 text-purple-400 group-hover:text-purple-300 font-medium transition-colors text-sm sm:text-base">
                <span>Selecionar</span>
                <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Decorative corner */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full" />
          </button>

          {/* Video Upscaler Card */}
          <button
            onClick={handleSelectVideo}
            className="group relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-[#1A0A2E] to-[#0D0221] p-4 sm:p-8 text-left transition-all duration-300 hover:border-fuchsia-400/60 hover:shadow-xl hover:shadow-fuchsia-500/20 hover:scale-[1.02]"
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Icon */}
            <div className="relative mb-3 sm:mb-6">
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 shadow-lg shadow-fuchsia-500/20 group-hover:shadow-fuchsia-500/40 transition-shadow">
                <Video className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="relative">
              <h2 className="text-lg sm:text-2xl font-bold text-white mb-1.5 sm:mb-3 group-hover:text-fuchsia-200 transition-colors">
                Upscaler de Vídeo
              </h2>
              <p className="text-purple-300/80 mb-3 sm:mb-6 leading-relaxed text-sm sm:text-base">
                <span className="hidden sm:inline">
                  Melhore a qualidade de vídeos curtos com IA. 
                  Perfeito para clips, reels e vídeos de até 10 segundos.
                </span>
                <span className="sm:hidden">
                  Melhore a qualidade de vídeos curtos
                </span>
              </p>

              {/* Features */}
              <div className="flex flex-wrap gap-2 mb-3 sm:mb-6">
                <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-fuchsia-500/20 text-fuchsia-200 text-xs sm:text-sm">
                  <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  Max 10 segundos
                </span>
                <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-fuchsia-500/20 text-fuchsia-200 text-xs sm:text-sm">
                  100 créditos
                </span>
              </div>

              {/* CTA */}
              <div className="flex items-center gap-2 text-fuchsia-400 group-hover:text-fuchsia-300 font-medium transition-colors text-sm sm:text-base">
                <span>Selecionar</span>
                <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Decorative corner */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-fuchsia-500/10 to-transparent rounded-bl-full" />
          </button>
        </div>

        {/* Bottom info */}
        <p className="hidden sm:block text-center text-purple-400/60 text-sm mt-12 max-w-md mx-auto">
          Ambos os upscalers utilizam tecnologia de IA avançada para melhorar seus arquivos sem perda de qualidade
        </p>
      </main>
    </AppLayout>
  );
};

export default UpscalerSelectionPage;
