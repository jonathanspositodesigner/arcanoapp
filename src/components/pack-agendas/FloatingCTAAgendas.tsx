import { appendUtmToUrl } from "@/lib/utmUtils";

const CHECKOUT_URL = "https://payfast.greenn.com.br/redirect/177574";

const FloatingCTAAgendas = () => {
  const handleCTA = () => {
    window.open(appendUtmToUrl(CHECKOUT_URL), "_blank");
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 md:hidden z-50">
      <div className="w-full py-2 text-center" style={{ backgroundColor: "#F5C518" }}>
        <span
          style={{
            fontFamily: "'Staatliches', cursive",
            fontSize: "18px",
            color: "#1a1a1a",
          }}
        >
          Esta Oferta termina hoje!
        </span>
      </div>
      <div className="w-full py-3 px-6 flex justify-center" style={{ backgroundColor: "#2A2A6A" }}>
        <button
          onClick={handleCTA}
          className="w-full max-w-sm"
          style={{
            fontFamily: "'Staatliches', cursive",
            fontSize: "18px",
            backgroundColor: "#3D6AFF",
            color: "white",
            borderRadius: "50px",
            padding: "12px 24px",
            boxShadow: "inset 0 2px 4px rgba(255,255,255,0.4)",
            cursor: "pointer",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          🔒 Desbloquear Agora!
        </button>
      </div>
    </div>
  );
};

export default FloatingCTAAgendas;