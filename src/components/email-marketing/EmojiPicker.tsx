import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";

const EMOJI_CATEGORIES = {
  "Populares": ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋"],
  "Gestos": ["👍", "👎", "👊", "✊", "🤛", "🤜", "🤞", "✌️", "🤟", "🤘", "👌", "🤌", "🤏", "👈", "👉", "👆", "👇", "☝️", "👋", "🤚"],
  "Celebração": ["🎉", "🎊", "🎁", "🎈", "🎂", "🎄", "🎃", "🎆", "🎇", "✨", "💫", "🌟", "⭐", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "🎗️"],
  "Negócios": ["💼", "📈", "📉", "💰", "💵", "💴", "💶", "💷", "💳", "💎", "📊", "📋", "📌", "📍", "🔗", "📧", "📨", "📩", "📤", "📥"],
  "Fogo & Energia": ["🔥", "⚡", "💥", "💢", "💯", "❗", "❓", "❕", "❔", "‼️", "⁉️", "🚀", "💪", "🎯", "💡", "🔔", "🔊", "📢", "📣", "🎬"],
  "Corações": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💝", "💘", "💟", "♥️"],
  "Natureza": ["🌸", "🌺", "🌻", "🌼", "🌷", "🌹", "🌴", "🌵", "🌲", "🌳", "☀️", "🌙", "🌈", "⛅", "🌊", "🍀", "🌿", "🍃", "🍂", "🍁"],
};

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

const EmojiPicker = ({ onSelect }: EmojiPickerProps) => {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Populares");

  const handleEmojiClick = (emoji: string) => {
    onSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
        >
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <div className="flex flex-wrap gap-1 mb-2 pb-2 border-b border-border">
          {Object.keys(EMOJI_CATEGORIES).map((category) => (
            <Button
              key={category}
              variant={activeCategory === category ? "secondary" : "ghost"}
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-10 gap-1 max-h-48 overflow-y-auto">
          {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map((emoji, index) => (
            <button
              key={index}
              type="button"
              className="text-xl hover:bg-muted rounded p-1 transition-colors"
              onClick={() => handleEmojiClick(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;
