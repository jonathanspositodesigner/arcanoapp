import { useRef, useState, useEffect } from "react";
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
  const [emojiCategory, setEmojiCategory] = useState("Populares");
  const isInternalChange = useRef(false);

  // Link state
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  // Button state
  const [showButtonPopover, setShowButtonPopover] = useState(false);
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [buttonColor, setButtonColor] = useState("#552b99");

  // Set initial content only once or when value changes externally
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
    isInternalChange.current = false;
  }, [value]);

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
      isInternalChange.current = true;
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
    if (!linkUrl) {
      toast.error("Digite a URL do link");
      return;
    }
    
    const selection = window.getSelection();
    const hasSelection = selection && selection.toString().trim().length > 0;
    
    if (hasSelection) {
      // Has selected text - create link on it
      execCommand("createLink", linkUrl);
    } else if (linkText) {
      // No selection but has text - insert new link
      const linkHtml = `<a href="${linkUrl}" style="color: #552b99;">${linkText}</a>`;
      execCommand("insertHTML", linkHtml);
    } else {
      toast.error("Selecione um texto ou digite o texto do link");
      return;
    }
    
    setLinkUrl("");
    setLinkText("");
    setShowLinkPopover(false);
    toast.success("Link inserido!");
  };

  const insertButton = () => {
    if (!buttonText) {
      toast.error("Digite o texto do botão");
      return;
    }
    if (!buttonUrl) {
      toast.error("Digite a URL do botão");
      return;
    }
    
    const buttonHtml = `<a href="${buttonUrl}" style="display: inline-block; padding: 12px 24px; background-color: ${buttonColor}; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 8px 0;">${buttonText}</a>`;
    execCommand("insertHTML", buttonHtml);
    
    // Reset fields
    setButtonText("");
    setButtonUrl("");
    setButtonColor("#552b99");
    setShowButtonPopover(false);
    toast.success("Botão inserido!");
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
        <Popover open={showLinkPopover} onOpenChange={setShowLinkPopover}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" title="Inserir link">
              <Link className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                💡 Selecione um texto no editor OU digite o texto abaixo
              </p>
              <Input
                placeholder="Texto do link (opcional se selecionado)"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
              />
              <Input
                placeholder="URL (https://...)"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
              <Button type="button" size="sm" onClick={insertLink} className="w-full">
                Inserir Link
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
        <Popover open={showButtonPopover} onOpenChange={setShowButtonPopover}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" title="Inserir botão">
              <Square className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <Input
                placeholder="Texto do botão"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
              />
              <Input
                placeholder="URL do botão (https://...)"
                value={buttonUrl}
                onChange={(e) => setButtonUrl(e.target.value)}
              />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Cor do botão:</p>
                <div className="grid grid-cols-6 gap-1">
                  {["#552b99", "#0095FF", "#22c55e", "#f97316", "#ef4444", "#000000"].map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded border-2 ${buttonColor === color ? "border-foreground" : "border-transparent"}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setButtonColor(color)}
                    />
                  ))}
                </div>
              </div>
              <Button type="button" size="sm" onClick={insertButton} className="w-full">
                Inserir Botão
              </Button>
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
