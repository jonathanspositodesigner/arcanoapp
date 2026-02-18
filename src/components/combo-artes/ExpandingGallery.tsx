import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface GalleryItem {
  imageUrl: string;
  label?: string;
}

interface ExpandingGalleryProps {
  items: GalleryItem[];
}

const ExpandingGallery = ({ items }: ExpandingGalleryProps) => {
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

  return (
    <div className="relative">
      {/* Desktop navigation arrows */}
      <div className="hidden md:flex justify-end gap-2 mb-4">
        <button
          onClick={handlePrev}
          className="w-10 h-10 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-400 hover:bg-fuchsia-500/30 transition-colors"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={handleNext}
          className="w-10 h-10 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-400 hover:bg-fuchsia-500/30 transition-colors"
          aria-label="Próximo"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile carousel - 3:5 ratio */}
      <div className="md:hidden relative">
        <div
          className="overflow-hidden rounded-xl"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* aspect ratio 3:5 = padding-top: 166.67% */}
          <div className="relative w-full" style={{ paddingTop: "166.67%" }}>
            {items.map((item, index) => (
              <div
                key={index}
                className="absolute inset-0 transition-opacity duration-500"
                style={{ opacity: index === mobileIndex ? 1 : 0, pointerEvents: index === mobileIndex ? "auto" : "none" }}
              >
                <img
                  src={item.imageUrl}
                  alt={item.label}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent">
                  <div className="absolute bottom-5 left-5 right-5">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300 text-[10px] font-medium tracking-wide uppercase mb-1.5">
                      Feito com o Arcano Cloner
                    </span>
                    {item.label && (
                      <h3 className="text-white font-semibold text-base">
                        {item.label}
                      </h3>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
              className={`rounded-full transition-all duration-300 ${i === mobileIndex ? "w-4 h-1.5 bg-fuchsia-400" : "w-1.5 h-1.5 bg-white/30"}`}
              aria-label={`Ir para imagem ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Desktop expanding gallery */}
      <div className="hidden md:flex gap-2 md:h-[500px] lg:h-[600px]">
        {items.map((item, index) => {
          const isActive = index === activeIndex;

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
              <img
                src={item.imageUrl}
                alt={item.label}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />

              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent">
                  <div className="absolute bottom-6 left-6 right-6">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300 text-[10px] font-medium tracking-wide uppercase mb-1.5">
                      Feito com o Arcano Cloner
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
