import { useState } from "react";
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

  const handlePrev = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="relative">
      {/* Navigation arrows - hidden on mobile */}
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

      {/* Gallery container - vertical on mobile, horizontal on desktop */}
      <div className="flex flex-col md:flex-row gap-3 md:gap-2 md:h-[500px] lg:h-[600px]">
        {items.map((item, index) => {
          const isActive = index === activeIndex;

          return (
            <div
              key={index}
              onClick={() => setActiveIndex(index)}
              className={[
                "relative overflow-hidden rounded-xl transition-all duration-500 ease-in-out",
                // Mobile: fixed height, full width, no expanding effect
                "h-[200px] w-full",
                // Desktop: auto height, flex expanding effect
                isActive
                  ? "md:h-auto md:flex-[6] md:grayscale-0"
                  : "md:h-auto md:flex-[0.8] md:grayscale md:brightness-50 md:hover:flex-[1.2] md:cursor-pointer",
              ].join(" ")}
            >
              <img
                src={item.imageUrl}
                alt={item.label}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />

              {/* Overlay with label - always visible on mobile, only on active on desktop */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent">
                <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300 text-[10px] font-medium tracking-wide uppercase mb-1.5">
                    Arcano Cloner
                  </span>
                  {item.label && (
                    <h3 className="text-white font-semibold text-base md:text-xl">
                      {item.label}
                    </h3>
                  )}
                </div>
              </div>

              {/* Inactive overlay - only on desktop */}
              {!isActive && (
                <div className="hidden md:block absolute inset-0 bg-black/20" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExpandingGallery;
