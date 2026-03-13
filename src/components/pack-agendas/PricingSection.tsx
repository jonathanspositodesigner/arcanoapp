import { CheckCircle, Star, ArrowDown, Gift, Clock } from "lucide-react";
import { appendUtmToUrl } from "@/lib/utmUtils";
import { useState, useEffect } from "react";

const BASIC_CHECKOUT = "https://payfast.greenn.com.br/redirect/177567";
const COMPLETE_CHECKOUT = "https://payfast.greenn.com.br/redirect/177574";
const STARS_IMG = "https://voxvisual.com.br/wp-content/uploads/2025/02/5-estrelas.webp";
const BOX_IMG = "https://voxvisual.com.br/wp-content/uploads/2025/03/BOX-AGENDAS-COMPLETO.png";

const basicFeatures = [
  "+60 Artes Exclusivas",
  "Vídeo Aulas Explicativas",
  "7 Dias de Garantia",
  "100% Editável Canva e Photoshop",
  "6 Meses de Acesso",
];

const completeCheckFeatures = [
  "+60 Artes Exclusivas",
  "Vídeo Aulas Explicativas",
  "7 Dias de Garantia",
  "100% Editável Canva e Photoshop",
];

const completeBonusFeatures = [
  "1 Ano de Acesso",
  "Atualizações Semanais",
  "Pack 190 Flyers Canva",
  "Pack 19 Flyers After Effects",
  "Documentos Essenciais",
  "Pack 16GB Elementos PNG",
  "Pack +2.200 Fontes",
  "Pack +500 Texturas",
];

const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = sessionStorage.getItem("pricing-countdown-end");
    if (saved) {
      const diff = Math.max(0, Math.floor((parseInt(saved) - Date.now()) / 1000));
      return diff;
    }
    const end = Date.now() + 3 * 60 * 60 * 1000;
    sessionStorage.setItem("pricing-countdown-end", end.toString());
    return 3 * 60 * 60;
  });

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const hours = String(Math.floor(timeLeft / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, "0");
  const seconds = String(timeLeft % 60).padStart(2, "0");

  return (
    <div className="flex flex-col items-center mb-10">
      <p
        className="text-lg md:text-xl font-bold mb-2"
        style={{ fontFamily: "Poppins, sans-serif", color: "#FFFFFF" }}
      >
        🚨 Últimas horas da promoção 🚨
      </p>
      <div className="flex items-center gap-2" style={{ color: "rgba(255,255,255,0.7)" }}>
        <Clock size={16} />
        <span style={{ fontFamily: "Poppins, sans-serif", fontSize: "14px" }}>
          Oferta expira em{" "}
          <span className="font-bold" style={{ color: "#FF4444" }}>
            {hours}:{minutes}:{seconds}
          </span>
        </span>
      </div>
    </div>
  );
};

