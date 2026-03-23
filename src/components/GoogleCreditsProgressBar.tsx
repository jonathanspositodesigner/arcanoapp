import { useGoogleApiKey } from '@/hooks/useGoogleApiKey';

interface Props {
  onManageKey: () => void;
}

export default function GoogleCreditsProgressBar({ onManageKey }: Props) {
  const { hasKey, keyData } = useGoogleApiKey();

  if (!hasKey || !keyData) return null;

  const used = keyData.used_credits || 0;
  const total = keyData.total_credits || 1800;
  const percentage = Math.min((used / total) * 100, 100);
  const isWarning = percentage >= 90;

  return (
    <div className="mx-4 max-w-4xl self-center w-full">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1525]/80 border border-purple-500/20">
        <div className="flex-1">
          <div className="w-full h-2.5 rounded-full bg-purple-900/50 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isWarning ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
        <span className={`text-[11px] font-medium whitespace-nowrap ${isWarning ? 'text-red-400' : 'text-green-400'}`}>
          R$ {used.toFixed(2)} de R$ {total.toFixed(2)}
        </span>
        {isWarning && (
          <button
            onClick={onManageKey}
            className="text-[10px] text-red-400 hover:text-red-300 underline whitespace-nowrap"
          >
            ⚠️ Trocar Chave
          </button>
        )}
      </div>
    </div>
  );
}
