import { useNavigate } from "react-router-dom";
import logoHorizontal from "@/assets/logo_horizontal.png";
import { CheckCircle, Camera, BookImage, Sparkles, MessageCircle, Clock } from "lucide-react";

const ObrigadoArcanoCloner = () => {
  const navigate = useNavigate();

  const benefits = [
    {
      icon: <Camera className="w-6 h-6 text-fuchsia-400" />,
      title: "~70 Fotos Geradas",
      description: "Ensaios fotográficos profissionais criados com IA em minutos",
    },
    {
      icon: <BookImage className="w-6 h-6 text-fuchsia-400" />,
      title: "Biblioteca +300 Referências",
      description: "Acesso à biblioteca completa de estilos e referências fotográficas",
    },
    {
      icon: <Sparkles className="w-6 h-6 text-fuchsia-400" />,
      title: "Upscaler Arcano (Bônus)",
      description: "Ferramenta para aumentar a resolução das suas fotos com IA",
    },
    {
      icon: <MessageCircle className="w-6 h-6 text-fuchsia-400" />,
      title: "Suporte via WhatsApp",
      description: "Equipe dedicada para te ajudar a extrair o máximo da ferramenta",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a15] via-[#1a0f25] to-[#0a0510] font-space-grotesk relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-fuchsia-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-purple-700/8 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center px-4 py-12 max-w-3xl mx-auto">
        {/* Logo */}
        <div className="mb-10">
          <img
            src={logoHorizontal}
            alt="Arcano App"
            className="h-10 object-contain"
          />
        </div>

        {/* Main card */}
        <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 flex flex-col items-center text-center mb-8">
          {/* Animated check icon */}
          <div className="mb-6 relative">
            <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
            <CheckCircle className="w-20 h-20 text-green-400 relative z-10 drop-shadow-[0_0_20px_rgba(74,222,128,0.6)]" />
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Obrigado pela sua compra! 🎉
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl font-semibold bg-gradient-to-r from-fuchsia-400 to-purple-500 bg-clip-text text-transparent mb-6">
            Seja bem-vindo ao Arcano Cloner
          </p>

          {/* Description */}
          <p className="text-white/70 text-base md:text-lg leading-relaxed max-w-xl mb-8">
            Se o pagamento já foi processado, clique no botão abaixo para acessar sua compra e começar a criar ensaios fotográficos profissionais agora mesmo.
          </p>

          {/* CTA Button */}
          <button
            onClick={() => navigate("/ferramentas-ia-aplicativo")}
            className="w-full max-w-sm py-4 px-8 rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 transition-all duration-300 shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:shadow-[0_0_40px_rgba(34,197,94,0.6)] hover:scale-[1.02] active:scale-[0.98] mb-4"
          >
            Acessar minha compra
          </button>

          {/* Small note */}
          <div className="flex items-center gap-2 text-white/40 text-sm">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>Pode levar alguns minutos para o acesso ser liberado após o pagamento.</span>
          </div>
        </div>

        {/* Benefits section */}
        <div className="w-full">
          <p className="text-white/50 text-sm text-center uppercase tracking-widest mb-5 font-medium">
            O que você recebeu
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4 hover:bg-white/8 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-fuchsia-500/15 rounded-xl flex items-center justify-center">
                  {benefit.icon}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm mb-1">{benefit.title}</p>
                  <p className="text-white/50 text-xs leading-relaxed">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-10 text-white/30 text-xs text-center">
          Dúvidas? Entre em contato com nosso suporte via WhatsApp.
        </p>
      </div>
    </div>
  );
};

export default ObrigadoArcanoCloner;
