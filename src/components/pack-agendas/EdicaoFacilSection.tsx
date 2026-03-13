import { appendUtmToUrl } from "@/lib/utmUtils";

const EdicaoFacilSection = () => {
  const checkoutUrl = appendUtmToUrl("https://payfast.greenn.com.br/redirect/177574");

  return (
    <section
      className="w-full py-16 md:py-24 px-4"
      style={{ backgroundColor: "#1A59E5" }}
    >
      <div className="max-w-6xl mx-auto flex flex-col gap-16 md:gap-24">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <div className="w-full md:w-1/2 rounded-lg overflow-hidden">
            <video
              className="w-full h-auto hidden md:block"
              src="https://voxvisual.com.br/wp-content/uploads/2024/12/VIDEO-COMPLETO-JUNTADO-1.mp4"
              autoPlay
              loop
              muted
              playsInline
              style={{ borderRadius: "12px" }}
            />
            <video
              className="w-full h-auto block md:hidden"
              src="https://voxvisual.com.br/wp-content/uploads/2025/02/edite.mp4"
              autoPlay
              loop
              muted
              playsInline
              style={{ borderRadius: "12px" }}
            />
          </div>
          <div className="w-full md:w-1/2 flex flex-col gap-4">
            <h2
              style={{
                fontFamily: "'Staatliches', cursive",
                fontSize: "clamp(28px, 4vw, 42px)",
                color: "#FFDF00",
                lineHeight: 1.1,
              }}
            >
              Edição facil pelo celular ou computador!
            </h2>
            <div
              className="flex flex-col gap-3"
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: "clamp(14px, 1.5vw, 17px)",
                color: "#FFFFFF",
                fontWeight: 400,
                lineHeight: 1.6,
              }}
            >
              <p>
                ✅ <strong>100% Editável no Canva e Photoshop:</strong> Faça tudo
                diretamente no aplicativo Canva, sem complicações.
              </p>
              <p>
                ✅ <strong>Edição Fácil e Rápida</strong>: Acesse os modelos no
                celular, tablet ou computador e edite em minutos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <div className="w-full md:w-1/2">
            <img
              src="https://voxvisual.com.br/wp-content/uploads/2025/02/EDITION-min-2.png"
              alt="Edição no Canva e Photoshop"
              className="w-full h-auto"
              loading="lazy"
            />
          </div>
          <div className="w-full md:w-1/2 flex flex-col gap-4">
            <h2
              style={{
                fontFamily: "'Staatliches', cursive",
                fontSize: "clamp(28px, 4vw, 42px)",
                color: "#FFDF00",
                lineHeight: 1.1,
              }}
            >
              Grupo de membros e atualizações de artes toda semana no whatsapp
            </h2>
            <div
              className="flex flex-col gap-1"
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: "clamp(14px, 1.5vw, 17px)",
                color: "#FFFFFF",
                fontWeight: 400,
                lineHeight: 1.8,
              }}
            >
              <p>✅ 1 Arte nova toda semana!</p>
              <p>✅ 6 meses de acesso</p>
              <p>✅ Comunidade exclusiva</p>
            </div>
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cta-btn-agendas hidden md:inline-flex items-center justify-center gap-2 mt-2"
              style={{
                fontFamily: "'Staatliches', cursive",
                fontSize: "clamp(18px, 2.5vw, 27px)",
                color: "#1A59E5",
                background: "#FFDF00",
                padding: "15px 30px",
                borderRadius: "12px",
                textDecoration: "none",
                width: "fit-content",
              }}
            >
              🔓 OBTER ACESSO AGORA!
            </a>
            <img
              src="https://voxvisual.com.br/wp-content/uploads/2024/11/ICONES-GARANTIA.png"
              alt="Garantia e segurança"
              className="hidden md:block w-full max-w-md h-auto mt-2"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default EdicaoFacilSection;