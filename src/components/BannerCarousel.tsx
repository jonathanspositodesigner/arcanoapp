import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Banner {
  id: string;
  title: string;
  description: string | null;
  button_text: string;
  button_link: string;
  image_url: string;
}

const BannerCarousel = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

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

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  // Auto-advance slides
  useEffect(() => {
    if (banners.length <= 1) return;
    
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [banners.length, nextSlide]);

  if (loading) {
    return (
      <div className="w-full h-32 sm:h-48 bg-muted animate-pulse rounded-xl" />
    );
  }

  if (banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  return (
    <div className="relative w-full mb-4 sm:mb-6 overflow-hidden rounded-lg sm:rounded-xl">
      {/* Banner Container */}
      <div className="relative h-40 sm:h-48 lg:h-56">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-all duration-500 ease-in-out ${
              index === currentIndex 
                ? 'opacity-100 translate-x-0' 
                : index < currentIndex 
                  ? 'opacity-0 -translate-x-full'
                  : 'opacity-0 translate-x-full'
            }`}
          >
            {/* Background Image */}
            <img
              src={banner.image_url}
              alt={banner.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            
            {/* Overlay Gradient - stronger on mobile for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent sm:from-black/70 sm:via-black/40" />
            
            {/* Content */}
            <div className="absolute inset-0 flex items-center">
              <div className="px-3 sm:px-8 lg:px-12 max-w-[75%] sm:max-w-xl">
                <h3 className="text-sm sm:text-2xl lg:text-3xl font-bold text-white mb-1 sm:mb-2 line-clamp-2 leading-tight">
                  {banner.title}
                </h3>
                {banner.description && (
                  <p className="text-[10px] sm:text-sm lg:text-base text-white/80 mb-2 sm:mb-4 line-clamp-2 leading-snug">
                    {banner.description}
                  </p>
                )}
                <Button
                  onClick={() => window.open(banner.button_link, '_blank')}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] sm:text-sm h-7 sm:h-9 px-2 sm:px-4"
                >
                  {banner.button_text}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows - larger touch targets on mobile */}
      {banners.length > 1 && (
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
      {banners.length > 1 && (
        <div className="absolute bottom-1.5 sm:bottom-2 left-1/2 -translate-x-1/2 flex gap-1 sm:gap-1.5">
          {banners.map((_, index) => (
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
