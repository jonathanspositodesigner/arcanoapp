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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0D0221] to-[#1A0A2E] px-4 py-6">
      <div className="text-center space-y-6 sm:space-y-8 w-full max-w-2xl">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex justify-center">
            <img src={logoHorizontal} alt="ArcanoApp" className="h-8 sm:h-10 w-auto" />
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent px-2">
            {t('promptverso.title')}
          </h1>
          <p className="text-base sm:text-xl text-purple-200 mx-auto text-center px-2">
            {t('promptverso.subtitle')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-2">
          <Button onClick={() => navigate("/biblioteca-prompts")} size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 transition-all text-sm sm:text-lg px-6 sm:px-8 py-5 sm:py-6 shadow-lg shadow-purple-500/20 hover:scale-105 w-full sm:w-auto text-white">
            <Library className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
            {t('promptverso.accessPrompts')}
          </Button>

          <Button onClick={() => navigate("/contribuir")} size="lg" variant="outline" className="transition-all text-sm sm:text-lg px-6 sm:px-8 py-5 sm:py-6 hover:scale-105 border-purple-500 text-purple-300 hover:bg-purple-500/20 hover:text-white w-full sm:w-auto">
            <Users className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
            {t('promptverso.contributeWithCommunity')}
          </Button>

          <Button onClick={() => navigate("/install-app")} size="lg" variant="outline" className="transition-all text-sm sm:text-lg px-6 sm:px-8 py-5 sm:py-6 hover:scale-105 border-purple-500/50 hover:border-purple-400 text-purple-300 hover:bg-purple-500/10 w-full sm:w-auto">
            <Download className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
            {t('promptverso.installApp')}
          </Button>
        </div>

        {/* Seção separada - Biblioteca de Artes Arcanas */}
        <div className="mt-10 sm:mt-14 pt-6 sm:pt-8 border-t border-purple-500/20">
          <Button onClick={() => setShowBAAModal(true)} size="lg" className="transition-all text-sm sm:text-lg px-6 sm:px-8 py-5 sm:py-6 hover:scale-105 w-full sm:w-auto bg-[#1A0A2E] border-purple-500 text-purple-300 border-2 hover:text-white hover:bg-purple-500/20">
            <img alt="" className="mr-2 h-6 sm:h-7 w-auto object-contain" src="/lovable-uploads/53db2877-63c8-4fb8-bbf3-4aa471ca6154.png" />
            {t('promptverso.accessArtesLibrary')}
          </Button>
          <p className="text-purple-400 text-xs sm:text-sm mt-2">
            {t('promptverso.artesEditableDesc')}
          </p>
        </div>

        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-2 justify-center items-center">
          <Button onClick={() => navigate("/admin-login")} variant="link" className="text-purple-400 hover:text-purple-300 text-sm sm:text-base">
            {t('promptverso.adminSubmission')}
          </Button>
          <span className="hidden sm:inline text-purple-500">•</span>
          <Button onClick={() => navigate("/parceiro-login")} variant="link" className="text-purple-400 hover:text-purple-300 text-sm sm:text-base">
            {t('promptverso.partnerArea')}
          </Button>
        </div>
      </div>

      {/* Modal Biblioteca de Artes Arcanas */}
      <Dialog open={showBAAModal} onOpenChange={setShowBAAModal}>
        <DialogContent className="sm:max-w-md bg-[#1A0A2E] border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="text-center flex flex-col items-center gap-3 text-white">
              <img src={baaIcon} alt="Biblioteca de Artes Arcanas" className="h-16 w-auto" />
              {t('promptverso.modal.title')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button onClick={() => window.open("https://blibliotecadeartesarcanas.greenn.club/", "_blank")} className="bg-purple-600 hover:bg-purple-700 py-6 text-white">
              <ExternalLink className="mr-2 h-5 w-5" />
              {t('promptverso.modal.alreadyMember')}
            </Button>
            <Button onClick={() => window.open("https://voxvisual.com.br/linksbio/", "_blank")} variant="outline" className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:text-white py-6">
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
