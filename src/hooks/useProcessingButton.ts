import { useState, useCallback, useRef } from 'react';

/**
 * Hook reutilizável para prevenir cliques duplos em botões de processamento.
 * Usa ref para bloqueio síncrono IMEDIATO + state para atualização visual.
 * 
 * Uso:
 * const { isSubmitting, startSubmit, endSubmit } = useProcessingButton();
 * 
 * const handleClick = async () => {
 *   if (!startSubmit()) return; // Bloqueia instantaneamente
 *   try {
 *     await processAsync();
 *   } finally {
 *     endSubmit(); // Libera se der erro antes do status mudar
 *   }
 * };
 * 
 * <Button disabled={isSubmitting || isProcessing}>
 *   {isSubmitting ? <Loader2 className="animate-spin" /> : 'Processar'}
 * </Button>
 */
export function useProcessingButton() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const startSubmit = useCallback(() => {
    // Bloqueio SÍNCRONO - previne cliques duplicados mesmo antes do React atualizar
    if (submittingRef.current) return false;
    submittingRef.current = true;
    setIsSubmitting(true);
    return true;
  }, []);

  const endSubmit = useCallback(() => {
    submittingRef.current = false;
    setIsSubmitting(false);
  }, []);

  return { isSubmitting, startSubmit, endSubmit };
}
