import { 
  Sparkles, 
  Image, 
  CalendarDays, 
  Layers, 
  Users, 
  GraduationCap, 
  RefreshCw, 
  Headphones 
} from "lucide-react";

const bonuses = [
  {
    icon: Sparkles,
    number: "BÔNUS 1",
    title: "Pack Prompts de IA",
    description: "Prompts exclusivos para gerar artes incríveis com inteligência artificial",
    color: "#EF672C",
  },
  {
    icon: Image,
    number: "BÔNUS 2",
    title: "Pack Capas de Palco",
    description: "Capas de palco profissionais prontas para editar",
    color: "#f65928",
  },
  {
    icon: CalendarDays,
    number: "BÔNUS 3",
    title: "Pack Agendas de Shows",
    description: "Templates de agendas para divulgar shows e eventos",
    color: "#EF672C",
  },
  {
    icon: Layers,
    number: "BÔNUS 4",
    title: "Pack Mockups",
    description: "Mockups profissionais para apresentar suas artes",
    color: "#f65928",
  },
  {
    icon: Users,
    number: "BÔNUS 5",
    title: "Comunidade VIP",
    description: "Acesso à comunidade exclusiva com +1700 membros ativos",
    color: "#EF672C",
  },
  {
    icon: GraduationCap,
    number: "BÔNUS 6",
    title: "Video Aulas Exclusivas",
    description: "Aulas em vídeo ensinando a editar todas as artes",
    color: "#f65928",
  },
  {
    icon: RefreshCw,
    number: "BÔNUS 7",
    title: "Atualizações Semanais",
    description: "Novas artes adicionadas toda semana automaticamente",
    color: "#EF672C",
  },
  {
    icon: Headphones,
    number: "BÔNUS 8",
    title: "Suporte VIP",
    description: "Suporte técnico exclusivo via WhatsApp",
    color: "#f65928",
  },
];

export const BonusGridSection = () => {
  return (
    <section className="py-16 px-4 bg-black">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-5xl font-bold text-white mb-4">
            E não é só isso...
          </h2>
          <p className="text-base md:text-lg text-zinc-400">
            Você também vai receber{" "}
            <span className="text-[#EF672C] font-bold">8 BÔNUS GRÁTIS</span>{" "}
            para turbinar suas artes!
          </p>
        </div>
        
        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {bonuses.map((bonus, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6 hover:border-[#EF672C]/50 transition-all duration-300 hover:transform hover:scale-105"
            >
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto"
                style={{ backgroundColor: `${bonus.color}20` }}
              >
                <bonus.icon className="w-8 h-8" style={{ color: bonus.color }} />
              </div>
              
              <span 
                className="text-xs font-bold px-3 py-1 rounded-full block w-fit mx-auto mb-3"
                style={{ backgroundColor: bonus.color, color: "white" }}
              >
                {bonus.number}
              </span>
              
              <h3 className="text-white font-bold text-lg text-center mb-2">
                {bonus.title}
              </h3>
              
              <p className="text-gray-400 text-sm text-center">
                {bonus.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
