import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ShieldOff } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

interface WarrantyWaiverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolSlug: string;
  versionSlug?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal aprimorado: explica a importância das aulas, exige checkbox de
 * ciência (que libera o botão "Ir para a ferramenta") e registra no perfil
 * do usuário que ele abriu mão da garantia de 7 dias.
 */
const WarrantyWaiverModal = ({
  open,
  onOpenChange,
  toolSlug,
  versionSlug,
  onConfirm,
  onCancel,
}: WarrantyWaiverModalProps) => {
  const { t } = useTranslation("tools");
  const [acknowledged, setAcknowledged] = useState(false);

  // Reset state every time modal reopens
  useEffect(() => {
    if (open) setAcknowledged(false);
  }, [open]);

  const handleConfirm = async () => {
    if (!acknowledged) return;
    // Registra o waiver no perfil. Falhas não devem bloquear o usuário.
    try {
      await supabase.rpc("record_warranty_waiver" as any, {
        _tool_slug: toolSlug,
        _version_slug: versionSlug ?? null,
      });
    } catch (err) {
      console.error("[WarrantyWaiver] Falha ao registrar:", err);
    }
    onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md left-1/2 -translate-x-1/2">
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <AlertDialogTitle className="text-center text-xl">
            {t("toolLessons.warningModalTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-base">
            {t("toolLessons.warningModalDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Termo de abrir mão da garantia */}
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm">
          <div className="flex items-start gap-2 mb-2">
            <ShieldOff className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
            <p className="font-semibold text-foreground">
              {t("toolLessons.warningModalWaiverTitle")}
            </p>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {t("toolLessons.warningModalWaiverText")}
          </p>
        </div>

        {/* Checkbox de ciência */}
        <label className="flex items-start gap-3 cursor-pointer select-none p-2 rounded-md hover:bg-accent/30 transition-colors">
          <Checkbox
            checked={acknowledged}
            onCheckedChange={(checked) => setAcknowledged(checked === true)}
            className="mt-0.5"
          />
          <span className="text-sm text-foreground leading-snug">
            {t("toolLessons.warningModalCheckbox")}
          </span>
        </label>

        <AlertDialogFooter className="flex flex-col gap-2 mt-2 sm:flex-row">
          <AlertDialogCancel
            onClick={onCancel}
            className="flex-1 bg-secondary hover:bg-secondary text-foreground border-0 order-1 sm:order-1"
          >
            {t("toolLessons.continueWatching")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!acknowledged}
            className="flex-1 order-2 sm:order-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-400"
          >
            {t("toolLessons.assumeRisk")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default WarrantyWaiverModal;
