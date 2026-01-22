import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const faqItems = [
  {
    question: "Como vou receber o material?",
    answer: "Após a confirmação do pagamento, você receberá um e-mail com os dados de acesso à nossa plataforma exclusiva. Lá você encontrará todo o material organizado e pronto para download."
  },
  {
    question: "Posso editar as artes no celular?",
    answer: "Sim! Todas as artes são 100% editáveis no Canva, que funciona perfeitamente em smartphones e tablets. Você pode editar de qualquer lugar."
  },
  {
    question: "O pack funciona no Canva gratuito?",
    answer: "Sim! Todas as artes foram desenvolvidas para funcionar no Canva gratuito. Você não precisa ter conta Pro para editar."
  },
  {
    question: "Posso usar para vender agendas personalizadas?",
    answer: "Sim! Você pode usar as artes para criar e vender agendas personalizadas para seus clientes. Não há limitações de uso comercial."
  },
  {
    question: "E se eu não gostar do material?",
    answer: "Oferecemos 7 dias de garantia incondicional. Se por qualquer motivo você não ficar satisfeito, basta solicitar o reembolso e devolvemos 100% do valor pago."
  },
  {
    question: "Qual a diferença entre o Pacote Básico e Completo?",
    answer: "O Pacote Básico inclui as +60 artes de agendas com 6 meses de acesso. O Pacote Completo inclui tudo do básico + 1 ano de acesso + atualizações semanais + todos os bônus (190 flyers animados, 19 templates After Effects, 16GB de PNGs, +2200 fontes e +500 texturas)."
  },
  {
    question: "Por quanto tempo terei acesso?",
    answer: "O Pacote Básico oferece 6 meses de acesso. O Pacote Completo oferece 1 ano de acesso com atualizações semanais durante todo o período."
  },
  {
    question: "Preciso saber design para usar?",
    answer: "Não! As artes vêm prontas, você só precisa trocar os textos e elementos conforme sua necessidade. Além disso, incluímos vídeo aulas explicativas para te ajudar."
  }
];

export const FAQSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <section className="py-20 bg-zinc-950">
      <div className="container mx-auto px-4 max-w-4xl">
        <div 
          ref={ref}
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Perguntas{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Frequentes
            </span>
          </h2>
          <p className="text-zinc-400 text-lg">
            Tire suas dúvidas sobre o Pack de Agendas
          </p>
        </div>

        <div
          className={`transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "200ms" }}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqItems.map((item, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl px-6 data-[state=open]:border-purple-500/50 transition-colors"
              >
                <AccordionTrigger className="text-left text-white hover:text-purple-400 py-6">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-zinc-400 pb-6">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};
