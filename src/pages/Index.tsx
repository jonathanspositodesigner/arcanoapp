import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Library, Users, Download } from "lucide-react";
import logoHorizontal from "@/assets/logo_horizontal.png";
import baaIcon from "@/assets/BAA.png";
const Index = () => {
  const navigate = useNavigate();
  return <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary px-4 py-6">
      <div className="text-center space-y-6 sm:space-y-8 w-full max-w-2xl">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex justify-center">
            <img src={logoHorizontal} alt="Arcano Lab" className="h-8 sm:h-10 w-auto" />
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent px-2">
            A plataforma dos criadores do futuro
          </h1>
          <p className="text-base sm:text-xl text-foreground mx-auto text-center px-2">
            Descubra uma coleção incrível de prompts para criar selos e elementos 3D profissionais
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-2">
          <Button onClick={() => navigate("/biblioteca-prompts")} size="lg" className="bg-gradient-primary hover:opacity-90 transition-all text-sm sm:text-lg px-6 sm:px-8 py-5 sm:py-6 shadow-hover hover:scale-105 w-full sm:w-auto">
            <Library className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
            Acessar Prompts      
          </Button>

          <Button onClick={() => navigate("/contribuir")} size="lg" variant="secondary" className="transition-all text-sm sm:text-lg px-6 sm:px-8 py-5 sm:py-6 hover:scale-105 border-solid border-primary border-2 w-full sm:w-auto">
            <Users className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
            Contribua com a Comunidade
          </Button>

          <Button onClick={() => navigate("/install")} size="lg" variant="outline" className="transition-all text-sm sm:text-lg px-6 sm:px-8 py-5 sm:py-6 hover:scale-105 border-primary/50 hover:border-primary text-primary hover:bg-primary/5 w-full sm:w-auto">
            <Download className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
            Instalar App
          </Button>
        </div>

        {/* Seção separada - Biblioteca de Artes Arcanas */}
        <div className="mt-10 sm:mt-14 pt-6 sm:pt-8 border-t border-border/30">
          <Button 
            onClick={() => window.open("https://artesarcanas.com", "_blank")} 
            size="lg" 
            className="bg-[#2d4a5e] hover:bg-[#3a5d74] transition-all text-sm sm:text-lg px-6 sm:px-8 py-5 sm:py-6 hover:scale-105 w-full sm:w-auto"
          >
            <img src={baaIcon} alt="" className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
            Acessar Biblioteca de Artes Arcanas
          </Button>
          <p className="text-muted-foreground text-xs sm:text-sm mt-2">
            Artes editáveis psd e canva para eventos
          </p>
        </div>

        <div className="mt-6 sm:mt-8">
          <Button onClick={() => navigate("/admin-login")} variant="link" className="text-muted-foreground hover:text-foreground text-sm sm:text-base">
            Envio de administrador
          </Button>
        </div>
      </div>
    </div>;
};
export default Index;