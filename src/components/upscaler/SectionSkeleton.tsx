interface SectionSkeletonProps {
  height?: string;
  className?: string;
}

/**
 * Skeleton placeholder for lazy-loaded sections
 */
export const SectionSkeleton = ({ 
  height = "400px",
  className = ""
}: SectionSkeletonProps) => {
  return (
    <div 
      className={`w-full flex items-center justify-center ${className}`}
      style={{ minHeight: height }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-fuchsia-500"></div>
        <div className="text-white/40 text-sm">Cargando...</div>
      </div>
    </div>
  );
};

export default SectionSkeleton;
