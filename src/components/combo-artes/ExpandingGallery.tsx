import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface GalleryItem {
  imageUrl: string;
  label: string;
}

interface ExpandingGalleryProps {
  items: GalleryItem[];
}

const ExpandingGallery = ({ items }: ExpandingGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(Math.floor(items.length / 2));

  const handlePrev = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="relative">
      {/* Navigation arrows */}
      <div className="flex justify-end gap-2 mb-4">
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

      {/* Gallery container */}
      <div className="flex gap-2 h-[400px] md:h-[500px] lg:h-[600px]">
        {items.map((item, index) => {
          const isActive = index === activeIndex;

          return (
            <div
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`relative overflow-hidden rounded-xl transition-all duration-500 ease-in-out ${
                isActive
                  ? "flex-[6] grayscale-0"
                  : "flex-[0.6] md:flex-[0.8] grayscale brightness-50 hover:flex-[1] md:hover:flex-[1.2] cursor-pointer"
              }`}
            >
              <img
                src={item.imageUrl}
                alt={item.label}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />

              {/* Active overlay with label */}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent">
                  <div className="absolute bottom-6 left-6 right-6">
                    <span className="inline-block px-3 py-1 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300 text-xs font-medium tracking-wider uppercase mb-2">
                      Imagem gerada com Arcano Cloner
                    </span>
                    <h3 className="text-white font-semibold text-lg md:text-xl">
                      {item.label}
                    </h3>
                  </div>
                </div>
              )}

              {/* Inactive overlay with vertical label */}
              {!isActive && (
                <div className="absolute inset-0 bg-black/20 flex items-end justify-center pb-4">
                  <span className="text-white/70 text-xs font-medium [writing-mode:vertical-lr] rotate-180 tracking-widest uppercase">
                    {item.label}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExpandingGallery;
