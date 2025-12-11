import { useState, useEffect } from "react";

const DEFAULT_ORDERS: Record<string, string[]> = {
  dashboard: [
    "today-access", "period-access", "installations", "top-ranking",
    "bounce-rate", "avg-time", "collection-links", "first-access",
    "top-purchased", "top-categories", "hourly-stats", "conversion",
    "funnel", "access-type", "retention", "purchase-hours", "refunds", "access-chart"
  ],
  ferramentas_prompts: [
    "enviar-arquivo", "analisar-arquivos", "gerenciar-imagens", "gerenciar-premium",
    "colecoes", "gerenciar-parceiros", "categorias", "administradores"
  ],
  ferramentas_artes: [
    "enviar-arte", "analisar-artes", "gerenciar-artes", "gerenciar-parceiros-artes",
    "gerenciar-packs", "gerenciar-banners", "gerenciar-clientes", "promocoes",
    "categorias-artes", "webhook-logs", "blacklist", "importar-clientes", "abandonados"
  ],
  marketing: [
    "email-marketing", "push-notifications", "email-analytics", "top-email",
    "push-analytics", "top-push"
  ]
};

export const useDashboardCardOrder = (section: string = "dashboard") => {
  const STORAGE_KEY = `card-order-${section}`;
  const defaultOrder = DEFAULT_ORDERS[section] || [];
  
  const [cardOrder, setCardOrder] = useState<string[]>(defaultOrder);
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with defaults in case new cards were added
        const mergedOrder = [...parsed];
        defaultOrder.forEach(card => {
          if (!mergedOrder.includes(card)) {
            mergedOrder.push(card);
          }
        });
        setCardOrder(mergedOrder);
      } catch {
        setCardOrder(defaultOrder);
      }
    }
  }, [STORAGE_KEY, defaultOrder]);

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
    saveOrder(defaultOrder);
  };

  const getCardIndex = (cardId: string) => {
    return cardOrder.indexOf(cardId);
  };

  const getDragProps = (cardId: string) => ({
    draggable: isReordering,
    onDragStart: () => handleDragStart(cardId),
    onDragOver: (e: React.DragEvent) => handleDragOver(e, cardId),
    onDragEnd: handleDragEnd,
    style: { order: getCardIndex(cardId) }
  });

  return {
    cardOrder,
    draggedCard,
    isReordering,
    setIsReordering,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    resetOrder,
    getCardIndex,
    getDragProps
  };
};
