const carouselImages = [
  "/images/carousel/carousel-1.webp",
  "/images/carousel/carousel-2.webp",
  "/images/carousel/carousel-3.webp",
  "/images/carousel/carousel-4.webp",
  "/images/carousel/carousel-5.webp",
  "/images/carousel/carousel-6.webp",
  "/images/carousel/carousel-7.webp",
  "/images/carousel/carousel-8.webp",
];

const HeroCarouselBackground = () => {
  const doubled = [...carouselImages, ...carouselImages];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-start pt-8 md:pt-12">
      {/* Single row - scrolls left */}
      <div className="flex gap-4 animate-carousel-scroll">
        {doubled.map((src, i) => (
          <img
            key={`r1-${i}`}
            src={src}
            alt=""
            className="w-48 h-64 md:w-56 md:h-72 rounded-2xl object-cover flex-shrink-0 brightness-75 blur-[2px]"
            loading="lazy"
          />
        ))}
      </div>

      {/* Gradient overlay - only bottom half */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0f0a15] via-[#0f0a15]/60 to-transparent" />
      {/* Purple tint overlay - only bottom portion */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-purple-900/40 to-transparent" />
    </div>
  );
};

export default HeroCarouselBackground;
