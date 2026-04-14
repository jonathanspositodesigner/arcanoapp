import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BeforeAfterSlider } from "@/components/upscaler/BeforeAfterSlider";

interface GalleryItem {
  imageUrl?: string;
  beforeImage?: string;
  afterImage?: string;
  label?: string;
}

interface ExpandingGalleryProps {
  items: GalleryItem[];
  badgeText?: string;
}

const ExpandingGallery = ({ items, badgeText = "Feito com o Arcano Cloner" }: ExpandingGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(3);
  const [mobileIndex, setMobileIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  };

  const handleMobilePrev = () => {
    setMobileIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  };

  const handleMobileNext = () => {
    setMobileIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) handleMobileNext();
      else handleMobilePrev();
    }
    touchStartX.current = null;
  };

  const hasBeforeAfter = (item: GalleryItem) => Boolean(item.beforeImage && item.afterImage);

  const getPreviewImage = (item: GalleryItem) => item.afterImage || item.imageUrl || item.beforeImage || "";

  const currentMobileItem = items[mobileIndex];
  const canSwipeMobile = currentMobileItem ? !hasBeforeAfter(currentMobileItem) : true;

  return (
    <div className="relative">
      {/* Desktop navigation arrows */}
      <div className="hidden md:flex justify-end gap-2 mb-4">
        <button
          onClick={handlePrev}
          className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/10 transition-colors"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={handleNext}
          className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/10 transition-colors"
          aria-label="Próximo"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile carousel - 3:5 ratio */}
      <div className="md:hidden relative">
        <div
          className="overflow-hidden rounded-xl"
          onTouchStart={canSwipeMobile ? handleTouchStart : undefined}
          onTouchEnd={canSwipeMobile ? handleTouchEnd : undefined}
        >
          {/* aspect ratio 3:5 = padding-top: 166.67% */}
          <div className="relative w-full" style={{ paddingTop: "166.67%" }}>
            {items.map((item, index) => {
              // Only render active, previous and next slides to avoid loading all images
              const isAdjacent =
                index === mobileIndex ||
                index === (mobileIndex - 1 + items.length) % items.length ||
                index === (mobileIndex + 1) % items.length;

              const previewImage = getPreviewImage(item);
              const itemHasBeforeAfter = hasBeforeAfter(item);

              if (!isAdjacent || !previewImage) return null;

              return (
                <div
                  key={index}
                  className="absolute inset-0 transition-opacity duration-500"
                  style={{ opacity: index === mobileIndex ? 1 : 0, pointerEvents: index === mobileIndex ? "auto" : "none" }}
                >
                  {itemHasBeforeAfter ? (
                    <div className="absolute inset-0 [&>div]:h-full [&>div]:space-y-0 [&>div>div]:h-full">
                      <BeforeAfterSlider
                        beforeImage={item.beforeImage!}
                        afterImage={item.afterImage!}
                        locale="pt"
                        aspectRatio="3/5"
                        compact
                      />
                    </div>
                  ) : (
                    <img
                      src={previewImage}
                      alt={item.label}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  )}

                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/70 via-transparent to-transparent">
                    <div className="absolute bottom-5 left-5 right-5">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10 text-gray-300 text-[10px] font-medium tracking-wide uppercase mb-1.5">
                        {badgeText}
                      </span>
                      {item.label && (
                        <h3 className="text-white font-semibold text-base">
                          {item.label}
                        </h3>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile nav arrows */}
        <button
          onClick={handleMobilePrev}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-white"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={handleMobileNext}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-white"
          aria-label="Próximo"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setMobileIndex(i)}
              className={`rounded-full transition-all duration-300 ${i === mobileIndex ? "w-4 h-1.5 bg-slate-400" : "w-1.5 h-1.5 bg-white/30"}`}
              aria-label={`Ir para imagem ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Desktop expanding gallery */}
      <div className="hidden md:flex gap-2 md:h-[500px] lg:h-[600px]">
        {items.map((item, index) => {
          const isActive = index === activeIndex;
          const itemHasBeforeAfter = hasBeforeAfter(item);
          const previewImage = getPreviewImage(item);

          if (!previewImage) return null;

          return (
            <div
              key={index}
              onClick={() => setActiveIndex(index)}
              className={[
                "relative overflow-hidden rounded-xl transition-all duration-500 ease-in-out",
                isActive
                  ? "flex-[6] grayscale-0"
                  : "flex-[0.8] grayscale brightness-50 hover:flex-[1.2] cursor-pointer",
              ].join(" ")}
            >
              {isActive && itemHasBeforeAfter ? (
                <div className="absolute inset-0 [&>div]:h-full [&>div]:space-y-0 [&>div>div]:h-full">
                  <BeforeAfterSlider
                    beforeImage={item.beforeImage!}
                    afterImage={item.afterImage!}
                    locale="pt"
                    aspectRatio="4/5"
                    compact
                  />
                </div>
              ) : (
                <img
                  src={previewImage}
                  alt={item.label}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              )}

              {isActive && (
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/70 via-transparent to-transparent">
                  <div className="absolute bottom-6 left-6 right-6">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10 text-gray-300 text-[10px] font-medium tracking-wide uppercase mb-1.5">
                      {badgeText}
                    </span>
                    {item.label && (
                      <h3 className="text-white font-semibold text-xl">
                        {item.label}
                      </h3>
                    )}
                  </div>
                </div>
              )}

              {!isActive && (
                <div className="absolute inset-0 bg-black/20" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExpandingGallery;
