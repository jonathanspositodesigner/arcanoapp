import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Como vou receber o meu acesso?",
    answer:
      "Após a confirmação do pagamento, você receberá um e-mail com suas credenciais de acesso à área de membros. Lá você terá acesso a todas as artes, motions, selos 3D e bônus exclusivos.",
  },
  {
    question: "Qual programa preciso para editar as artes?",
    answer:
      "Você pode editar todas as artes usando o Canva (gratuito) ou o Photoshop. Todas as artes estão disponíveis em ambos os formatos para facilitar sua edição.",
  },
  {
    question: "O pacote inclui suporte técnico?",
    answer:
      "Sim! Oferecemos suporte técnico via e-mail e WhatsApp. Além disso, temos video aulas exclusivas que ensinam passo a passo como editar cada arte.",
  },
  {
    question: "Sou iniciante, é pra mim?",
    answer:
      "Com certeza! O pack foi desenvolvido pensando em todos os níveis de experiência. As artes são fáceis de editar e as video aulas ensinam desde o básico até técnicas avançadas.",
  },
  {
    question: "O pack recebe atualizações?",
    answer:
      "Sim! Adicionamos novas artes semanalmente. Você terá acesso a todas as atualizações durante o período do seu plano (ou para sempre no plano vitalício).",
  },
];

export const FAQSectionCombo = () => {
  return (
    <section className="py-16 px-4 bg-black">
      <div className="max-w-3xl mx-auto">
        {/* Section title */}
        <h2 className="text-3xl md:text-4xl font-black text-center text-white mb-4">
          Perguntas Frequentes
        </h2>
        <p className="text-gray-400 text-center mb-12">
          Tire suas dúvidas sobre o pack
        </p>
        
        {/* FAQ Accordion */}
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`faq-${index}`}
              className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-xl px-6 data-[state=open]:border-[#EF672C]/50"
            >
              <AccordionTrigger className="text-left text-white font-semibold hover:no-underline py-4">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-gray-400 pb-4">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
