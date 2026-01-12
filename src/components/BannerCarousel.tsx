import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Banner {
  id: string;
  title: string;
  description: string | null;
  button_text: string;
  button_link: string;
  image_url: string;
  mobile_image_url: string | null;
}

interface VideoBanner {
  id: string;
  type: 'video';
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  secondaryText: string;
  secondaryLink: string;
  desktopVideoUrl: string;
  mobileVideoUrl: string;
}

type CarouselItem = (Banner & { type?: 'image' }) | VideoBanner;

// Fixed video banner for Upscaler Arcano
const upscalerVideoBanner: VideoBanner = {
  id: 'upscaler-arcano-video',
  type: 'video',
  title: 'Upscaller Arcano',
  description: 'Deixe suas fotos em 4K com alta nitidez, riqueza de detalhes e qualidade cinematográfica',
  buttonText: 'Adquirir Agora',
  buttonLink: '/planos-upscaler-arcano',
  secondaryText: 'Já adquiriu? acesse aqui',
  secondaryLink: '/ferramentas-ia?from=artes',
  desktopVideoUrl: '/videos/upscaler-promo-desktop.mp4',
  mobileVideoUrl: '/videos/upscaler-promo-mobile.mp4',
};

const BannerCarousel = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  useEffect(() => {
    // Check screen size
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    const { data } = await supabase
      .from("artes_banners")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    
    setBanners((data || []) as Banner[]);
    setLoading(false);
  };

  // Combine database banners with fixed video banner
  const allItems: CarouselItem[] = [
    ...banners.map(b => ({ ...b, type: 'image' as const })),
    upscalerVideoBanner
  ];

  const getImageUrl = (banner: Banner) => {
    if (isMobile && banner.mobile_image_url) {
      return banner.mobile_image_url;
    }
    return banner.image_url;
  };

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % allItems.length);
  }, [allItems.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
  }, [allItems.length]);

  // Touch handlers for swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && allItems.length > 1) {
      nextSlide();
    }
    if (isRightSwipe && allItems.length > 1) {
      prevSlide();
    }
  };

  // Auto-advance slides
  useEffect(() => {
    if (allItems.length <= 1) return;
    
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [allItems.length, nextSlide]);

  const handleButtonClick = (link: string) => {
    if (link.startsWith('/')) {
      navigate(link);
    } else if (link.startsWith('http')) {
      window.open(link, '_blank');
    } else {
      navigate(link);
    }
  };

  const isVideoBanner = (item: CarouselItem): item is VideoBanner => {
    return item.type === 'video';
  };

  if (loading) {
    return (
      <div className="w-full h-32 sm:h-48 bg-muted animate-pulse rounded-xl" />
    );
  }

  if (allItems.length === 0) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full mb-4 sm:mb-6 overflow-hidden rounded-lg sm:rounded-xl touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Banner Container */}
      <div className="relative h-40 sm:h-48 lg:h-56">
        {allItems.map((item, index) => (
          <div
            key={item.id}
            className={`absolute inset-0 transition-all duration-500 ease-in-out ${
              index === currentIndex 
                ? 'opacity-100 translate-x-0' 
                : index < currentIndex 
                  ? 'opacity-0 -translate-x-full'
                  : 'opacity-0 translate-x-full'
            }`}
          >
            {isVideoBanner(item) ? (
              <>
                {/* Video Desktop */}
                <video 
                  className="absolute inset-0 w-full h-full object-cover hidden sm:block"
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                >
                  <source src={item.desktopVideoUrl} type="video/mp4" />
                </video>
                {/* Video Mobile */}
                <video 
                  className="absolute inset-0 w-full h-full object-cover block sm:hidden"
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                >
                  <source src={item.mobileVideoUrl} type="video/mp4" />
                </video>
              </>
            ) : (
              <img
                src={getImageUrl(item)}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent sm:from-black/70 sm:via-black/40" />
            
            {/* Content */}
            <div className="absolute inset-0 flex items-center">
              <div className="px-3 sm:px-8 lg:px-12 max-w-[75%] sm:max-w-xl">
                <h3 className="text-sm sm:text-2xl lg:text-3xl font-bold text-white mb-1 sm:mb-2 line-clamp-2 leading-tight">
                  {item.title}
                </h3>
                {(isVideoBanner(item) ? item.description : item.description) && (
                  <p className="text-[10px] sm:text-sm lg:text-base text-white/80 mb-2 sm:mb-4 line-clamp-2 leading-snug">
                    {isVideoBanner(item) ? item.description : item.description}
                  </p>
                )}
                <div className="flex flex-row items-center gap-3">
                  <Button
                    onClick={() => handleButtonClick(isVideoBanner(item) ? item.buttonLink : item.button_link)}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] sm:text-sm h-7 sm:h-9 px-2 sm:px-4"
                  >
                    {isVideoBanner(item) ? item.buttonText : item.button_text}
                  </Button>
                  {isVideoBanner(item) && (
                    <button 
                      onClick={() => handleButtonClick(item.secondaryLink)}
                      className="text-white/80 hover:text-white text-[10px] sm:text-sm underline underline-offset-2 transition-colors"
                    >
                      {item.secondaryText}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {allItems.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white h-7 w-7 sm:h-10 sm:w-10 rounded-full"
            onClick={prevSlide}
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white h-7 w-7 sm:h-10 sm:w-10 rounded-full"
            onClick={nextSlide}
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </>
      )}

      {/* Dots Indicator */}
      {allItems.length > 1 && (
        <div className="absolute bottom-1.5 sm:bottom-2 left-1/2 -translate-x-1/2 flex gap-1 sm:gap-1.5">
          {allItems.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-1.5 sm:h-2 rounded-full transition-all ${
                index === currentIndex 
                  ? 'w-3 sm:w-6 bg-white' 
                  : 'w-1.5 sm:w-2 bg-white/50 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerCarousel;
