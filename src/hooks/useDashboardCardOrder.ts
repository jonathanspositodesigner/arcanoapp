import { useState, useEffect } from "react";

const STORAGE_KEY = "dashboard-card-order";

const DEFAULT_CARD_ORDER = [
  "today-access",
  "period-access",
  "installations",
  "top-ranking",
  "bounce-rate",
  "avg-time",
  "collection-links",
  "first-access",
  "top-purchased",
  "top-categories",
  "hourly-stats",
  "access-chart",
  "funnel",
  "conversion",
  "access-type",
  "purchase-hours",
  "retention",
  "refunds"
];

export const useDashboardCardOrder = () => {
  const [cardOrder, setCardOrder] = useState<string[]>(DEFAULT_CARD_ORDER);
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with defaults in case new cards were added
        const mergedOrder = [...parsed];
        DEFAULT_CARD_ORDER.forEach(card => {
          if (!mergedOrder.includes(card)) {
            mergedOrder.push(card);
          }
        });
        setCardOrder(mergedOrder);
      } catch {
        setCardOrder(DEFAULT_CARD_ORDER);
      }
    }
  }, []);

  const saveOrder = (order: string[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
    setCardOrder(order);
  };

  const handleDragStart = (cardId: string) => {
    setDraggedCard(cardId);
  };

  const handleDragOver = (e: React.DragEvent, targetCardId: string) => {
    e.preventDefault();
    if (!draggedCard || draggedCard === targetCardId) return;

    const newOrder = [...cardOrder];
    const draggedIndex = newOrder.indexOf(draggedCard);
    const targetIndex = newOrder.indexOf(targetCardId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedCard);
      setCardOrder(newOrder);
    }
  };

  const handleDragEnd = () => {
    if (draggedCard) {
      saveOrder(cardOrder);
    }
    setDraggedCard(null);
  };

  const resetOrder = () => {
    saveOrder(DEFAULT_CARD_ORDER);
  };

  const getCardIndex = (cardId: string) => {
    return cardOrder.indexOf(cardId);
  };

  return {
    cardOrder,
    draggedCard,
    isReordering,
    setIsReordering,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    resetOrder,
    getCardIndex
  };
};
