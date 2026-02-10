import React, { useState } from 'react';
import { Coins, Loader2, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RefineSelectorProps {
  onSubmit: (selectedNumbers: string) => void;
  onCancel: () => void;
  creditCost: number;
  isProcessing: boolean;
  disabled?: boolean;
}

const RefineSelector: React.FC<RefineSelectorProps> = ({
  onSubmit,
  onCancel,
  creditCost,
  isProcessing,
  disabled = false,
}) => {
  const [selected, setSelected] = useState<number[]>([]);

  const toggleNumber = (num: number) => {
    setSelected(prev =>
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num].sort((a, b) => a - b)
    );
  };

  const selectionText = selected.join(', ');
  const canSubmit = selected.length > 0 && !isProcessing && !disabled;

  return (
    <div className="bg-purple-900/40 border border-purple-500/30 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-white">Escolha as imagens que quer trocar</p>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-purple-300 hover:text-white hover:bg-purple-500/20"
          onClick={onCancel}
          disabled={isProcessing}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* 3x3 Grid */}
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }, (_, i) => i + 1).map(num => {
          const isSelected = selected.includes(num);
          return (
            <button
              key={num}
              type="button"
              disabled={isProcessing || disabled}
              onClick={() => toggleNumber(num)}
              className={`
                h-10 rounded-lg text-sm font-bold transition-all
                ${isSelected
                  ? 'bg-fuchsia-600 text-white border-2 border-fuchsia-400 shadow-lg shadow-fuchsia-500/30'
                  : 'bg-purple-800/50 text-purple-300 border border-purple-500/30 hover:bg-purple-700/50 hover:text-white'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {num}
            </button>
          );
        })}
      </div>

      {/* Selection Preview */}
      {selected.length > 0 && (
        <div className="bg-purple-800/30 border border-purple-500/20 rounded-md px-3 py-1.5">
          <p className="text-[10px] text-purple-400 mb-0.5">Selecionados:</p>
          <p className="text-xs text-white font-mono">{selectionText}</p>
        </div>
      )}

      {/* Submit */}
      <Button
        size="sm"
        className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-medium text-xs disabled:opacity-50"
        disabled={!canSubmit}
        onClick={() => onSubmit(selectionText)}
      >
        {isProcessing ? (
          <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Processando...</>
        ) : (
          <>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Trocar Imagens
            <span className="ml-2 flex items-center gap-1 text-xs opacity-90">
              <Coins className="w-3.5 h-3.5" />{creditCost}
            </span>
          </>
        )}
      </Button>
    </div>
  );
};

export default RefineSelector;
