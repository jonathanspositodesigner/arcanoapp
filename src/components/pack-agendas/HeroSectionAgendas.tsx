import { appendUtmToUrl } from "@/lib/utmUtils";

const CHECKOUT_URL = "https://payfast.greenn.com.br/redirect/177574";

const HeroSectionAgendas = () => {
  const handleCTA = () => {
    window.open(appendUtmToUrl(CHECKOUT_URL), "_blank");
  };

  return (
    <section
      className="w-full relative"
      style={{
        backgroundColor: "#EAEAEA",
      }}
    >
      <div
        className="absolute inset-0 opacity-50 md:opacity-100"
        style={{
          backgroundImage:
            "url('https://voxvisual.com.br/wp-content/uploads/2025/03/BG-SITE.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 py-10 md:py-16">
        <div className="hidden md:grid md:grid-cols-2 gap-8 items-center">
          <div className="flex flex-col gap-6">
            <img
              src="https://voxvisual.com.br/wp-content/uploads/2025/03/LOGO-AGENDAS-H.png"
              alt="Pack Agendas Logo"
              className="w-[320px] h-auto"
            />
            <h1
              className="uppercase leading-tight"
              style={{
                fontFamily: "'Staatliches', cursive",
                fontSize: "38px",
                color: "#313131",
              }}
            >
              Edite Agendas profissionais em minutos
            </h1>
            <p
              style={{
                fontFamily: "'Sora', sans-serif",
                fontWeight: 600,
                fontSize: "20px",
                color: "#383838",
              }}
            >
              Desbloqueie artes exclusivas e editáveis que vão elevar o nível dos
              seus trabalhos como designer e artista visual.
            </p>
            <button
              onClick={handleCTA}
              className="cta-btn-agendas relative overflow-hidden w-fit"
              style={{
                fontFamily: "'Staatliches', cursive",
                fontSize: "27px",
                backgroundColor: "#3D6AFF",
                color: "white",
                borderRadius: "50px",
                padding: "14px 48px",
                boxShadow: "inset 0 2px 4px rgba(255,255,255,0.4)",
                cursor: "pointer",
                border: "none",
                transition: "all 0.3s ease",
              }}
            >
              DESBLOQUEAR AGORA!
            </button>
          </div>
          <div className="flex justify-center">
            <img
              src="https://voxvisual.com.br/wp-content/uploads/2025/03/IMG-INICIO.png"
              alt="Pack Agendas Preview"
              className="w-full max-w-[550px] h-auto"
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 md:hidden pb-4">
          <img
            src="https://voxvisual.com.br/wp-content/uploads/2025/03/IMG-INICIO.png"
            alt="Pack Agendas Preview"
            className="w-full max-w-[340px] h-auto -mb-2"
          />
          <img
            src="https://voxvisual.com.br/wp-content/uploads/2025/03/LOGO-AGENDAS-H.png"
            alt="Pack Agendas Logo"
            className="w-[220px] h-auto"
          />
          <h1
            className="text-center uppercase leading-tight px-2"
            style={{
              fontFamily: "'Staatliches', cursive",
              fontSize: "24px",
              color: "#313131",
            }}
          >
            O Pack de AGENDAS EDITÁVEIS que vai mudar o seu game como designer e
            artista
          </h1>
          <button
            onClick={handleCTA}
            className="cta-btn-agendas relative overflow-hidden w-[85%]"
            style={{
              fontFamily: "'Staatliches', cursive",
              fontSize: "20px",
              backgroundColor: "#3D6AFF",
              color: "white",
              borderRadius: "50px",
              padding: "14px 32px",
              boxShadow: "inset 0 2px 4px rgba(255,255,255,0.4)",
              cursor: "pointer",
              border: "none",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            🔒 DESBLOQUEAR AGORA!
          </button>
          <p
            className="text-center px-4"
            style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: 600,
              fontSize: "13px",
              color: "#383838",
            }}
          >
            Desbloqueie artes exclusivas de alta qualidade 100% editáveis no
            CANVA E PHOTOSHOP!
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSectionAgendas;