import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation('library');
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
          {t('install.back')}
        </Button>

        {isInstalled ? (
          <Card className="p-8 text-center">
            <div className="p-4 bg-green-500 rounded-full w-fit mx-auto mb-4">
              <Download className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {t('install.alreadyInstalled')}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t('install.alreadyInstalledDescription')}
            </p>
            <Button onClick={() => navigate("/biblioteca-prompts")} className="bg-gradient-primary">
              {t('install.goToLibrary')}
            </Button>
          </Card>
        ) : deferredPrompt ? (
          <Card className="p-8 text-center">
            <div className="p-4 bg-gradient-primary rounded-full w-fit mx-auto mb-4">
              <Download className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {t('install.installNow')}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t('install.installDescription')}
            </p>
            <Button onClick={handleInstall} size="lg" className="bg-gradient-primary hover:opacity-90 text-lg px-8">
              <Download className="mr-2 h-5 w-5" />
              {t('install.installButton')}
            </Button>
          </Card>
        ) : (
          <InstallTutorialInteractive />
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            {t('install.afterInstall')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default InstallApp;
