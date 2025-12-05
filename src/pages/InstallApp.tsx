import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Download, Smartphone, Monitor, Share, Plus, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoHorizontal from "@/assets/logo_horizontal.png";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallApp = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

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
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="text-center mb-8">
          <img src={logoHorizontal} alt="Arcano Lab" className="h-16 w-auto mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Instale o Arcano Lab
          </h1>
          <p className="text-muted-foreground">
            Tenha acesso rápido ao app direto da sua tela inicial
          </p>
        </div>

        {isInstalled ? (
          <Card className="p-8 text-center">
            <div className="p-4 bg-green-500 rounded-full w-fit mx-auto mb-4">
              <Download className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              App já instalado!
            </h2>
            <p className="text-muted-foreground mb-4">
              O Arcano Lab já está instalado no seu dispositivo. Procure o ícone na sua tela inicial.
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
              Instalar Arcano Lab
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {isIOS ? (
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-primary rounded-full flex-shrink-0">
                    <Smartphone className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-3">
                      No iPhone/iPad
                    </h3>
                    <ol className="space-y-3 text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                        Toque no botão <Share className="inline h-4 w-4 mx-1" /> Compartilhar na barra do Safari
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                        Role e toque em <Plus className="inline h-4 w-4 mx-1" /> "Adicionar à Tela de Início"
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                        Toque em "Adicionar" no canto superior direito
                      </li>
                    </ol>
                  </div>
                </div>
              </Card>
            ) : (
              <>
                <Card className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-primary rounded-full flex-shrink-0">
                      <Smartphone className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-3">
                        No Android
                      </h3>
                      <ol className="space-y-3 text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                          Toque no menu <MoreVertical className="inline h-4 w-4 mx-1" /> (três pontos) do Chrome
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                          Toque em "Instalar app" ou "Adicionar à tela inicial"
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                          Confirme a instalação
                        </li>
                      </ol>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-500 rounded-full flex-shrink-0">
                      <Monitor className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-3">
                        No Computador
                      </h3>
                      <ol className="space-y-3 text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                          No Chrome, clique no ícone de instalação <Download className="inline h-4 w-4 mx-1" /> na barra de endereço
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                          Ou clique no menu (três pontos) e depois "Instalar Arcano Lab"
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                          Confirme a instalação
                        </li>
                      </ol>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Após instalar, o app abrirá em tela cheia e funcionará mesmo offline!
          </p>
        </div>
      </div>
    </div>
  );
};

export default InstallApp;
