import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface WhatsAppSupportButtonProps {
  whatsappNumber?: string;
  className?: string;
}

const WhatsAppSupportButton = ({ 
  whatsappNumber = "5531996821932",
  className = "" 
}: WhatsAppSupportButtonProps) => {
  const { t } = useTranslation('tools');
  
  const handleClick = () => {
    const message = encodeURIComponent(t('support.message'));
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank");
  };

  return (
    <div className={`flex flex-col items-center gap-2 py-6 ${className}`}>
      <p className="text-muted-foreground text-sm">{t('support.title')}</p>
      <Button
        onClick={handleClick}
        variant="outline"
        className="gap-2 border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950"
      >
        <MessageCircle className="h-4 w-4" />
        {t('support.button')}
      </Button>
    </div>
  );
};

export default WhatsAppSupportButton;
