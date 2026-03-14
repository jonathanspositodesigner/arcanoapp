import { useState, useEffect } from "react";
import { Play, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { supabase } from "@/integrations/supabase/client";
import { useProcessingButton } from "@/hooks/useProcessingButton";
import PreCheckoutModal from "@/components/upscaler/PreCheckoutModal";
import PaymentMethodModal from "@/components/checkout/PaymentMethodModal";
import { getSanitizedUtms } from "@/lib/utmUtils";
import { getMetaCookies } from "@/lib/metaCookies";
import { toast } from "sonner";

const motions = [{
  thumbnail: "https://voxvisual.com.br/wp-content/uploads/2025/11/AGENDA-HERIQUE-E-JULIANO.webp",
  video: "https://voxvisual.com.br/wp-content/uploads/2025/11/MOTION-AGENDA-HERIQUE-E-JULIANO-1.mp4",
  title: "Agenda Henrique e Juliano"
}, {
  thumbnail: "https://voxvisual.com.br/wp-content/uploads/2025/11/HALLOWGRILL.webp",
  video: "https://voxvisual.com.br/wp-content/uploads/2025/11/MOTION-Flyer-HallowGrill-Stories-Social-Media.mp4",
  title: "HallowGrill"
}, {
  thumbnail: "https://voxvisual.com.br/wp-content/uploads/2025/11/ATRACAO-CONFIRMADA-MC-PEDRINHO.webp",
  video: "https://voxvisual.com.br/wp-content/uploads/2025/11/MOTION-ATRACAO-CONFIRMADA-MC-PEDRINHO-1.mp4",
  title: "Atração Confirmada MC Pedrinho"
}, {
  thumbnail: "https://voxvisual.com.br/wp-content/uploads/2025/11/BOTECO-SERTANEJO-1.webp",
  video: "https://voxvisual.com.br/wp-content/uploads/2025/11/BOTECO-SERTANEJO1.mp4",
  title: "Sertanejo Stories"
}, {
  thumbnail: "https://voxvisual.com.br/wp-content/uploads/2025/11/PIZEIRO-DO-JPZ.webp",
  video: "https://voxvisual.com.br/wp-content/uploads/2025/11/PIZEIRO-DO-JPZ_31.mp4",
  title: "Forró Eletrônica"
}, {
  thumbnail: "https://voxvisual.com.br/wp-content/uploads/2025/11/EVENTO-MC-KITINHO.webp",
  video: "https://voxvisual.com.br/wp-content/uploads/2025/11/MOTION-EVENTO-MC-KITINHO-1.mp4",
  title: "Funk Baile"
}, {
  thumbnail: "https://voxvisual.com.br/wp-content/uploads/2025/11/AFTER-DOS-GIGANTES.webp",
  video: "https://voxvisual.com.br/wp-content/uploads/2025/11/AFTER-DOS-GIGANTES-.mp4",
  title: "Reveillon Stories"
}, {
  thumbnail: "https://voxvisual.com.br/wp-content/uploads/2025/11/ARRAIA-DA-CAPITA-1.webp",
  video: "https://voxvisual.com.br/wp-content/uploads/2025/11/ATRAC-MOTION1.mp4",
  title: "São João"
}, {
  thumbnail: "https://voxvisual.com.br/wp-content/uploads/2025/11/HALLOWGRILL.webp",
  video: "https://voxvisual.com.br/wp-content/uploads/2025/11/MOTION-Flyer-HallowGrill-Stories-Social-Media.mp4",
  title: "Halloween"
}, {
  thumbnail: "https://voxvisual.com.br/wp-content/uploads/2025/11/AGENDA-MC-MIRELA1.webp",
  video: "https://voxvisual.com.br/wp-content/uploads/2025/11/AGENDA-MC-MIRELA_1.mp4",
  title: "Country"
}];

const PRODUCT_SLUG = "pack4-vitalicio";

export const MotionsGallerySectionPack4 = () => {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [showPreCheckout, setShowPreCheckout] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const { isSubmitting: isCheckoutSubmitting, startSubmit: startCheckout, endSubmit: endCheckout } = useProcessingButton();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setUserEmail(user.email || null);
      }
    };
    checkAuth();
  }, []);

  const handlePurchase = async () => {
    if (!startCheckout()) return;

    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "InitiateCheckout", {
        content_name: "Pack Arcano Vol. 4",
        content_category: "Digital Product",
        content_type: "product",
        currency: "BRL",
      });
    }

    if (!userId) {
      setShowPreCheckout(true);
      endCheckout();
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, phone, cpf, address_line, address_zip, address_city, address_state, address_country')
        .eq('id', userId)
        .single();

      const isProfileComplete = profile?.name && profile?.phone && profile?.cpf
        && profile?.address_line && profile?.address_zip && profile?.address_city && profile?.address_state;

      if (isProfileComplete) {
        setPendingProfile(profile);
        setShowPaymentMethodModal(true);
      } else {
        setShowPreCheckout(true);
      }
    } catch {
      // fallback
    }
    endCheckout();
  };

  const handlePaymentMethodSelected = async (method: 'PIX' | 'CREDIT_CARD') => {
    if (!pendingProfile) return;
    if (!startCheckout()) return;

    try {
      const utmData = getSanitizedUtms();
      const { fbp, fbc } = getMetaCookies();
      const body: any = {
        product_slug: PRODUCT_SLUG,
        user_email: userEmail,
        user_phone: pendingProfile.phone,
        user_name: pendingProfile.name,
        user_cpf: pendingProfile.cpf,
        billing_type: method,
        utm_data: utmData,
        fbp,
        fbc,
      };

      if (method === 'PIX') {
        body.user_address = {
          line_1: pendingProfile.address_line,
          zip_code: pendingProfile.address_zip,
          city: pendingProfile.address_city,
          state: pendingProfile.address_state,
          country: pendingProfile.address_country || 'BR'
        };
      }

      const response = await supabase.functions.invoke('create-pagarme-checkout', { body });

      if (response.error) {
        console.error('Erro checkout direto:', response.error);
        toast.error('Erro ao gerar pagamento. Tente novamente.');
        setShowPaymentMethodModal(false);
        endCheckout();
        return;
      }

      const { checkout_url, event_id } = response.data;
      if (typeof window !== 'undefined' && (window as any).fbq && event_id) {
        (window as any).fbq('track', 'InitiateCheckout', {}, { eventID: event_id });
      }
      if (checkout_url) {
        window.location.href = checkout_url;
        return;
      } else {
        toast.error('Erro ao gerar link de pagamento.');
      }
    } catch (error) {
      console.error('Erro checkout direto:', error);
      toast.error('Erro ao processar. Tente novamente.');
    }
    endCheckout();
    setShowPaymentMethodModal(false);
  };

  return <section className="py-5 md:py-10 px-4 bg-black">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
            Você vai ter acesso também a{" "}
            <span className="text-[#EF672C]">+210 vídeos animados</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg max-w-3xl mx-auto">
            Editáveis no Canva e After Effects
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
          {motions.map((motion, index) => <div key={index} className="relative cursor-pointer group" onClick={() => setSelectedVideo(motion.video)}>
              <img src={motion.thumbnail} alt={motion.title} className="w-full h-auto rounded-xl shadow-lg" loading="lazy" />
              <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                <div className="bg-[#EF672C] p-3 md:p-4 rounded-full shadow-lg">
                  <Play className="w-6 h-6 md:w-8 md:h-8 text-white fill-white" />
                </div>
              </div>
            </div>)}
        </div>
        
        <div className="text-center mt-8 md:mt-10">
          <button 
            onClick={handlePurchase}
            disabled={isCheckoutSubmitting}
            className="bg-gradient-to-r from-[#EF672C] to-[#f65928] text-white font-bold text-sm md:text-lg px-6 md:px-8 py-2.5 md:py-3.5 rounded-lg shadow-lg shadow-orange-500/30 hover:scale-105 transition-transform duration-300 mb-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCheckoutSubmitting ? "PROCESSANDO..." : "QUERO ESSAS ARTES AGORA!"}
          </button>
          
          <div className="flex flex-wrap justify-center items-center gap-4 mt-2 mb-12">
            <img src="https://voxvisual.com.br/wp-content/uploads/2025/11/greenn-compra-segura.png" alt="Greenn Compra Segura" className="h-5 md:h-6 object-contain" />
          </div>
        </div>
      </div>
      
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="w-[280px] md:w-[320px] bg-transparent border-none p-0 shadow-none [&>button:last-child]:hidden">
          <VisuallyHidden>
            <DialogTitle>Vídeo do Motion</DialogTitle>
          </VisuallyHidden>
          {selectedVideo && <div className="relative">
              <button onClick={() => setSelectedVideo(null)} className="absolute -right-3 -top-3 z-50 bg-gradient-to-r from-[#EF672C] to-[#f65928] hover:from-[#f65928] hover:to-[#EF672C] p-2.5 rounded-full transition-all shadow-lg shadow-black/50">
                <X className="w-5 h-5 text-white" />
              </button>
              <div className="rounded-2xl overflow-hidden border-2 border-[#EF672C]/60 shadow-2xl shadow-orange-500/30">
                <div className="w-full aspect-[9/16] bg-black">
                  <video src={selectedVideo} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                </div>
              </div>
            </div>}
        </DialogContent>
      </Dialog>

      <PreCheckoutModal
        isOpen={showPreCheckout}
        onClose={() => setShowPreCheckout(false)}
        productSlug={PRODUCT_SLUG}
      />

      <PaymentMethodModal
        open={showPaymentMethodModal}
        onOpenChange={setShowPaymentMethodModal}
        onSelect={handlePaymentMethodSelected}
        isProcessing={isCheckoutSubmitting}
        colorScheme="orange"
      />
    </section>;
};
