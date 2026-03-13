import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Palette,
  Undo,
  Redo,
  Code,
  Minus,
  ChevronDown,
  X,
} from "lucide-react";

interface EmailHtmlEditorProps {
  value: string;
  onChange: (html: string) => void;
}

const PRESET_COLORS = [
  "#ffffff", "#e2d8f0", "#f5e27a", "#d4af37", "#c4b5fd", "#a78bfa",
  "#fca5a5", "#9ca3af", "#4b5563", "#1e0a3c", "#0d0015", "#000000",
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6",
];

const FONT_SIZES = ["12px", "13px", "14px", "15px", "16px", "18px", "20px", "24px", "28px", "32px"];

const VARIABLE_BUTTONS = [
  { label: "Nome", value: "{{USER_NAME}}" },
  { label: "Plano", value: "{{PLAN_NAME}}" },
  { label: "Valor", value: "{{PLAN_VALUE}}" },
  { label: "Vencimento", value: "{{DUE_DATE}}" },
  { label: "Benefícios", value: "{{BENEFITS_LIST}}" },
  { label: "Perdas", value: "{{LOSSES_LIST}}" },
];

export const EmailHtmlEditor = ({ value, onChange }: EmailHtmlEditorProps) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [showFontSize, setShowFontSize] = useState(false);
  const [showSourceCode, setShowSourceCode] = useState(false);
  const [sourceCode, setSourceCode] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TextStyle,
      Color,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      Image.configure({ inline: true, allowBase64: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none min-h-[300px] p-4 focus:outline-none text-sm",
        style: "color: #e2d8f0; background: #1e0a3c; border-radius: 0 0 8px 8px;",
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value]);

  const addLink = useCallback(() => {
    if (!editor || !linkUrl) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    setLinkUrl("");
    setShowLinkInput(false);
  }, [editor, linkUrl]);

  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
    setShowLinkInput(false);
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor || !imageUrl) return;
    editor.chain().focus().setImage({ src: imageUrl }).run();
    setImageUrl("");
    setShowImageInput(false);
  }, [editor, imageUrl]);

  const setFontSize = useCallback((size: string) => {
    if (!editor) return;
    editor.chain().focus().setMark("textStyle", { fontSize: size }).run();
    setShowFontSize(false);
  }, [editor]);

  const insertVariable = useCallback((variable: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(variable).run();
  }, [editor]);

  const toggleSourceCode = () => {
    if (showSourceCode) {
      // Apply source code changes back to editor
      if (editor) {
        editor.commands.setContent(sourceCode, false);
        onChange(sourceCode);
      }
      setShowSourceCode(false);
    } else {
      setSourceCode(editor?.getHTML() || "");
      setShowSourceCode(true);
    }
  };

  if (!editor) return null;

  const ToolbarButton = ({
    onClick,
    active,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded hover:bg-white/10 transition-colors ${
        active ? "bg-white/20 text-white" : "text-gray-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-[#150828] border-b border-border p-1.5 flex flex-wrap gap-0.5 items-center">
        {/* Undo/Redo */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Desfazer">
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Refazer">
          <Redo className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          title="Título 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Título 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Título 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Font Size */}
        <div className="relative">
          <ToolbarButton onClick={() => setShowFontSize(!showFontSize)} title="Tamanho da fonte">
            <div className="flex items-center gap-0.5">
              <Type className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
            </div>
          </ToolbarButton>
          {showFontSize && (
            <div className="absolute top-full left-0 mt-1 bg-[#1e0a3c] border border-border rounded-lg shadow-xl z-20 py-1 min-w-[80px]">
              {FONT_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setFontSize(size)}
                  className="block w-full text-left px-3 py-1 text-xs text-gray-300 hover:bg-white/10 hover:text-white"
                >
                  {size}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Negrito"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Itálico"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Sublinhado"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="Riscado"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Color */}
        <div className="relative">
          <ToolbarButton onClick={() => setShowColorPicker(!showColorPicker)} title="Cor do texto">
            <Palette className="h-4 w-4" />
          </ToolbarButton>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-[#1e0a3c] border border-border rounded-lg shadow-xl z-20 p-2 w-[180px]">
              <div className="grid grid-cols-6 gap-1">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      editor.chain().focus().setColor(color).run();
                      setShowColorPicker(false);
                    }}
                    className="w-6 h-6 rounded border border-white/20 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <div className="mt-2 flex gap-1">
                <input
                  type="color"
                  onChange={(e) => {
                    editor.chain().focus().setColor(e.target.value).run();
                    setShowColorPicker(false);
                  }}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                  title="Cor personalizada"
                />
                <span className="text-xs text-gray-400 self-center">Personalizada</span>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="Alinhar à esquerda"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="Centralizar"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="Alinhar à direita"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Lista"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Lista numerada"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Link */}
        <ToolbarButton
          onClick={() => {
            if (editor.isActive("link")) {
              removeLink();
            } else {
              setShowLinkInput(!showLinkInput);
            }
          }}
          active={editor.isActive("link")}
          title="Inserir link"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>

        {/* Image */}
        <ToolbarButton onClick={() => setShowImageInput(!showImageInput)} title="Inserir imagem">
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>

        {/* Horizontal rule */}
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha horizontal">
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Source code toggle */}
        <ToolbarButton onClick={toggleSourceCode} active={showSourceCode} title="Código fonte HTML">
          <Code className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Link input */}
      {showLinkInput && (
        <div className="bg-[#150828] border-b border-border p-2 flex gap-2 items-center">
          <Input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="text-xs h-7 flex-1"
            onKeyDown={(e) => e.key === "Enter" && addLink()}
          />
          <Button size="sm" className="h-7 text-xs" onClick={addLink}>
            Inserir
          </Button>
          {editor.isActive("link") && (
            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={removeLink}>
              Remover
            </Button>
          )}
          <button type="button" onClick={() => setShowLinkInput(false)} className="text-gray-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Image input */}
      {showImageInput && (
        <div className="bg-[#150828] border-b border-border p-2 flex gap-2 items-center">
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="URL da imagem..."
            className="text-xs h-7 flex-1"
            onKeyDown={(e) => e.key === "Enter" && addImage()}
          />
          <Button size="sm" className="h-7 text-xs" onClick={addImage}>
            Inserir
          </Button>
          <button type="button" onClick={() => setShowImageInput(false)} className="text-gray-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Variables bar */}
      <div className="bg-[#150828]/50 border-b border-border px-2 py-1 flex gap-1 flex-wrap items-center">
        <span className="text-xs text-gray-500 mr-1">Variáveis:</span>
        {VARIABLE_BUTTONS.map((v) => (
          <button
            key={v.value}
            type="button"
            onClick={() => insertVariable(v.value)}
            className="px-2 py-0.5 text-xs bg-purple-900/40 text-purple-300 rounded hover:bg-purple-800/60 transition-colors border border-purple-700/30"
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Editor or Source Code */}
      {showSourceCode ? (
        <textarea
          value={sourceCode}
          onChange={(e) => setSourceCode(e.target.value)}
          className="w-full min-h-[300px] p-4 bg-[#1e0a3c] text-gray-300 font-mono text-xs resize-y focus:outline-none"
          spellCheck={false}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
};
