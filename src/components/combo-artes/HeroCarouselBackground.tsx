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
    <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center">
      {/* Single row - scrolls left */}
      <div className="flex gap-4 animate-carousel-scroll">
        {doubled.map((src, i) => (
          <img
            key={`r1-${i}`}
            src={src}
            alt=""
            className="w-48 h-64 md:w-56 md:h-72 rounded-2xl object-cover flex-shrink-0 brightness-75"
            loading="lazy"
          />
        ))}
      </div>

      {/* Gradient overlay - strong bottom-up fade */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f0a15] via-[#0f0a15]/80 to-transparent" />
      {/* Top fade */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f0a15]/60 to-transparent" />
      {/* Purple tint overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-purple-900/50 via-purple-900/20 to-transparent" />
    </div>
  );
};

export default HeroCarouselBackground;
