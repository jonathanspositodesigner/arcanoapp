import { appendUtmToUrl } from "@/lib/utmUtils";

const GuaranteeSection = () => {
  const ctaUrl = appendUtmToUrl("https://voxvisual.com.br/pack-agendas/#planos");

  return (
    <section className="py-16 md:py-24 px-4" style={{ backgroundColor: "#EAEAEA" }}>
      <div className="max-w-5xl mx-auto">
        <div
          className="rounded-3xl p-6 md:p-12 shadow-2xl"
          style={{ backgroundColor: "#1A59E5" }}
        >
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <div className="flex-shrink-0">
              <img
                src="https://lp.voxvisual.com.br/wp-content/uploads/2025/09/SELO-GARANTIA.png"
                alt="Garantia de 7 Dias Incondicional"
                className="w-48 md:w-72 h-auto"
                loading="lazy"
              />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2
                className="text-2xl md:text-4xl mb-4 uppercase font-normal"
                style={{ fontFamily: "Staatliches, sans-serif", color: "#FFFFFF" }}
              >
                Qual a minha garantia?
              </h2>
              <p
                className="text-lg md:text-xl mb-4"
                style={{ fontFamily: "Poppins, sans-serif", color: "#FFFFFF", fontWeight: 400 }}
              >
                Você tem <strong>7 dias de garantia incondicional</strong>
              </p>
              <p
                className="mb-3 leading-relaxed"
                style={{ fontFamily: "Poppins, sans-serif", color: "rgba(255,255,255,0.85)" }}
              >
                Garantimos sua segurança com a Greenn, uma plataforma de pagamento altamente segura.
              </p>
              <p
                className="mb-6 leading-relaxed"
                style={{ fontFamily: "Poppins, sans-serif", color: "rgba(255,255,255,0.85)" }}
              >
                Você também conta com <strong>7 dias de garantia para reembolso</strong>
              </p>
              <a
                href={ctaUrl}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-normal text-base md:text-lg transition-all hover:brightness-110"
                style={{
                  fontFamily: "Staatliches, sans-serif",
                  backgroundColor: "#22c55e",
                  color: "#FFFFFF",
                  letterSpacing: "0.05em",
                }}
              >
                🔒 COMPRAR COM SEGURANÇA
              </a>
              <div className="mt-6">
                <img
                  src="https://voxvisual.com.br/wp-content/uploads/2024/11/ICONES-GARANTIA.png"
                  alt="Compra Segura - Satisfação Garantida - Privacidade Protegida"
                  className="h-auto max-w-xs md:max-w-md mx-auto md:mx-0"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GuaranteeSection;