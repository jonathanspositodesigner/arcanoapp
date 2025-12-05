import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Library, Users, Download } from "lucide-react";
import logoHorizontal from "@/assets/logo_horizontal.png";

const Index = () => {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary">
      <div className="text-center space-y-8 p-8">
        <div className="space-y-4">
          <div className="flex justify-center">
            <img src={logoHorizontal} alt="Arcano Lab" className="h-20 w-auto" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            A plataforma dos criadores do futuro
          </h1>
          <p className="text-xl text-foreground max-w-2xl mx-auto text-center">
            Descubra uma coleção incrível de prompts para criar selos e elementos 3D profissionais
          </p>
        </div>

        <div className="flex gap-4 justify-center flex-wrap">
          <Button
            onClick={() => navigate("/biblioteca-prompts")}
            size="lg"
            className="bg-gradient-primary hover:opacity-90 transition-all text-lg px-8 py-6 shadow-hover hover:scale-105"
          >
            <Library className="mr-2 h-6 w-6" />
            Acessar Biblioteca
          </Button>

          <Button
            onClick={() => navigate("/contribuir")}
            size="lg"
            variant="secondary"
            className="transition-all text-lg px-8 py-6 hover:scale-105 border-solid border-primary border-2"
          >
            <Users className="mr-2 h-6 w-6" />
            Contribua com a Comunidade Arcana
          </Button>
        </div>

        <div className="flex flex-col items-center gap-2 mt-8">
          <Button
            onClick={() => navigate("/install")}
            variant="outline"
            className="text-primary hover:text-primary border-primary/30 hover:border-primary hover:bg-primary/5"
          >
            <Download className="mr-2 h-4 w-4" />
            Instalar App
          </Button>
          
          <Button
            onClick={() => navigate("/admin-login")}
            variant="link"
            className="text-muted-foreground hover:text-foreground"
          >
            Envio de administrador
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
