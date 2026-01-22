import { Check, Palette, Video, Clock, Edit3, Download, Shield } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const benefits = [
  {
    icon: Palette,
    title: "+60 Artes Exclusivas",
    description: "Designs profissionais prontos para personalizar e vender"
  },
  {
    icon: Edit3,
    title: "100% Editável",
    description: "Compatível com Canva gratuito e Photoshop"
  },
  {
    icon: Video,
    title: "Vídeo Aulas",
    description: "Tutoriais explicativos para você aprender a editar"
  },
  {
    icon: Download,
    title: "Download Imediato",
    description: "Acesso liberado assim que o pagamento for confirmado"
  },
  {
    icon: Clock,
    title: "Atualizações Semanais",
    description: "Novos designs adicionados toda semana (Plano Completo)"
  },
  {
    icon: Shield,
    title: "7 Dias de Garantia",
    description: "Satisfação garantida ou seu dinheiro de volta"
  }
];

export const BenefitsSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <section className="py-20 bg-zinc-950">
      <div className="container mx-auto px-4">
        <div 
          ref={ref}
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Por que escolher nosso{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Pack de Agendas?
            </span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Tudo o que você precisa para criar agendas incríveis e lucrar com personalizações
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={index}
                ref={ref}
                className={`group p-6 bg-gradient-to-br from-zinc-900 to-zinc-900/50 rounded-2xl border border-zinc-800 hover:border-purple-500/50 transition-all duration-500 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{benefit.title}</h3>
                <p className="text-zinc-400">{benefit.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
