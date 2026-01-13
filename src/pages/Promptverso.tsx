import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Library, Users, Download, ExternalLink } from "lucide-react";
import { useState } from "react";
import logoHorizontal from "@/assets/logo_horizontal.png";
import baaIcon from "@/assets/BAA.png";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Promptverso = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('prompts');
  const [showBAAModal, setShowBAAModal] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary px-4 py-6">
      <div className="text-center space-y-6 sm:space-y-8 w-full max-w-2xl">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex justify-center">
            <img src={logoHorizontal} alt="ArcanoApp" className="h-8 sm:h-10 w-auto" />
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent px-2">
            {t('promptverso.title')}
          </h1>
          <p className="text-base sm:text-xl text-foreground mx-auto text-center px-2">
            {t('promptverso.subtitle')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-2">
          <Button onClick={() => navigate("/biblioteca-prompts")} size="lg" className="bg-gradient-primary hover:opacity-90 transition-all text-sm sm:text-lg px-6 sm:px-8 py-5 sm:py-6 shadow-hover hover:scale-105 w-full sm:w-auto">
            <Library className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
            {t('promptverso.accessPrompts')}
          </Button>

          <Button onClick={() => navigate("/contribuir")} size="lg" variant="secondary" className="transition-all text-sm sm:text-lg px-6 sm:px-8 py-5 sm:py-6 hover:scale-105 border-solid border-primary border-2 w-full sm:w-auto">
            <Users className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
            {t('promptverso.contributeWithCommunity')}
          </Button>

          <Button onClick={() => navigate("/install-app")} size="lg" variant="outline" className="transition-all text-sm sm:text-lg px-6 sm:px-8 py-5 sm:py-6 hover:scale-105 border-primary/50 hover:border-primary text-primary hover:bg-primary/5 w-full sm:w-auto">
            <Download className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
            {t('promptverso.installApp')}
          </Button>
        </div>

        {/* Seção separada - Biblioteca de Artes Arcanas */}
        <div className="mt-10 sm:mt-14 pt-6 sm:pt-8 border-t border-border/30">
          <Button onClick={() => setShowBAAModal(true)} size="lg" className="transition-all text-sm sm:text-lg px-6 sm:px-8 py-5 sm:py-6 hover:scale-105 w-full sm:w-auto bg-primary-foreground border-primary text-primary border-2 hover:text-white hover:bg-primary">
            <img alt="" className="mr-2 h-6 sm:h-7 w-auto object-contain" src="/lovable-uploads/53db2877-63c8-4fb8-bbf3-4aa471ca6154.png" />
            {t('promptverso.accessArtesLibrary')}
          </Button>
          <p className="text-muted-foreground text-xs sm:text-sm mt-2">
            {t('promptverso.artesEditableDesc')}
          </p>
        </div>

        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-2 justify-center items-center">
          <Button onClick={() => navigate("/admin-login")} variant="link" className="text-muted-foreground hover:text-foreground text-sm sm:text-base">
            {t('promptverso.adminSubmission')}
          </Button>
          <span className="hidden sm:inline text-muted-foreground">•</span>
          <Button onClick={() => navigate("/parceiro-login")} variant="link" className="text-muted-foreground hover:text-foreground text-sm sm:text-base">
            {t('promptverso.partnerArea')}
          </Button>
        </div>
      </div>

      {/* Modal Biblioteca de Artes Arcanas */}
      <Dialog open={showBAAModal} onOpenChange={setShowBAAModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center flex flex-col items-center gap-3">
              <img src={baaIcon} alt="Biblioteca de Artes Arcanas" className="h-16 w-auto" />
              {t('promptverso.modal.title')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button onClick={() => window.open("https://blibliotecadeartesarcanas.greenn.club/", "_blank")} className="bg-[#2d4a5e] hover:bg-[#3a5d74] py-6">
              <ExternalLink className="mr-2 h-5 w-5" />
              {t('promptverso.modal.alreadyMember')}
            </Button>
            <Button onClick={() => window.open("https://voxvisual.com.br/linksbio/", "_blank")} variant="outline" className="border-[#2d4a5e] text-[#2d4a5e] hover:bg-[#2d4a5e]/10 py-6">
              <ExternalLink className="mr-2 h-5 w-5" />
              {t('promptverso.modal.knowPacks')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Promptverso;