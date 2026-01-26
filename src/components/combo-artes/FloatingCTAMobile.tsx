export const FloatingCTAMobile = () => {
  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent md:hidden z-50">
      <div className="text-center mb-2">
        <span className="text-gray-400 text-xs">
          Esta oferta é válida por tempo limitado!
        </span>
      </div>
      <button
        onClick={scrollToPricing}
        className="w-full bg-gradient-to-r from-[#EF672C] to-[#f65928] text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/25 active:scale-95 transition-transform"
      >
        DESBLOQUEAR ACESSO AGORA
      </button>
    </div>
  );
};
