import { MessageCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

export const WhatsAppCTA = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const handleWhatsAppClick = () => {
    // Replace with actual WhatsApp group link
    window.open("https://chat.whatsapp.com/XXXXXXXXX", "_blank");
  };

  return (
    <section className="py-16 bg-gradient-to-r from-green-900/20 via-zinc-900 to-green-900/20">
      <div className="container mx-auto px-4">
        <div 
          ref={ref}
          className={`max-w-3xl mx-auto text-center transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Users className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-medium">+500 membros na comunidade</span>
          </div>
          
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Entre para nossa{" "}
            <span className="text-green-400">Comunidade no WhatsApp</span>
          </h2>
          
          <p className="text-zinc-400 mb-8">
            Grupo exclusivo para clientes com dicas, novidades e suporte direto
          </p>
          
          <Button
            size="lg"
            onClick={handleWhatsAppClick}
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-6 text-lg rounded-xl shadow-lg shadow-green-500/25 transition-all hover:scale-105"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Entrar na Comunidade
          </Button>
        </div>
      </div>
    </section>
  );
};
