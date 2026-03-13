import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { appendUtmToUrl } from "@/lib/utmUtils";

const faqItems = [
  {
    question: "Como vou receber o Pack de Agendas?",
    answer:
      'Assim que sua compra ser aprovada, você vai receber imediatamente em seu e-mail o acesso da nossa área de membros com todos os links organizados para usar todo o material.',
  },
  {
    question: "Qual programa preciso para editar as artes?",
    answer:
      "Todas as artes são editáveis no Canva e Photoshop, você pode escolher um dos dois para editar o conteúdo. Não é necessário nenhum conhecimento avançado, somente das ferramentas básicas.",
  },
  {
    question: "O pacote inclui suporte técnico?",
    answer:
      "Sim, oferecemos suporte técnico por e-mail e vídeo aulas para ajudar na utilização do pacote.",
  },
  {
    question: "Sou iniciante, é pra mim?",
    answer:
      "O Pack de Agendas é uma excelente escolha para iniciantes, fornecendo tudo o que você precisa para criar artes incríveis.",
  },
  {
    question: "O pack recebe atualizações?",
    answer:
      "Sim, você terá acesso ao nosso grupo de atualizações no telegram sem custo adicional no Baú Arcano.",
  },
];

const FAQSectionAgendas = () => {
  const checkoutUrl = appendUtmToUrl("https://payfast.greenn.com.br/redirect/177574");

  return (
    <section className="py-16 md:py-24 px-4" style={{ backgroundColor: "#0d1b3e" }}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <p
            className="text-lg md:text-xl mb-2"
            style={{ fontFamily: "Sora, sans-serif", color: "rgba(255,255,255,0.7)" }}
          >
            Ficou com dúvidas? confira nossas
          </p>
          <h2
            className="text-3xl md:text-5xl uppercase"
            style={{ fontFamily: "Staatliches, sans-serif", color: "#FFDF00" }}
          >
            Perguntas Frequentes
          </h2>
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          {faqItems.map((item, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="border rounded-xl px-5 overflow-hidden"
              style={{
                backgroundColor: "rgba(26,89,229,0.3)",
                borderColor: "rgba(255,255,255,0.1)",
              }}
            >
              <AccordionTrigger
                className="text-left text-base md:text-lg py-5 hover:no-underline"
                style={{ fontFamily: "Sora, sans-serif", color: "#FFFFFF", fontWeight: 500 }}
              >
                {index + 1}. {item.question}
              </AccordionTrigger>
              <AccordionContent
                className="text-sm md:text-base pb-5"
                style={{ fontFamily: "Sora, sans-serif", color: "rgba(255,255,255,0.8)", lineHeight: 1.7 }}
              >
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="text-center mt-16">
          <h3
            className="text-2xl md:text-4xl uppercase mb-2"
            style={{ fontFamily: "Staatliches, sans-serif", color: "#FFFFFF" }}
          >
            Começe agora mesmo a criar artes profissionais em minutos!
          </h3>
          <p
            className="text-lg mb-6"
            style={{ fontFamily: "Sora, sans-serif", color: "#FFDF00" }}
          >
            Promoção por tempo limitado
          </p>
          <a
            href={checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl text-xl uppercase transition-all hover:brightness-110"
            style={{
              fontFamily: "Staatliches, sans-serif",
              backgroundColor: "#FFDF00",
              color: "#1A59E5",
              letterSpacing: "0.05em",
            }}
          >
            🔓 QUERO ESSAS ARTES!
          </a>
        </div>
      </div>
    </section>
  );
};

export default FAQSectionAgendas;