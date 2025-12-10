import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Bold, Italic, Underline, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, 
  List, ListOrdered, Link, Image, 
  Type, Palette, Square, Smile
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const EMOJI_CATEGORIES = {
  "Populares": ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋"],
  "Gestos": ["👍", "👎", "👊", "✊", "🤛", "🤜", "🤞", "✌️", "🤟", "🤘", "👌", "🤌", "🤏", "👈", "👉", "👆", "👇", "☝️", "👋", "🤚"],
  "Celebração": ["🎉", "🎊", "🎁", "🎈", "🎂", "🎄", "🎃", "🎆", "🎇", "✨", "💫", "🌟", "⭐", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "🎗️"],
  "Negócios": ["💼", "📈", "📉", "💰", "💵", "💴", "💶", "💷", "💳", "💎", "📊", "📋", "📌", "📍", "🔗", "📧", "📨", "📩", "📤", "📥"],
  "Fogo & Energia": ["🔥", "⚡", "💥", "💢", "💯", "❗", "❓", "❕", "❔", "‼️", "⁉️", "🚀", "💪", "🎯", "💡", "🔔", "🔊", "📢", "📣", "🎬"],
  "Corações": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💝", "💘", "💟", "♥️"],
};

interface EmailEditorProps {
  value: string;
  onChange: (html: string) => void;
}

const COLORS = [
  "#000000", "#333333", "#666666", "#999999", "#CCCCCC", "#FFFFFF",
  "#FF0000", "#FF6600", "#FFCC00", "#00FF00", "#0066FF", "#9900FF",
  "#FF3366", "#FF9933", "#FFFF00", "#33FF99", "#3399FF", "#CC66FF",
];

const EmailEditor = ({ value, onChange }: EmailEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState("Populares");

  const insertEmoji = (emoji: string) => {
    execCommand("insertHTML", emoji);
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    updateContent();
    editorRef.current?.focus();
  };

  const updateContent = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 2MB");
      return;
    }

    const fileName = `${Date.now()}-${file.name}`;
    
    const { error } = await supabase.storage
      .from("email-assets")
      .upload(fileName, file);

    if (error) {
      toast.error("Erro ao fazer upload da imagem");
      return;
    }

    const { data: urlData } = supabase.storage
      .from("email-assets")
      .getPublicUrl(fileName);

    execCommand("insertImage", urlData.publicUrl);
    toast.success("Imagem inserida!");
  };

  const insertLink = () => {
    if (linkUrl) {
      execCommand("createLink", linkUrl);
      setLinkUrl("");
      setShowLinkInput(false);
    }
  };

  const insertButton = (color: string) => {
    const buttonHtml = `<a href="#" style="display: inline-block; padding: 12px 24px; background-color: ${color}; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 8px 0;">Clique Aqui</a>`;
    execCommand("insertHTML", buttonHtml);
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-muted/50 border-b border-border p-2 flex flex-wrap gap-1">
        {/* Text formatting */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("bold")}
          title="Negrito"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("italic")}
          title="Itálico"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("underline")}
          title="Sublinhado"
        >
          <Underline className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("strikeThrough")}
          title="Riscado"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Alignment */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("justifyLeft")}
          title="Alinhar à esquerda"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("justifyCenter")}
          title="Centralizar"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("justifyRight")}
          title="Alinhar à direita"
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Lists */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("insertUnorderedList")}
          title="Lista"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("insertOrderedList")}
          title="Lista numerada"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Text color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" title="Cor do texto">
              <Type className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="grid grid-cols-6 gap-1">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-6 h-6 rounded border border-border"
                  style={{ backgroundColor: color }}
                  onClick={() => execCommand("foreColor", color)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Background color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" title="Cor de fundo">
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="grid grid-cols-6 gap-1">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-6 h-6 rounded border border-border"
                  style={{ backgroundColor: color }}
                  onClick={() => execCommand("hiliteColor", color)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Link */}
        <Popover open={showLinkInput} onOpenChange={setShowLinkInput}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" title="Inserir link">
              <Link className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="flex gap-2">
              <Input
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && insertLink()}
              />
              <Button type="button" size="sm" onClick={insertLink}>
                OK
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Image upload */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => document.getElementById("email-image-upload")?.click()}
          title="Inserir imagem"
        >
          <Image className="h-4 w-4" />
        </Button>
        <input
          id="email-image-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

        {/* CTA Button */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" title="Inserir botão">
              <Square className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <p className="text-sm text-muted-foreground mb-2">Cor do botão:</p>
            <div className="grid grid-cols-4 gap-1">
              <button
                type="button"
                className="w-8 h-8 rounded"
                style={{ backgroundColor: "#552b99" }}
                onClick={() => insertButton("#552b99")}
              />
              <button
                type="button"
                className="w-8 h-8 rounded"
                style={{ backgroundColor: "#0095FF" }}
                onClick={() => insertButton("#0095FF")}
              />
              <button
                type="button"
                className="w-8 h-8 rounded"
                style={{ backgroundColor: "#22c55e" }}
                onClick={() => insertButton("#22c55e")}
              />
              <button
                type="button"
                className="w-8 h-8 rounded"
                style={{ backgroundColor: "#f97316" }}
                onClick={() => insertButton("#f97316")}
              />
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Emoji picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" title="Inserir emoji">
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-2">
            <div className="flex flex-wrap gap-1 mb-2 pb-2 border-b border-border">
              {Object.keys(EMOJI_CATEGORIES).map((category) => (
                <Button
                  key={category}
                  variant={emojiCategory === category ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={() => setEmojiCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-10 gap-1 max-h-48 overflow-y-auto">
              {EMOJI_CATEGORIES[emojiCategory as keyof typeof EMOJI_CATEGORIES].map((emoji, index) => (
                <button
                  key={index}
                  type="button"
                  className="text-xl hover:bg-muted rounded p-1 transition-colors"
                  onClick={() => insertEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        className="min-h-[300px] p-4 focus:outline-none prose prose-sm max-w-none"
        onInput={updateContent}
        onBlur={updateContent}
        dangerouslySetInnerHTML={{ __html: value }}
        style={{ 
          backgroundColor: "white", 
          color: "black",
          fontFamily: "Arial, sans-serif"
        }}
      />
    </div>
  );
};

export default EmailEditor;
