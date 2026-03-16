import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { AnimatedSection } from "@/hooks/useScrollAnimation";

const feedbacks = [
  {
    name: "Lucas Mendes",
    photo: "https://randomuser.me/api/portraits/men/32.jpg",
    text: "Usei pra fazer umas fotos pro meu perfil e ficou muito bom. Não esperava esse nível de qualidade sinceramente.",
  },
  {
    name: "Camila Souza",
    photo: "https://randomuser.me/api/portraits/women/44.jpg",
    text: "Consegui criar as artes que eu precisava pro meu Instagram em minutos. Valeu muito a pena.",
  },
  {
    name: "Rafael Costa",
    photo: "https://randomuser.me/api/portraits/men/75.jpg",
    text: "Testei achando que não ia funcionar direito e me surpreendi. O resultado fica bem natural.",
  },
  {
    name: "Juliana Almeida",
    photo: "https://randomuser.me/api/portraits/women/68.jpg",
    text: "Uso pra gerar fotos pros meus clientes e eles adoram. Economizei muito com ensaio fotográfico.",
  },
  {
    name: "Pedro Oliveira",
    photo: "https://randomuser.me/api/portraits/men/22.jpg",
    text: "Ferramenta simples de usar e o resultado sai rápido. Recomendo pra quem trabalha com social media.",
  },
  {
    name: "Mariana Santos",
    photo: "https://randomuser.me/api/portraits/women/31.jpg",
    text: "Fiz umas fotos de teste e minha amiga achou que eu tinha feito ensaio de verdade kk. Muito bom.",
  },
  {
    name: "Thiago Ferreira",
    photo: "https://randomuser.me/api/portraits/men/45.jpg",
    text: "Já testei outras ferramentas parecidas mas essa aqui entrega um resultado bem mais realista.",
  },
  {
    name: "Beatriz Lima",
    photo: "https://randomuser.me/api/portraits/women/52.jpg",
    text: "Uso quase todo dia pro meu trabalho. É prático e rápido, não tenho do que reclamar.",
  },
];

const FeedbackCarousel = () => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setOffset((prev) => (prev + 1) % feedbacks.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Show 4 cards at a time, cycling through
  const getVisibleCards = () => {
    const visible = [];
    for (let i = 0; i < 4; i++) {
      visible.push(feedbacks[(offset + i) % feedbacks.length]);
    }
    return visible;
  };

  const visibleCards = getVisibleCards();

  return (
    <AnimatedSection className="px-4 py-16 md:py-20">
      <div className="max-w-5xl mx-auto">
        <AnimatedSection as="div" delay={100}>
          <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white text-center mb-4">
            O que nossos{" "}
            <span className="text-fuchsia-400">usuários</span> dizem
          </h2>
          <p className="text-white/60 text-center mb-12 max-w-xl mx-auto">
            Feedbacks reais de quem já usa a ferramenta no dia a dia
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleCards.map((fb, index) => (
            <div
              key={`${fb.name}-${offset}-${index}`}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4 animate-fade-in"
            >
              <div className="flex items-center gap-3">
                <img
                  src={fb.photo}
                  alt={fb.name}
                  className="w-10 h-10 rounded-full object-cover"
                  loading="lazy"
                />
                <div>
                  <p className="text-white font-semibold text-sm">{fb.name}</p>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-fuchsia-400 text-fuchsia-400" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-white/70 text-sm leading-relaxed">"{fb.text}"</p>
            </div>
          ))}
        </div>

        {/* Dots indicator */}
        <div className="flex justify-center gap-1.5 mt-8">
          {Array.from({ length: feedbacks.length }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i >= offset && i < offset + 4
                  ? "bg-fuchsia-400 scale-110"
                  : "bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
};

export default FeedbackCarousel;
