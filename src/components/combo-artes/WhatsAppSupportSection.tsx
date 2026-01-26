import { MessageCircle } from "lucide-react";

export const WhatsAppSupportSection = () => {
  const whatsappNumber = "5533988819891";
  const message = encodeURIComponent(
    "Olá! Tenho dúvidas sobre o Pack Biblioteca de Artes Arcanas - Combo 3 em 1"
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-black to-[#0a0505]">
      <div className="max-w-2xl mx-auto text-center">
        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
          Ainda tem dúvidas?
        </h2>
        <p className="text-gray-400 mb-8">
          Fale diretamente comigo pelo WhatsApp
        </p>
        
        {/* WhatsApp button */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-lg px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-green-500/30"
        >
          <MessageCircle className="w-6 h-6" />
          CHAMAR NO WHATSAPP
        </a>
      </div>
    </section>
  );
};
