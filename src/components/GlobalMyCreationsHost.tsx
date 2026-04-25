/**
 * GlobalMyCreationsHost — escuta o evento global "open-my-creations"
 * e abre o modal "Minhas Criações" em QUALQUER rota do app.
 *
 * Existe porque o listener anterior vivia dentro do AppTopBar, que não está
 * montado em todas as rotas (ex: páginas de ferramentas IA em tela cheia).
 * Como resultado, tocar no botão verde do FloatingJobButton apenas navegava
 * para "/" sem nunca abrir o modal. Este host resolve o problema sendo
 * renderizado uma única vez em App.tsx, fora do shell de cada página.
 */
import { useEffect, useState } from "react";
import { MyCreationsModal } from "@/components/ai-tools/creations";

const GlobalMyCreationsHost = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-my-creations", handler);
    return () => window.removeEventListener("open-my-creations", handler);
  }, []);

  return <MyCreationsModal open={open} onClose={() => setOpen(false)} />;
};

export default GlobalMyCreationsHost;