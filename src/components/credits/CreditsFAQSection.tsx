import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqItems = [
  {
    question: "Os créditos expiram?",
    answer: "Não! Os créditos avulsos são vitalícios e nunca expiram. Você pode usá-los quando quiser, sem prazo limite. Já os créditos mensais do plano são renovados a cada ciclo."
  },
  {
    question: "Quais métodos de pagamento são aceitos?",
    answer: "Aceitamos Pix, cartão de crédito (até 12x), boleto bancário e carteiras digitais. O pagamento é processado de forma segura pela nossa plataforma de pagamentos."
  },
  {
    question: "Posso receber um reembolso após fazer uma recarga?",
    answer: "Sim, oferecemos 7 dias de garantia incondicional para pacotes de créditos. Se não ficar satisfeito, basta solicitar o reembolso e devolvemos 100% do valor."
  },
  {
    question: "Para que podem ser usados os créditos?",
    answer: "Os créditos podem ser usados em todas as ferramentas de IA da plataforma: Upscaler Arcano, Arcano Cloner, Mudar Roupa, Mudar Pose, Upscaler de Vídeo, Gerador de Imagens e muito mais."
  },
  {
    question: "Por que escolher um pacote maior é mais econômico?",
    answer: "Quanto maior o pacote, menor o custo por crédito. O pacote de 4.200 créditos oferece 46% de economia e o de 14.000 créditos oferece 57% de economia em relação ao pacote básico."
  },
  {
    question: "Como posso entrar em contato conosco?",
    answer: "Você pode nos contatar pelo WhatsApp (33) 98881-9891 ou pelo e-mail de atendimento disponível na plataforma. Estamos sempre prontos para ajudar!"
  },
  {
    question: "Como posso ganhar créditos através de promoções?",
    answer: "Fique de olho nas nossas redes sociais e notificações dentro da plataforma. Frequentemente oferecemos promoções exclusivas, códigos de resgate e eventos especiais com créditos bônus."
  },
];

export const CreditsFAQSection = () => {
  return (
    <section className="py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-white mb-10">
          Perguntas frequentes
        </h2>

        <Accordion type="single" collapsible className="space-y-3">
          {faqItems.map((item, index) => (
            <AccordionItem
              key={index}
              value={`faq-${index}`}
              className="bg-white/[0.03] border border-border rounded-xl px-5 data-[state=open]:border-slate-500/40 transition-colors"
            >
              <AccordionTrigger className="text-left text-white/90 text-sm md:text-base font-medium hover:no-underline py-4">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm pb-4">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
