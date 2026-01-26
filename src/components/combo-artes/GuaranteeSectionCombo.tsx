import { ShieldCheck } from "lucide-react";

export const GuaranteeSectionCombo = () => {
  return (
    <section className="py-16 px-4 bg-gradient-to-b from-black to-[#0a0505]">
      <div className="max-w-4xl mx-auto text-center">
        {/* Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-[#EF672C] to-[#f65928] rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30">
            <ShieldCheck className="w-12 h-12 text-white" />
          </div>
        </div>
        
        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-black text-white mb-6">
          Qual a minha garantia?
        </h2>
        
        {/* Content */}
        <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-8 md:p-12">
          <p className="text-lg md:text-xl text-gray-300 leading-relaxed mb-6">
            Você tem <span className="text-[#EF672C] font-bold">7 dias de garantia incondicional</span>. 
            Se por qualquer motivo você não ficar satisfeito com o produto, basta solicitar o reembolso 
            dentro do prazo e devolvemos 100% do seu dinheiro, sem perguntas.
          </p>
          
          <p className="text-lg md:text-xl text-gray-300 leading-relaxed mb-6">
            Isso significa que você pode testar o acesso completo à plataforma, 
            explorar todas as artes, motions, selos 3D e bônus{" "}
            <span className="text-white font-bold">sem nenhum risco</span>.
          </p>
          
          <p className="text-lg md:text-xl text-white font-bold">
            Todo o risco é nosso. Você só precisa decidir experimentar!
          </p>
        </div>
        
        {/* Badge */}
        <div className="mt-8">
          <img
            src="https://voxvisual.com.br/wp-content/uploads/2025/11/selo-garantia-7-dias.webp"
            alt="Garantia 7 dias"
            className="h-24 md:h-32 mx-auto"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
};
