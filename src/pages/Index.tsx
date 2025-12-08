import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import baaIcon from "@/assets/BAA.png";
import logoHorizontal from "@/assets/logo_horizontal.png";
import arcanoLabLogo from "@/assets/arcanolab_logo.png";
const Index = () => {
  const navigate = useNavigate();
  const [showBAAModal, setShowBAAModal] = useState(false);
  return <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex flex-col items-center justify-center px-4 py-8">
      {/* Logo */}
      <img alt="Arcano Lab" className="h-7 sm:h-8 mb-4" src="/lovable-uploads/c730fa96-d2c9-48f7-8bbb-f5fd02378698.png" />
      
      {/* Título */}
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-8 sm:mb-12 text-center">
        A plataforma dos criadores do futuro!
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 w-full max-w-3xl">
        {/* Card - Biblioteca de Artes Arcanas */}
        <div onClick={() => setShowBAAModal(true)} className="group cursor-pointer bg-card border border-border rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-primary/50">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mb-4 sm:mb-6 flex items-center justify-center">
            <img alt="Biblioteca de Artes Arcanas" className="w-full h-full object-contain" src="/lovable-uploads/0b5816a1-fee5-45f1-906e-9f7952d9b4e3.png" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
            Biblioteca de Artes Arcanas
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">Artes editáveis PSD e Canva para eventos e Artistas</p>
        </div>

        {/* Card - Biblioteca de Prompts IA */}
        <div onClick={() => navigate("/biblioteca-prompts")} className="group cursor-pointer bg-card border border-border rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-primary/50">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mb-4 sm:mb-6 flex items-center justify-center">
            <img alt="Biblioteca de Prompts IA" className="w-full h-full object-contain" src="/lovable-uploads/c7d0b526-a28d-43a4-8f43-9654f93029e5.png" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
            Biblioteca de Prompts IA
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Prompts para criar selos e elementos 3D profissionais
          </p>
        </div>
      </div>

      {/* Modal Biblioteca de Artes Arcanas */}
      <Dialog open={showBAAModal} onOpenChange={setShowBAAModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center flex flex-col items-center gap-3">
              <img src={baaIcon} alt="Biblioteca de Artes Arcanas" className="h-16 w-auto" />
              Biblioteca de Artes Arcanas
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button onClick={() => window.open("https://blibliotecadeartesarcanas.greenn.club/", "_blank")} className="bg-[#2d4a5e] hover:bg-[#3a5d74] py-6">
              <ExternalLink className="mr-2 h-5 w-5" />
              Já sou membro
            </Button>
            <Button onClick={() => window.open("https://voxvisual.com.br/linksbio/", "_blank")} variant="outline" className="border-[#2d4a5e] text-[#2d4a5e] hover:bg-[#2d4a5e]/10 py-6">
              <ExternalLink className="mr-2 h-5 w-5" />
              Conhecer os nossos packs
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};
export default Index;