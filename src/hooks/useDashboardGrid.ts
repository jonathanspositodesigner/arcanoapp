import { useState, useEffect, useCallback } from "react";
import ReactGridLayout from "react-grid-layout";

type Layout = ReactGridLayout.Layout;
type Layouts = ReactGridLayout.Layouts;

export type { Layout, Layouts };

const DEFAULT_LAYOUTS: Layouts = {
  lg: [
    { i: "today-access", x: 0, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
    { i: "period-access", x: 3, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
    { i: "installations", x: 6, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
    { i: "top-ranking", x: 9, y: 0, w: 3, h: 6, minW: 2, minH: 4 },
    { i: "artes-click-types", x: 0, y: 4, w: 3, h: 5, minW: 2, minH: 4 },
    { i: "collection-links", x: 3, y: 4, w: 3, h: 5, minW: 2, minH: 4 },
    { i: "first-access", x: 6, y: 4, w: 3, h: 5, minW: 2, minH: 4 },
    { i: "top-purchased", x: 0, y: 9, w: 6, h: 6, minW: 3, minH: 4 },
    { i: "top-categories", x: 6, y: 9, w: 6, h: 6, minW: 3, minH: 4 },
    { i: "hourly-stats", x: 0, y: 15, w: 4, h: 6, minW: 3, minH: 4 },
    { i: "conversion", x: 4, y: 15, w: 4, h: 6, minW: 3, minH: 4 },
    { i: "retention", x: 8, y: 15, w: 4, h: 5, minW: 2, minH: 4 },
    { i: "purchase-hours", x: 0, y: 21, w: 4, h: 5, minW: 2, minH: 4 },
    { i: "refunds", x: 4, y: 21, w: 4, h: 6, minW: 3, minH: 5 },
    { i: "abandoned-checkouts", x: 8, y: 21, w: 4, h: 6, minW: 4, minH: 5 },
    { i: "access-chart", x: 0, y: 27, w: 12, h: 6, minW: 6, minH: 4 },
  ],
  md: [
    { i: "today-access", x: 0, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
    { i: "period-access", x: 3, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
    { i: "installations", x: 0, y: 4, w: 3, h: 4, minW: 2, minH: 3 },
    { i: "top-ranking", x: 3, y: 4, w: 3, h: 6, minW: 2, minH: 4 },
    { i: "artes-click-types", x: 0, y: 8, w: 3, h: 5, minW: 2, minH: 4 },
    { i: "collection-links", x: 3, y: 10, w: 3, h: 5, minW: 2, minH: 4 },
    { i: "first-access", x: 0, y: 13, w: 3, h: 5, minW: 2, minH: 4 },
    { i: "top-purchased", x: 0, y: 18, w: 6, h: 6, minW: 3, minH: 4 },
    { i: "top-categories", x: 0, y: 24, w: 6, h: 6, minW: 3, minH: 4 },
    { i: "hourly-stats", x: 0, y: 30, w: 3, h: 6, minW: 2, minH: 4 },
    { i: "conversion", x: 3, y: 30, w: 3, h: 6, minW: 2, minH: 4 },
    { i: "retention", x: 0, y: 36, w: 3, h: 5, minW: 2, minH: 4 },
    { i: "purchase-hours", x: 3, y: 36, w: 3, h: 5, minW: 2, minH: 4 },
    { i: "refunds", x: 0, y: 41, w: 3, h: 5, minW: 2, minH: 3 },
    { i: "abandoned-checkouts", x: 3, y: 41, w: 3, h: 5, minW: 2, minH: 4 },
    { i: "access-chart", x: 0, y: 46, w: 6, h: 6, minW: 4, minH: 4 },
  ],
  sm: [
    { i: "today-access", x: 0, y: 0, w: 2, h: 4, minW: 1, minH: 3 },
    { i: "period-access", x: 0, y: 4, w: 2, h: 4, minW: 1, minH: 3 },
    { i: "installations", x: 0, y: 8, w: 2, h: 4, minW: 1, minH: 3 },
    { i: "top-ranking", x: 0, y: 12, w: 2, h: 6, minW: 1, minH: 4 },
    { i: "artes-click-types", x: 0, y: 18, w: 2, h: 5, minW: 1, minH: 4 },
    { i: "collection-links", x: 0, y: 23, w: 2, h: 5, minW: 1, minH: 4 },
    { i: "first-access", x: 0, y: 28, w: 2, h: 5, minW: 1, minH: 4 },
    { i: "top-purchased", x: 0, y: 33, w: 2, h: 6, minW: 1, minH: 4 },
    { i: "top-categories", x: 0, y: 39, w: 2, h: 6, minW: 1, minH: 4 },
    { i: "hourly-stats", x: 0, y: 45, w: 2, h: 6, minW: 1, minH: 4 },
    { i: "conversion", x: 0, y: 51, w: 2, h: 6, minW: 1, minH: 4 },
    { i: "retention", x: 0, y: 57, w: 2, h: 5, minW: 1, minH: 4 },
    { i: "purchase-hours", x: 0, y: 62, w: 2, h: 5, minW: 1, minH: 4 },
    { i: "refunds", x: 0, y: 67, w: 2, h: 5, minW: 1, minH: 3 },
    { i: "abandoned-checkouts", x: 0, y: 72, w: 2, h: 5, minW: 1, minH: 4 },
    { i: "access-chart", x: 0, y: 77, w: 2, h: 6, minW: 1, minH: 4 },
  ],
};

const STORAGE_KEY = "dashboard-grid-layouts";

export const useDashboardGrid = () => {
  const [layouts, setLayouts] = useState<Layouts>(DEFAULT_LAYOUTS);
  const [isEditing, setIsEditing] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load saved layouts from localStorage
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Layouts;
        // Merge with defaults to ensure new cards are included
        const merged: Layouts = { lg: [], md: [], sm: [] };
        
        (['lg', 'md', 'sm'] as const).forEach((breakpoint) => {
          const savedItems = parsed[breakpoint] || [];
          const defaultItems = DEFAULT_LAYOUTS[breakpoint] || [];
          
          // Keep saved positions for existing cards
          const mergedItems = defaultItems.map((defaultItem) => {
            const savedItem = savedItems.find((s) => s.i === defaultItem.i);
            return savedItem ? { ...defaultItem, ...savedItem } : defaultItem;
          });
          
          merged[breakpoint] = mergedItems;
        });
        
        setLayouts(merged);
      } catch {
        setLayouts(DEFAULT_LAYOUTS);
      }
    }
  }, []);

  const handleLayoutChange = useCallback((currentLayout: Layout[], allLayouts: Layouts) => {
    if (isEditing) {
      setLayouts(allLayouts);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allLayouts));
    }
  }, [isEditing]);

  const resetLayouts = useCallback(() => {
    setLayouts(DEFAULT_LAYOUTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_LAYOUTS));
  }, []);

  const toggleEditing = useCallback(() => {
    setIsEditing((prev) => !prev);
  }, []);

  return {
    layouts,
    isEditing,
    mounted,
    handleLayoutChange,
    resetLayouts,
    toggleEditing,
    setIsEditing,
  };
};
