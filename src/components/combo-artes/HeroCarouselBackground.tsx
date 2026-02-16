const carouselImages = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop",
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=500&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=500&fit=crop",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=500&fit=crop",
];

const HeroCarouselBackground = () => {
  const doubled = [...carouselImages, ...carouselImages];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Row 1 - scrolls left */}
      <div className="flex gap-3 animate-carousel-scroll mt-4">
        {doubled.map((src, i) => (
          <img
            key={`r1-${i}`}
            src={src}
            alt=""
            className="w-32 h-44 md:w-40 md:h-56 rounded-2xl object-cover flex-shrink-0"
            loading="lazy"
          />
        ))}
      </div>
      {/* Row 2 - scrolls right */}
      <div className="flex gap-3 animate-carousel-scroll-reverse mt-3">
        {[...doubled].reverse().map((src, i) => (
          <img
            key={`r2-${i}`}
            src={src}
            alt=""
            className="w-32 h-44 md:w-40 md:h-56 rounded-2xl object-cover flex-shrink-0"
            loading="lazy"
          />
        ))}
      </div>
      {/* Fade overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f0a15]/40 via-transparent to-[#0f0a15]/90" />
      <div className="absolute inset-0 opacity-30 blur-[2px]" />
    </div>
  );
};

export default HeroCarouselBackground;
