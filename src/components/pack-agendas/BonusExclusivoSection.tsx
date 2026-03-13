import { appendUtmToUrl } from "@/lib/utmUtils";

const gifItems = [
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/Agenda-animada-Dinho-Alves-00_00_00-00_00_30.gif", alt: "Agenda animada Dinho Alves" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/Agenda-animada-Aldair-Playboy-00_00_00-00_00_30.gif", alt: "Agenda animada Aldair Playboy" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/Agenda-animada-Felipe-Amorim-00_00_00-00_00_30.gif", alt: "Agenda animada Felipe Amorim" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/Agenda-animada-Dilsinho-00_00_00-00_00_30.gif", alt: "Agenda animada Dilsinho" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/Agenda-Animada-DJ-Xuxu-00_00_00-00_00_30.gif", alt: "Agenda animada DJ Xuxu" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/Agenda-Animada-MC-Davi-00_00_00-00_00_30.gif", alt: "Agenda animada MC Davi" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/Agenda-Animada-Japaozin-00_00_00-00_00_30.gif", alt: "Agenda animada Japaozin" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/Agenda-animada-Dennis-DJ-00_00_00-00_00_30.gif", alt: "Agenda animada Dennis DJ" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/Agenda-Animada-MC-MIRELA-00_00_00-00_00_30.gif", alt: "Agenda animada MC Mirela" },
  { src: "https://voxvisual.com.br/wp-content/uploads/2025/03/joao-gomes.gif", alt: "Agenda animada João Gomes" },
];

const getDayName = () => {
  const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return `${days[now.getDay()]}, ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}.`;
};

const BonusExclusivoSection = () => {
  const checkoutUrl = appendUtmToUrl("https://payfast.greenn.com.br/redirect/177574");

  return (
    <section
      className="w-full py-16 md:py-24 px-4"
      style={{ background: "#DC4029" }}
    >
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-8 md:gap-12 text-center">
        <h2
          style={{
            fontFamily: "'Staatliches', cursive",
            fontSize: "clamp(28px, 5vw, 52px)",
            color: "#FFFFFF",
            lineHeight: 1.1,
            textTransform: "uppercase",
          }}
        >
          BÔNUS EXCLUSIVO DE LANÇAMENTO
        </h2>
        <p
          className="-mt-4 md:-mt-6"
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: "clamp(16px, 2.5vw, 24px)",
            color: "#FFFFFF",
            lineHeight: 1.5,
            maxWidth: "800px",
          }}
        >
          Adquirindo hoje vc leva{" "}
          <strong style={{ color: "#FFFFFF" }}>10 videos animados de agendas</strong>{" "}
          100% editáveis no canva!
        </p>

        <div className="w-full grid grid-cols-2 md:grid-cols-5 gap-2.5">
          {gifItems.map((gif, index) => (
            <div key={index} className="rounded-lg overflow-hidden" style={{ aspectRatio: "9/16" }}>
              <img src={gif.src} alt={gif.alt} className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>

        <h2
          style={{
            fontFamily: "'Staatliches', cursive",
            fontSize: "clamp(28px, 5vw, 52px)",
            color: "#FFFFFF",
            lineHeight: 1.1,
            textTransform: "uppercase",
          }}
        >
          E TEM MAIS
        </h2>
        <p
          className="-mt-4 md:-mt-6"
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: "clamp(16px, 2.5vw, 24px)",
            color: "#FFFFFF",
            lineHeight: 1.5,
            maxWidth: "800px",
          }}
        >
          Pack com{" "}
          <strong style={{ color: "#FFFFFF" }}>20 movies para telão de palco</strong>{" "}
          editáveis no Canva!
        </p>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {[
            { src: "/videos/DJ_GUUGA.mp4", alt: "DJ Guuga" },
            { src: "/videos/MAIARA_E_MARAISA.mp4", alt: "Maiara e Maraisa" },
            { src: "/videos/REVOADA_DO_PARANGO.mp4", alt: "Revoada do Parango" },
            { src: "/videos/TOCA_DO_VALE.mp4", alt: "Toca do Vale" },
            { src: "/videos/DJ_ALOK.mp4", alt: "DJ Alok" },
            { src: "/videos/GICA.mp4", alt: "Gica", desktopOnly: true },
          ].map((video, index) => (
            <div
              key={index}
              className={`rounded-lg overflow-hidden ${(video as any).desktopOnly ? 'hidden md:block' : ''}`}
              style={{ aspectRatio: "16/9" }}
            >
              <video src={video.src} autoPlay muted loop playsInline className="w-full h-full object-cover" />
            </div>
          ))}
        </div>

        <a
          href={checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="cta-btn-agendas inline-flex items-center justify-center gap-2"
          style={{
            fontFamily: "'Staatliches', cursive",
            fontSize: "clamp(18px, 2.5vw, 27px)",
            color: "#FFFFFF",
            background: "#1A59E5",
            padding: "15px 40px",
            textDecoration: "none",
            borderRadius: "12px",
          }}
        >
          🔓 COMPRAR PACK COMPLETO
        </a>
        <p
          className="-mt-6 md:-mt-8"
          style={{
            fontFamily: "'Staatliches', cursive",
            fontSize: "clamp(16px, 2vw, 22px)",
            color: "#FFFFFF",
            lineHeight: 1.4,
          }}
        >
          Válido Apenas Hoje{" "}
          <strong style={{ color: "#FFFFFF" }}>{getDayName()}</strong>
        </p>
      </div>
    </section>
  );
};

export default BonusExclusivoSection;