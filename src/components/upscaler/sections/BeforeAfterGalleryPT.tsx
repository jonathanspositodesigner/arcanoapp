import { useTranslation } from "react-i18next";
import { LazyBeforeAfterSlider } from "../LazyBeforeAfterSlider";

// Image paths - these are string references, not imports
// Images will only load when LazyBeforeAfterSlider detects they're in viewport
import upscalerFotoAntes from "@/assets/upscaler-foto-antes.webp";
import upscalerFotoDepois from "@/assets/upscaler-foto-depois.webp";
import upscalerSeloAntes from "@/assets/upscaler-selo-antes.webp";
import upscalerSeloDepois from "@/assets/upscaler-selo-depois.webp";
import upscalerLogoAntes from "@/assets/upscaler-logo-antes.webp";
import upscalerLogoDepois from "@/assets/upscaler-logo-depois.webp";
import upscalerProdutoAntes from "@/assets/upscaler-produto-antes.webp";
import upscalerProdutoDepois from "@/assets/upscaler-produto-depois.webp";
import upscalerAntigaAntes from "@/assets/upscaler-antiga-antes.webp";
import upscalerAntigaDepois from "@/assets/upscaler-antiga-depois.jpg";
import upscalerFoodAntes from "@/assets/upscaler-food-antes.webp";
import upscalerFoodDepois from "@/assets/upscaler-food-depois.webp";

interface BeforeAfterGalleryPTProps {
  onZoomClick: (before: string, after: string) => void;
  isMobile?: boolean;
}

export const BeforeAfterGalleryPT = ({ onZoomClick, isMobile = false }: BeforeAfterGalleryPTProps) => {
  const { t } = useTranslation();

  const beforeAfterExamples = [
    {
      before: isMobile ? "/images/upscaler-foto-antes-mobile.webp" : upscalerFotoAntes,
      after: isMobile ? "/images/upscaler-foto-depois-mobile.webp" : upscalerFotoDepois,
      label: t('tools:upscaler.beforeAfter.photoImproved4K'),
      badge: "Fotos de Ensaio",
      badgeColor: "from-fuchsia-500 to-pink-500",
      aspectRatio: "1/1"
    },
    {
      before: isMobile ? "/images/upscaler-selo-antes-mobile.webp" : upscalerSeloAntes,
      after: isMobile ? "/images/upscaler-selo-depois-mobile.webp" : upscalerSeloDepois,
      label: t('tools:upscaler.beforeAfter.seal3DHD'),
      badge: "Selos e Render 3D",
      badgeColor: "from-purple-500 to-violet-600",
      aspectRatio: "1/1"
    },
    {
      before: isMobile ? "/images/upscaler-logo-antes-mobile.webp" : upscalerLogoAntes,
      after: isMobile ? "/images/upscaler-logo-depois-mobile.webp" : upscalerLogoDepois,
      label: t('tools:upscaler.beforeAfter.logoHD'),
      badge: "Logo",
      badgeColor: "from-blue-500 to-cyan-500",
      aspectRatio: "1/1"
    },
    {
      before: isMobile ? "/images/upscaler-produto-antes-mobile.webp" : upscalerProdutoAntes,
      after: isMobile ? "/images/upscaler-produto-depois-mobile.webp" : upscalerProdutoDepois,
      label: t('tools:upscaler.beforeAfter.mockupSharp'),
      badge: "Fotos de Produto",
      badgeColor: "from-emerald-500 to-green-500",
      aspectRatio: "1/1"
    },
    {
      before: isMobile ? "/images/upscaler-antiga-antes-mobile.webp" : upscalerAntigaAntes,
      after: isMobile ? "/images/upscaler-antiga-depois-mobile.webp" : upscalerAntigaDepois,
      label: t('tools:upscaler.beforeAfter.oldPhotoRestored'),
      badge: "Foto Antiga",
      badgeColor: "from-amber-500 to-orange-500",
      aspectRatio: "1/1"
    },
    {
      before: isMobile ? "/images/upscaler-food-antes-mobile.webp" : upscalerFoodAntes,
      after: isMobile ? "/images/upscaler-food-depois-mobile.webp" : upscalerFoodDepois,
      label: t('tools:upscaler.beforeAfter.foodPhotos'),
      badge: "Foto de Alimento",
      badgeColor: "from-red-500 to-orange-500",
      aspectRatio: "1/1"
    }
  ];

  return (
    <section className="px-3 md:px-4 py-16 md:py-20 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-500/5 via-purple-500/5 to-transparent pointer-events-none" />
      
      <div className="max-w-6xl mx-auto relative">
        <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white text-center mb-3 md:mb-4">
          {t('tools:upscaler.beforeAfter.title')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-500">{t('tools:upscaler.beforeAfter.anyImage')}</span>
        </h2>
        <p className="text-white/60 text-center text-sm md:text-lg mb-10 md:mb-14 max-w-2xl mx-auto">
          {t('tools:upscaler.beforeAfter.subtitle')}
        </p>
        
        {/* Grid 3x2: 3 cards por linha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
          {beforeAfterExamples.map((example, index) => (
            <LazyBeforeAfterSlider
              key={index}
              beforeImage={example.before}
              afterImage={example.after}
              label={example.label}
              badge={example.badge}
              badgeColor={example.badgeColor}
              aspectRatio={example.aspectRatio}
              locale="pt"
              onZoomClick={() => onZoomClick(example.before, example.after)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default BeforeAfterGalleryPT;
