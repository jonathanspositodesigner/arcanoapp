import { Zap, Shield, MessageCircle, Headphones, Users } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Acesso Imediato",
    description: "Liberação instantânea após a compra",
  },
  {
    icon: Shield,
    title: "7 Dias de Garantia",
    description: "Satisfação garantida ou seu dinheiro de volta",
  },
  {
    icon: MessageCircle,
    title: "Grupo VIP no WhatsApp",
    description: "Comunidade exclusiva de membros",
  },
  {
    icon: Headphones,
    title: "Suporte Técnico Exclusivo",
    description: "Atendimento prioritário para dúvidas",
  },
  {
    icon: Users,
    title: "Plataforma de Membros",
    description: "Área exclusiva com todo o conteúdo",
  },
];

export const FeaturesSection = () => {
  return (
    <section className="bg-black py-8 md:py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-xl p-4 md:p-5 border border-zinc-800 hover:border-[#EF672C]/50 transition-all duration-300"
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#EF672C]/20 flex items-center justify-center group-hover:bg-[#EF672C]/30 transition-colors">
                    <Icon className="w-6 h-6 md:w-7 md:h-7 text-[#EF672C]" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm md:text-base leading-tight">
                      {feature.title}
                    </h3>
                    <p className="text-zinc-400 text-xs md:text-sm mt-1 leading-tight">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
