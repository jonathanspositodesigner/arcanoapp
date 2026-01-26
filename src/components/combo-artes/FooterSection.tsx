export const FooterSection = () => {
  return (
    <footer className="py-8 px-4 bg-black border-t border-white/10">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-gray-400 text-sm mb-2">
          Jonathan Christian Spósito Santos
        </p>
        <p className="text-gray-500 text-xs mb-4">
          CNPJ: 56.413.822/0001-59
        </p>
        <p className="text-gray-600 text-xs">
          Todos os direitos reservados © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
};
