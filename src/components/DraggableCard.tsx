import { Card } from "@/components/ui/card";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraggableCardProps {
  cardId: string;
  isReordering: boolean;
  isDragging: boolean;
  onDragStart: (cardId: string) => void;
  onDragOver: (e: React.DragEvent, cardId: string) => void;
  onDragEnd: () => void;
  className?: string;
  children: React.ReactNode;
}

export const DraggableCard = ({
  cardId,
  isReordering,
  isDragging,
  onDragStart,
  onDragOver,
  onDragEnd,
  className,
  children
}: DraggableCardProps) => {
  return (
    <Card
      draggable={isReordering}
      onDragStart={() => onDragStart(cardId)}
      onDragOver={(e) => onDragOver(e, cardId)}
      onDragEnd={onDragEnd}
      className={cn(
        "relative transition-all duration-200",
        isReordering && "cursor-grab active:cursor-grabbing ring-2 ring-primary/20 hover:ring-primary/40",
        isDragging && "opacity-50 scale-95",
        className
      )}
    >
      {isReordering && (
        <div className="absolute top-2 right-2 z-10 p-1 bg-primary/10 rounded-md">
          <GripVertical className="h-4 w-4 text-primary" />
        </div>
      )}
      {children}
    </Card>
  );
};
