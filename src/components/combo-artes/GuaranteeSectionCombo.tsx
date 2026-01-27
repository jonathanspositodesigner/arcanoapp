import { ShieldCheck, Award, Lock } from "lucide-react";
import { appendUtmToUrl } from "@/lib/utmUtils";

export const GuaranteeSectionCombo = () => {
  const checkoutUrl = "https://payfast.greenn.com.br/135338/offer/0r2gUj?ch_id=23924&b_id_1=103023&b_offer_1=fMHdgE";

  const handlePurchase = () => {
    const urlWithUtm = appendUtmToUrl(checkoutUrl);
    
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "InitiateCheckout", {
        content_name: "Combo Artes Arcanas - Garantia",
        content_category: "Digital Product",
        content_type: "product",
        currency: "BRL",
      });
    }
    
    window.open(urlWithUtm, "_blank");
  };

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-black to-[#0a0505]">
      <div className="max-w-5xl mx-auto">
        {/* Main card with light gray background */}
        <div className="bg-gradient-to-br from-gray-200 to-gray-300 rounded-3xl p-6 md:p-12 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            {/* Left side - Guarantee seal image */}
            <div className="flex-shrink-0">
              <img 
                src="https://lp.voxvisual.com.br/wp-content/uploads/2025/09/SELO-GARANTIA.png" 
                alt="Garantia de 7 Dias Incondicional" 
                className="w-48 md:w-72 h-auto"
                loading="lazy"
              />
            </div>
            
            {/* Right side - Content */}
            <div className="flex-1 text-center md:text-left">
              {/* Title */}
              <h2 className="text-2xl md:text-4xl font-black text-gray-900 mb-4">
                Qual a minha garantia?
              </h2>
              
              {/* Subtitle */}
              <p className="text-lg md:text-xl text-gray-700 font-medium mb-4">
                Você tem <span className="font-bold">7 dias de garantia incondicional</span>
              </p>
              
              {/* Description */}
              <p className="text-gray-600 mb-3 leading-relaxed">
                Garantimos sua segurança com a Greenn, uma plataforma de pagamento altamente segura.
              </p>
              
              <p className="text-gray-600 mb-6 leading-relaxed">
                Você também conta com <span className="font-semibold">7 dias de garantia para reembolso</span>
              </p>
              
              {/* CTA Button */}
              <button
                onClick={handlePurchase}
                className="w-full md:w-auto bg-green-500 hover:bg-green-600 text-white font-bold text-lg px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-green-500/30 flex items-center justify-center gap-2 mx-auto md:mx-0"
              >
                <Lock className="w-5 h-5" />
                COMPRAR COM SEGURANÇA
              </button>
              
              {/* Trust badges */}
              <div className="flex flex-wrap justify-center md:justify-start gap-6 mt-6">
                <div className="flex items-center gap-2 text-gray-700">
                  <ShieldCheck className="w-6 h-6 text-gray-600" />
                  <div className="text-left">
                    <p className="text-xs font-bold">Compra</p>
                    <p className="text-xs">Segura</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-gray-700">
                  <Award className="w-6 h-6 text-gray-600" />
                  <div className="text-left">
                    <p className="text-xs font-bold">Satisfação</p>
                    <p className="text-xs">Garantida</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-gray-700">
                  <Lock className="w-6 h-6 text-gray-600" />
                  <div className="text-left">
                    <p className="text-xs font-bold">Privacidade</p>
                    <p className="text-xs">Protegida</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
