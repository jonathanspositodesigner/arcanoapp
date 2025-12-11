import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import InstallTutorialInteractive from "@/components/InstallTutorialInteractive";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallApp = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      <div className="container max-w-2xl mx-auto py-4 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        {isInstalled ? (
          <Card className="p-8 text-center">
            <div className="p-4 bg-green-500 rounded-full w-fit mx-auto mb-4">
              <Download className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              App já instalado!
            </h2>
            <p className="text-muted-foreground mb-4">
              O ArcanoApp já está instalado no seu dispositivo. Procure o ícone na sua tela inicial.
            </p>
            <Button onClick={() => navigate("/biblioteca-prompts")} className="bg-gradient-primary">
              Ir para Biblioteca
            </Button>
          </Card>
        ) : deferredPrompt ? (
          <Card className="p-8 text-center">
            <div className="p-4 bg-gradient-primary rounded-full w-fit mx-auto mb-4">
              <Download className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Instalar agora
            </h2>
            <p className="text-muted-foreground mb-6">
              Clique no botão abaixo para instalar o app no seu dispositivo
            </p>
            <Button onClick={handleInstall} size="lg" className="bg-gradient-primary hover:opacity-90 text-lg px-8">
              <Download className="mr-2 h-5 w-5" />
              Instalar ArcanoApp
            </Button>
          </Card>
        ) : (
          <InstallTutorialInteractive />
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Após instalar, o app abrirá em tela cheia e funcionará mesmo offline!
          </p>
        </div>
      </div>
    </div>
  );
};

export default InstallApp;
