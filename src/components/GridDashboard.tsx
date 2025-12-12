import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Layout, Layouts } from "@/hooks/useDashboardGrid";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ReactGridLayout = require("react-grid-layout");
const ResponsiveGridLayout = ReactGridLayout.WidthProvider(ReactGridLayout.Responsive);

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
