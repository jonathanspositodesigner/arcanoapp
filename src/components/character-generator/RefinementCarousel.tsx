import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface RefinementHistoryItem {
  url: string;
  label: string;
  timestamp: number;
}

interface RefinementCarouselProps {
  history: RefinementHistoryItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const RefinementCarousel: React.FC<RefinementCarouselProps> = ({ history, selectedIndex, onSelect }) => {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const checkScroll = React.useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  React.useEffect(() => {
    checkScroll();
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      return () => el.removeEventListener('scroll', checkScroll);
    }
  }, [checkScroll, history.length]);

  // Auto-scroll to selected item
  React.useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const child = el.children[selectedIndex] as HTMLElement | undefined;
    if (child) {
      child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedIndex]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === 'left' ? -120 : 120, behavior: 'smooth' });
  };

  if (history.length <= 1) return null;

  return (
    <div className="relative px-1 py-2">
      <p className="text-[10px] text-purple-300/70 mb-1.5 px-1">Histórico de versões</p>
      <div className="relative flex items-center">
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 z-10 w-6 h-6 flex items-center justify-center bg-purple-900/80 border border-purple-500/30 rounded-full text-purple-300 hover:text-white hover:bg-purple-800 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}

        <div
          ref={scrollContainerRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide px-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {history.map((item, index) => (
            <button
              key={item.timestamp}
              onClick={() => onSelect(index)}
              className={cn(
                "flex-shrink-0 flex flex-col items-center gap-1 transition-all",
                "focus:outline-none"
              )}
            >
              <div
                className={cn(
                  "w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                  index === selectedIndex
                    ? "border-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.4)]"
                    : "border-purple-500/30 hover:border-purple-400/50"
                )}
              >
                <img
                  src={item.url}
                  alt={item.label}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>
              <span className={cn(
                "text-[9px] font-medium max-w-[64px] truncate",
                index === selectedIndex ? "text-fuchsia-400" : "text-purple-400"
              )}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 z-10 w-6 h-6 flex items-center justify-center bg-purple-900/80 border border-purple-500/30 rounded-full text-purple-300 hover:text-white hover:bg-purple-800 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default RefinementCarousel;
