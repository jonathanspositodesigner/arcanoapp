import { Card } from "@/components/ui/card";
import { GripVertical, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode, forwardRef } from "react";

interface GridCardProps {
  isEditing: boolean;
  className?: string;
  children: ReactNode;
  style?: React.CSSProperties;
}

export const GridCard = forwardRef<HTMLDivElement, GridCardProps>(
  ({ isEditing, className, children, style, ...props }, ref) => {
    return (
      <div ref={ref} style={style} {...props} className="h-full">
        <Card
          className={cn(
            "h-full overflow-hidden transition-all duration-200 relative",
            isEditing && "ring-2 ring-primary/30 hover:ring-primary/50 shadow-lg",
            className
          )}
        >
          {isEditing && (
            <>
              {/* Drag handle */}
              <div className="drag-handle absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-primary/20 to-transparent cursor-grab active:cursor-grabbing z-20 flex items-center justify-center">
                <div className="flex items-center gap-1 px-2 py-1 bg-primary/30 rounded-md">
                  <GripVertical className="h-4 w-4 text-primary" />
                  <span className="text-xs text-primary font-medium">Arraste</span>
                </div>
              </div>
              
              {/* Resize indicator */}
              <div className="absolute bottom-1 right-1 z-20 p-1 bg-primary/20 rounded-md">
                <Maximize2 className="h-3 w-3 text-primary" />
              </div>
            </>
          )}
          <div className={cn("h-full overflow-auto", isEditing && "pt-8")}>
            {children}
          </div>
        </Card>
      </div>
    );
  }
);

GridCard.displayName = "GridCard";
