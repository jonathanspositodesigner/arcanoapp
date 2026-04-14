import { ShieldCheck, Award, Lock } from "lucide-react";
import { usePagarmeCheckout } from "@/hooks/usePagarmeCheckout";

const PRODUCT_SLUG = "combo-1ao3-vitalicio";

export const GuaranteeSectionCombo = () => {
  const { openCheckout, isLoading: isCheckoutSubmitting, PagarmeCheckoutModal } = usePagarmeCheckout({ source_page: "combo-artes" });

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-black to-[#0a0505]">
      <div className="max-w-5xl mx-auto">
        <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-3xl p-6 md:p-12 shadow-2xl">
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
              <h2 className="text-2xl md:text-4xl font-black text-gray-100 mb-4">
                Qual a minha garantia?
              </h2>
              
              <p className="text-lg md:text-xl text-gray-400 font-medium mb-4">
                Você tem <span className="font-bold">7 dias de garantia incondicional</span>
              </p>
              
              <p className="text-gray-400 mb-3 leading-relaxed">
                Garantimos sua segurança com uma plataforma de pagamento altamente segura.
              </p>
              
              <p className="text-gray-400 mb-6 leading-relaxed">
                Você também conta com <span className="font-semibold">7 dias de garantia para reembolso</span>
              </p>
              
              <button
                onClick={() => openCheckout(PRODUCT_SLUG)}
                disabled={isCheckoutSubmitting}
                className="w-full md:w-auto bg-green-500 hover:bg-green-600 text-white font-bold text-base md:text-lg px-6 md:px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-green-500/30 flex items-center justify-center gap-2 mx-auto md:mx-0 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Lock className="w-5 h-5 flex-shrink-0" />
                {isCheckoutSubmitting ? "PROCESSANDO..." : "COMPRAR COM SEGURANÇA"}
              </button>
              
              <div className="flex justify-center md:justify-start gap-3 md:gap-6 mt-6">
                <div className="flex items-center gap-1 md:gap-2 text-gray-400">
                  <ShieldCheck className="w-4 h-4 md:w-6 md:h-6 text-gray-400 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-[10px] md:text-xs font-bold leading-tight">Compra</p>
                    <p className="text-[10px] md:text-xs leading-tight">Segura</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 md:gap-2 text-gray-400">
                  <Award className="w-4 h-4 md:w-6 md:h-6 text-gray-400 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-[10px] md:text-xs font-bold leading-tight">Satisfação</p>
                    <p className="text-[10px] md:text-xs leading-tight">Garantida</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 md:gap-2 text-gray-400">
                  <Lock className="w-4 h-4 md:w-6 md:h-6 text-gray-400 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-[10px] md:text-xs font-bold leading-tight">Privacidade</p>
                    <p className="text-[10px] md:text-xs leading-tight">Protegida</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PagarmeCheckoutModal />
    </section>
  );
};
