import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Layout, Layouts } from "@/hooks/useDashboardGrid";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface GridDashboardProps {
  layouts: Layouts;
  isEditing: boolean;
  onLayoutChange: (currentLayout: Layout[], allLayouts: Layouts) => void;
  children: ReactNode;
  className?: string;
}

export const GridDashboard = ({
  layouts,
  isEditing,
  onLayoutChange,
  children,
  className,
}: GridDashboardProps) => {
  return (
    <ResponsiveGridLayout
      className={cn(
        "layout",
        isEditing && "editing-mode",
        className
      )}
      layouts={layouts}
      breakpoints={{ lg: 1200, md: 768, sm: 0 }}
      cols={{ lg: 12, md: 6, sm: 2 }}
      rowHeight={30}
      onLayoutChange={onLayoutChange}
      isDraggable={isEditing}
      isResizable={isEditing}
      draggableHandle=".drag-handle"
      resizeHandles={["se", "sw", "ne", "nw", "e", "w", "n", "s"]}
      margin={[16, 16]}
      containerPadding={[0, 0]}
      useCSSTransforms={true}
      compactType="vertical"
      preventCollision={false}
    >
      {children}
    </ResponsiveGridLayout>
  );
};