const PricingSection = () => {
  const handlePurchase = (url: string) => {
    window.open(appendUtmToUrl(url), "_blank");
  };

  return (
    <section
      id="planos"
      className="relative py-16 md:py-24 px-4"
      style={{
        backgroundImage:
          "url('https://voxvisual.com.br/wp-content/uploads/2025/03/BG-SITE.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(43,110,255,0.85)" }} />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <h2
          className="text-3xl md:text-5xl font-normal uppercase mb-3"
          style={{ fontFamily: "Staatliches, sans-serif", color: "#FFFFFF" }}
        >
          CHEGOU A SUA VEZ DE COMEÇAR A CRIAR ARTES INCRÍVEIS
        </h2>
        <p
          className="text-2xl md:text-3xl uppercase mb-6"
          style={{ fontFamily: "Staatliches, sans-serif", color: "#FFDF00" }}
        >
          ESCOLHA O SEU PACOTE IDEAL
        </p>

        <CountdownTimer />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
          <div
            className="rounded-2xl p-6 md:p-8 text-white flex flex-col items-center"
            style={{
              background: "linear-gradient(180deg, rgba(26,26,46,0.5) 0%, rgba(13,13,26,0.5) 100%)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <img src={STARS_IMG} alt="5 estrelas" className="h-5 mb-2" loading="lazy" />
            <p className="text-sm text-gray-300 mb-4" style={{ fontFamily: "Sora, sans-serif" }}>
              4.72 (328 Avaliações)
            </p>
            <h3
              className="text-3xl md:text-4xl uppercase mb-4"
              style={{ fontFamily: "Staatliches, sans-serif" }}
            >
              Pacote básico
            </h3>
            <p className="text-gray-400 line-through text-lg" style={{ fontFamily: "Sora, sans-serif" }}>
              De R$87,00 por:
            </p>
            <p
              className="text-5xl md:text-6xl font-bold my-2"
              style={{ fontFamily: "Staatliches, sans-serif", color: "#FFDF00" }}
            >
              R$27
            </p>

            <ul className="w-full text-left space-y-3 my-6">
              {basicFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-3" style={{ fontFamily: "Sora, sans-serif" }}>
                  <CheckCircle className="text-green-400 shrink-0" size={20} />
                  <span className="text-sm md:text-base">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handlePurchase(BASIC_CHECKOUT)}
              className="w-full py-4 rounded-xl text-white font-bold text-lg uppercase tracking-wide transition-all hover:brightness-110"
              style={{
                fontFamily: "Staatliches, sans-serif",
                backgroundColor: "#1A59E5",
                letterSpacing: "0.05em",
              }}
            >
              COMPRAR PACK BÁSICO
            </button>

            <div className="mt-6 flex flex-col items-center gap-1 text-yellow-400">
              <p className="text-sm text-center font-semibold" style={{ fontFamily: "Sora, sans-serif", color: "#FFDF00" }}>
                ESPERE! Temos uma oferta ainda melhor para você
              </p>
              <ArrowDown size={20} className="animate-bounce" style={{ color: "#FFDF00" }} />
            </div>
          </div>

          <div
            className="rounded-2xl p-6 md:p-8 text-white flex flex-col items-center relative overflow-hidden"
            style={{
              background: "linear-gradient(180deg, #0a2a6e 0%, #061640 100%)",
              border: "2px solid #FFDF00",
            }}
          >
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 px-6 py-1 rounded-b-lg text-sm font-bold uppercase"
              style={{
                fontFamily: "Staatliches, sans-serif",
                backgroundColor: "#FFDF00",
                color: "#000",
                letterSpacing: "0.05em",
              }}
            >
              mais vendido
            </div>

            <div className="mt-6">
              <img src={STARS_IMG} alt="5 estrelas" className="h-5 mb-2 mx-auto" />
            </div>
            <p className="text-sm text-gray-300 mb-4" style={{ fontFamily: "Sora, sans-serif" }}>
              4.94 (1.048 Avaliações)
            </p>
            <h3
              className="text-3xl md:text-4xl uppercase mb-4"
              style={{ fontFamily: "Staatliches, sans-serif" }}
            >
              Pacote completo
            </h3>
            <p className="text-gray-400 line-through text-lg" style={{ fontFamily: "Sora, sans-serif" }}>
              De R$197,00 por:
            </p>
            <p
              className="text-5xl md:text-6xl font-bold my-2"
              style={{ fontFamily: "Staatliches, sans-serif", color: "#FFDF00" }}
            >
              R$37
            </p>

            <img src={BOX_IMG} alt="Box Pack Agendas Completo" className="w-48 md:w-56 my-4" />

            <div className="w-full flex flex-col gap-2">
              <div
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm uppercase"
                style={{
                  fontFamily: "Poppins, sans-serif",
                  backgroundColor: "#FFDF00",
                  color: "#1A59E5",
                  fontWeight: 700,
                }}
              >
                <Gift size={16} />
                +20 Movies de Telão Canva
              </div>
              <div
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm uppercase"
                style={{
                  fontFamily: "Poppins, sans-serif",
                  backgroundColor: "#FFDF00",
                  color: "#1A59E5",
                  fontWeight: 700,
                }}
              >
                <Gift size={16} />
                +10 Motions Canva
              </div>
            </div>

            <ul className="w-full text-left space-y-3 my-4">
              {completeCheckFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-3" style={{ fontFamily: "Sora, sans-serif" }}>
                  <CheckCircle className="text-green-400 shrink-0" size={20} />
                  <span className="text-sm md:text-base">{feature}</span>
                </li>
              ))}
              {completeBonusFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-3" style={{ fontFamily: "Sora, sans-serif" }}>
                  <Star className="text-yellow-400 shrink-0 fill-yellow-400" size={20} />
                  <span className="text-sm md:text-base">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handlePurchase(COMPLETE_CHECKOUT)}
              className="w-full py-4 rounded-xl text-xl uppercase tracking-wide transition-all hover:brightness-110 hover:scale-[1.02]"
              style={{
                fontFamily: "Staatliches, sans-serif",
                backgroundColor: "#FFDF00",
                color: "#1A59E5",
                letterSpacing: "0.05em",
                fontWeight: 400,
                boxShadow: "0 0 20px rgba(255,223,0,0.5), 0 4px 15px rgba(0,0,0,0.3)",
              }}
            >
              🔓 COMPRAR PACK COMPLETO
            </button>

            <p className="mt-4 text-sm font-semibold text-center" style={{ fontFamily: "Sora, sans-serif", color: "#FFDF00" }}>
              APROVEITE AGORA! Oferta válida APENAS HOJE!
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;