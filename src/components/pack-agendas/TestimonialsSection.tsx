import { Star, Quote } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const testimonials = [
  {
    name: "Maria Silva",
    role: "Designer Freelancer",
    content: "As artes são lindas e super fáceis de editar no Canva. Já vendi várias agendas personalizadas para minhas clientes!",
    rating: 5
  },
  {
    name: "Carlos Santos",
    role: "Empreendedor Digital",
    content: "Investimento que valeu muito a pena. A qualidade do material é incrível e os bônus são um diferencial enorme.",
    rating: 5
  },
  {
    name: "Ana Costa",
    role: "Social Media",
    content: "Comprei o pacote completo e não me arrependo. As atualizações semanais são ótimas e o suporte é excelente!",
    rating: 5
  }
];

export const TestimonialsSection = () => {
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
            O que nossos{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              clientes dizem
            </span>
          </h2>
          <p className="text-zinc-400 text-lg">
            Veja o que quem já comprou está falando
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className={`relative p-6 bg-gradient-to-br from-zinc-900 to-zinc-900/50 rounded-2xl border border-zinc-800 transition-all duration-500 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              {/* Quote icon */}
              <div className="absolute top-4 right-4 text-purple-500/20">
                <Quote className="w-10 h-10" />
              </div>
              
              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              
              {/* Content */}
              <p className="text-zinc-300 mb-6 relative z-10">"{testimonial.content}"</p>
              
              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <p className="text-white font-semibold">{testimonial.name}</p>
                  <p className="text-zinc-500 text-sm">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
