import React from 'react';
import { MessageSquare } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface CustomPromptToggleProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  disabled?: boolean;
}

const CustomPromptToggle: React.FC<CustomPromptToggleProps> = ({
  enabled,
  onEnabledChange,
  prompt,
  onPromptChange,
  disabled = false,
}) => {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-white flex items-center gap-1.5">
          <MessageSquare className="w-3 h-3 text-gray-400" />
          Instruções Personalizadas
        </p>
        <Switch
          checked={enabled}
          onCheckedChange={onEnabledChange}
          disabled={disabled}
          className="scale-75"
        />
      </div>
      
      {enabled && (
        <Textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Ex: Use roupas vermelhas, cenário na praia..."
          disabled={disabled}
          className="mt-2 min-h-[60px] max-h-[80px] text-xs bg-white/5 border-white/10 text-white placeholder:text-gray-500 resize-none"
          maxLength={500}
        />
      )}
    </div>
  );
};

export default CustomPromptToggle;
