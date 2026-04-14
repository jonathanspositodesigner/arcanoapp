import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const Seedance2PromoBanner = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("prompts");

  return (
    <div className="mb-6 sm:mb-8 relative w-full rounded-2xl overflow-hidden border border-white/10">
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/5]">
        <video className="absolute inset-0 w-full h-full object-cover" autoPlay loop muted playsInline>
          <source src="/videos/seedance2-promo.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 flex items-end sm:items-center">
          <div className="p-4 sm:p-10 lg:p-14 w-full sm:max-w-xl">
            <h2 className="text-base sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-4 leading-tight">
              {t('banner.upscalerTitle')}
            </h2>
            <p className="text-[10px] sm:text-sm lg:text-base text-white/80 mb-3 sm:mb-8 leading-relaxed">
              {t('banner.upscalerDescription')}
            </p>
            <div className="flex flex-row items-center gap-3 sm:gap-4">
              <Button onClick={() => navigate("/seedance2")} className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm px-4 py-2 sm:px-8 sm:py-6 text-xs sm:text-base font-semibold rounded-lg transition-all hover:scale-105">
                {t('banner.buyNow')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Seedance2PromoBanner;
