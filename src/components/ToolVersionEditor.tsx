import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Plus, X, Upload, Video, ExternalLink, Settings, Webhook, Link, 
  Layers, Sparkles, Zap, Target, Star, Calendar, Trash2, Copy, Check, Globe,
  Languages
} from "lucide-react";
import type { ToolVersion } from "@/pages/AdminManagePacks";

interface TutorialLesson {
  title: string;
  description: string;
  videoUrl: string;
  buttons: { text: string; url: string }[];
}

type LocaleKey = 'pt' | 'es' | 'en';

const LOCALE_INFO: { key: LocaleKey; label: string; flag: string }[] = [
  { key: 'pt', label: 'Português', flag: '🇧🇷' },
  { key: 'es', label: 'Español', flag: '🇪🇸' },
  { key: 'en', label: 'English', flag: '🇬🇧' },
];

interface ToolVersionEditorProps {
  versions: ToolVersion[];
  selectedIndex: number;
  onSelectVersion: (index: number) => void;
  onAddVersion: () => void;
  onUpdateVersion: (index: number, updates: Partial<ToolVersion>) => void;
  onRemoveVersion: (index: number) => void;
  onSave: () => void;
  saving: boolean;
  // Version cover
  coverPreview: string | null;
  onCoverChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearCover: () => void;
  // Webhook URL for copying
  webhookUrl: string;
}

const BADGE_ICONS = [
  { value: 'sparkles', label: 'Sparkles', icon: Sparkles },
  { value: 'zap', label: 'Zap', icon: Zap },
  { value: 'target', label: 'Target', icon: Target },
  { value: 'star', label: 'Star', icon: Star },
];

const BADGE_COLORS = [
  { value: 'yellow', label: 'Amarelo', className: 'bg-yellow-500/30 text-yellow-300' },
  { value: 'blue', label: 'Azul', className: 'bg-blue-500/30 text-blue-300' },
  { value: 'purple', label: 'Roxo', className: 'bg-purple-500/30 text-purple-300' },
  { value: 'green', label: 'Verde', className: 'bg-green-500/30 text-green-300' },
  { value: 'orange', label: 'Laranja', className: 'bg-orange-500/30 text-orange-300' },
];

const ToolVersionEditor = ({
  versions,
  selectedIndex,
  onSelectVersion,
  onAddVersion,
  onUpdateVersion,
  onRemoveVersion,
  onSave,
  saving,
  coverPreview,
  onCoverChange,
  onClearCover,
  webhookUrl
}: ToolVersionEditorProps) => {
  const [activeTab, setActiveTab] = useState<'info' | 'webhook' | 'links' | 'aulas'>('info');
  const [selectedLocale, setSelectedLocale] = useState<LocaleKey>('pt');
  const currentVersion = versions[selectedIndex];

  if (!currentVersion) {
    return (
      <div className="text-center py-8">
        <Layers className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Nenhuma versão configurada</p>
        <Button onClick={onAddVersion} className="mt-4">
          <Plus className="w-4 h-4 mr-2" />
          Criar Primeira Versão
        </Button>
      </div>
    );
  }

  // Get current lessons based on locale
  const getCurrentLessons = (): TutorialLesson[] => {
    if (selectedLocale === 'pt') {
      return currentVersion.lessons || [];
    }
    return currentVersion.localized?.[selectedLocale]?.lessons || [];
  };

  // Get current name based on locale
  const getCurrentName = (): string => {
    if (selectedLocale === 'pt') {
      return currentVersion.name;
    }
    return currentVersion.localized?.[selectedLocale]?.name || '';
  };

  // Update name based on locale
  const updateCurrentName = (value: string) => {
    if (selectedLocale === 'pt') {
      onUpdateVersion(selectedIndex, { name: value });
    } else {
      const localized = { ...currentVersion.localized };
      localized[selectedLocale] = { ...localized[selectedLocale], name: value };
      onUpdateVersion(selectedIndex, { localized });
    }
  };

  // Update lessons based on locale
  const updateCurrentLessons = (lessons: TutorialLesson[]) => {
    if (selectedLocale === 'pt') {
      onUpdateVersion(selectedIndex, { lessons });
    } else {
      const localized = { ...currentVersion.localized };
      localized[selectedLocale] = { ...localized[selectedLocale], lessons };
      onUpdateVersion(selectedIndex, { localized });
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("URL do webhook copiada!");
  };

  // Lesson management for current version (locale-aware)
  const addLesson = () => {
    const currentLessons = getCurrentLessons();
    const updated = [...currentLessons, { title: '', description: '', videoUrl: '', buttons: [] }];
    updateCurrentLessons(updated);
  };

  // Clean video URL - extract src from iframe if pasted
  const cleanVideoUrl = (input: string): string => {
    if (input.includes('<iframe')) {
      const srcMatch = input.match(/src="([^"]+)"/);
      if (srcMatch && srcMatch[1]) {
        return srcMatch[1];
      }
    }
    return input;
  };

  const updateLesson = (lessonIndex: number, field: keyof TutorialLesson, value: any) => {
    const currentLessons = getCurrentLessons();
    const lessons = [...currentLessons];
    // Clean video URL if it's an iframe
    const cleanedValue = field === 'videoUrl' ? cleanVideoUrl(value) : value;
    lessons[lessonIndex] = { ...lessons[lessonIndex], [field]: cleanedValue };
    updateCurrentLessons(lessons);
  };

  const removeLesson = (lessonIndex: number) => {
    const currentLessons = getCurrentLessons();
    const lessons = currentLessons.filter((_, i) => i !== lessonIndex);
    updateCurrentLessons(lessons);
  };

  const addLessonButton = (lessonIndex: number) => {
    const currentLessons = getCurrentLessons();
    const lessons = [...currentLessons];
    lessons[lessonIndex] = {
      ...lessons[lessonIndex],
      buttons: [...(lessons[lessonIndex].buttons || []), { text: '', url: '' }]
    };
    updateCurrentLessons(lessons);
  };

  const updateLessonButton = (lessonIndex: number, buttonIndex: number, field: 'text' | 'url', value: string) => {
    const currentLessons = getCurrentLessons();
    const lessons = [...currentLessons];
    const buttons = [...lessons[lessonIndex].buttons];
    buttons[buttonIndex] = { ...buttons[buttonIndex], [field]: value };
    lessons[lessonIndex] = { ...lessons[lessonIndex], buttons };
    updateCurrentLessons(lessons);
  };

  const removeLessonButton = (lessonIndex: number, buttonIndex: number) => {
    const currentLessons = getCurrentLessons();
    const lessons = [...currentLessons];
    lessons[lessonIndex] = {
      ...lessons[lessonIndex],
      buttons: lessons[lessonIndex].buttons.filter((_, i) => i !== buttonIndex)
    };
    updateCurrentLessons(lessons);
  };

  // Badge management
  const addBadge = () => {
    const badges = [...currentVersion.badges, { text: 'NOVO', icon: 'sparkles' as const, color: 'yellow' as const }];
    onUpdateVersion(selectedIndex, { badges });
  };

  const updateBadge = (badgeIndex: number, field: string, value: string) => {
    const badges = [...currentVersion.badges];
    badges[badgeIndex] = { ...badges[badgeIndex], [field]: value } as any;
    onUpdateVersion(selectedIndex, { badges });
  };

  const removeBadge = (badgeIndex: number) => {
    const badges = currentVersion.badges.filter((_, i) => i !== badgeIndex);
    onUpdateVersion(selectedIndex, { badges });
  };

  // Sales field helpers
  const updateSales = (field: string, value: any) => {
    onUpdateVersion(selectedIndex, {
      sales: { ...currentVersion.sales, [field]: value }
    });
  };

  const updateWebhook = (field: string, value: number | null) => {
    onUpdateVersion(selectedIndex, {
      webhook: { ...currentVersion.webhook, [field]: value }
    });
  };

  const formatPriceInput = (cents: string, currency: 'BRL' | 'USD' = 'BRL') => {
    const value = parseInt(cents) || 0;
    if (currency === 'USD') {
      return `$ ${(value / 100).toFixed(2)}`;
    }
    return `R$ ${(value / 100).toFixed(2).replace('.', ',')}`;
  };

  const actualCoverPreview = coverPreview || currentVersion.cover_url;

  return (
    <div className="space-y-4">
      {/* Version Tabs */}
      <div className="flex items-center gap-2 flex-wrap border-b pb-3">
        <Label className="text-sm font-semibold text-muted-foreground mr-2 flex items-center gap-1">
          <Layers className="w-4 h-4" />
          Versões:
        </Label>
        {versions.map((version, index) => (
          <Button
            key={version.id}
            variant={selectedIndex === index ? "default" : "outline"}
            size="sm"
            onClick={() => onSelectVersion(index)}
            className="min-w-[60px]"
          >
            {version.name}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddVersion}
          className="border-dashed border"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Version Name & Delete */}
      <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {currentVersion.name}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Acesso imediato
          </span>
        </div>
        {versions.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemoveVersion(selectedIndex)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Language Selector Tabs */}
      <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
        <Languages className="w-4 h-4 text-blue-400" />
        <Label className="text-sm font-semibold text-blue-400 mr-2">Idioma:</Label>
        <div className="flex gap-1">
          {LOCALE_INFO.map((locale) => (
            <Button
              key={locale.key}
              variant={selectedLocale === locale.key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedLocale(locale.key)}
              className={`min-w-[80px] ${
                selectedLocale === locale.key 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'border-blue-500/30 hover:bg-blue-500/20'
              }`}
            >
              <span className="mr-1">{locale.flag}</span>
              {locale.label}
            </Button>
          ))}
        </div>
        {selectedLocale !== 'pt' && (
          <Badge variant="outline" className="ml-auto text-xs border-orange-500/50 text-orange-400">
            Conteúdo em {LOCALE_INFO.find(l => l.key === selectedLocale)?.label}
          </Badge>
        )}
      </div>

      {/* Sub-Tabs for version content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info" className="flex items-center gap-1 text-xs">
            <Settings className="w-3 h-3" />
            Info
          </TabsTrigger>
          <TabsTrigger value="webhook" className="flex items-center gap-1 text-xs">
            <Webhook className="w-3 h-3" />
            Webhook
          </TabsTrigger>
          <TabsTrigger value="links" className="flex items-center gap-1 text-xs">
            <Link className="w-3 h-3" />
            Vendas
          </TabsTrigger>
          <TabsTrigger value="aulas" className="flex items-center gap-1 text-xs">
            <Video className="w-3 h-3" />
            Aulas
          </TabsTrigger>
        </TabsList>

        {/* INFO TAB */}
        <TabsContent value="info" className="space-y-4 mt-4">
          {/* Locale-specific name field */}
          {selectedLocale !== 'pt' && (
            <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <Label className="text-sm text-orange-400 flex items-center gap-2">
                {LOCALE_INFO.find(l => l.key === selectedLocale)?.flag} Nome da Versão em {LOCALE_INFO.find(l => l.key === selectedLocale)?.label}
              </Label>
              <Input
                value={getCurrentName()}
                onChange={(e) => updateCurrentName(e.target.value)}
                placeholder={`Nome em ${LOCALE_INFO.find(l => l.key === selectedLocale)?.label}...`}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Deixe vazio para usar o nome em português ({currentVersion.name})
              </p>
            </div>
          )}
          
          {/* Main fields - only editable in PT */}
          <div className={`grid grid-cols-2 gap-4 ${selectedLocale !== 'pt' ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <Label>Nome da Versão {selectedLocale !== 'pt' && '(Português)'}</Label>
              <Input
                value={currentVersion.name}
                onChange={(e) => onUpdateVersion(selectedIndex, { name: e.target.value })}
                placeholder="Ex: v1.0"
                disabled={selectedLocale !== 'pt'}
              />
            </div>
            <div>
              <Label>Slug (URL)</Label>
              <Input
                value={currentVersion.slug}
                onChange={(e) => onUpdateVersion(selectedIndex, { slug: e.target.value })}
                placeholder="Ex: v1"
                disabled={selectedLocale !== 'pt'}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Label>Visível</Label>
            <Switch
              checked={currentVersion.is_visible}
              onCheckedChange={(checked) => onUpdateVersion(selectedIndex, { is_visible: checked })}
            />
          </div>

          {/* Cover Image */}
          <div>
            <Label>Imagem de Capa da Versão</Label>
            <div className="mt-2">
              {actualCoverPreview ? (
                <div className="relative">
                  <img
                    src={actualCoverPreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={onClearCover}
                  >
                    Remover
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Clique para enviar</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={onCoverChange}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Badges/Tags
              </Label>
              <Button variant="outline" size="sm" onClick={addBadge}>
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>
            {currentVersion.badges.length === 0 && (
              <p className="text-sm text-muted-foreground italic">Nenhum badge adicionado</p>
            )}
            {currentVersion.badges.map((badge, index) => (
              <div key={index} className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg">
                <Input
                  value={badge.text}
                  onChange={(e) => updateBadge(index, 'text', e.target.value)}
                  placeholder="Texto"
                  className="flex-1"
                />
                <Select value={badge.icon} onValueChange={(v) => updateBadge(index, 'icon', v)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BADGE_ICONS.map((icon) => (
                      <SelectItem key={icon.value} value={icon.value}>
                        <icon.icon className="w-4 h-4" />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={badge.color} onValueChange={(v) => updateBadge(index, 'color', v)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BADGE_COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className={`px-2 py-0.5 rounded text-xs ${color.className}`}>
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeBadge(index)}
                  className="text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* WEBHOOK TAB */}
        <TabsContent value="webhook" className="space-y-4 mt-4">
          {/* Greenn Webhook Section */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Webhook className="w-5 h-5 text-primary" />
              <Label className="font-semibold">🇧🇷 Greenn (Versão Português)</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Cole esta URL no seu produto da Greenn para receber as vendas automaticamente.
            </p>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="text-xs bg-background" />
              <Button variant="outline" size="icon" onClick={handleCopyWebhook}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="border-t pt-4">
            <Label className="font-semibold mb-3 block">IDs dos Produtos Greenn - {currentVersion.name}</Label>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">ID Produto 6 Meses</Label>
                <Input
                  type="number"
                  value={currentVersion.webhook.greenn_product_id_6_meses || ''}
                  onChange={(e) => updateWebhook('greenn_product_id_6_meses', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Ex: 89608"
                />
              </div>
              <div>
                <Label className="text-sm">ID Produto 1 Ano</Label>
                <Input
                  type="number"
                  value={currentVersion.webhook.greenn_product_id_1_ano || ''}
                  onChange={(e) => updateWebhook('greenn_product_id_1_ano', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Ex: 89595"
                />
              </div>
              <div>
                <Label className="text-sm">ID Order Bump Vitalício</Label>
                <Input
                  type="number"
                  value={currentVersion.webhook.greenn_product_id_order_bump || ''}
                  onChange={(e) => updateWebhook('greenn_product_id_order_bump', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Ex: 92417"
                />
              </div>
              <div>
                <Label className="text-sm">ID Vitalício Standalone</Label>
                <Input
                  type="number"
                  value={currentVersion.webhook.greenn_product_id_vitalicio || ''}
                  onChange={(e) => updateWebhook('greenn_product_id_vitalicio', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Ex: 149334"
                />
              </div>
            </div>
          </div>

          {/* Hotmart Webhook Section */}
          <div className="border-t pt-4 mt-4">
            <div className="bg-orange-500/10 rounded-lg p-4 space-y-3 border border-orange-500/30">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-orange-500" />
                <Label className="font-semibold text-orange-400">🇪🇸 Hotmart (Versão Espanhol)</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Cole esta URL no seu produto da Hotmart para vendas em espanhol.
              </p>
              <div className="flex gap-2">
                <Input 
                  value="https://jooojbaljrshgpaxdlou.supabase.co/functions/v1/webhook-hotmart-artes" 
                  readOnly 
                  className="text-xs bg-background" 
                />
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => {
                    navigator.clipboard.writeText("https://jooojbaljrshgpaxdlou.supabase.co/functions/v1/webhook-hotmart-artes");
                    toast.success("URL do webhook Hotmart copiada!");
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <Label className="text-sm font-medium text-orange-400">ID Produto Hotmart (Vitalício)</Label>
              <Input
                type="text"
                value={currentVersion.webhook.hotmart_product_id_vitalicio || ''}
                onChange={(e) => onUpdateVersion(selectedIndex, {
                  webhook: { ...currentVersion.webhook, hotmart_product_id_vitalicio: e.target.value || null }
                })}
                placeholder="Ex: 1234567 (ID do produto na Hotmart)"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Encontre este ID no painel da Hotmart → Produtos → Meu Produto → ID do Produto
              </p>
            </div>
          </div>
        </TabsContent>

        {/* SALES TAB */}
        <TabsContent value="links" className="mt-4">
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {/* Preço Normal */}
              <div className="border rounded-lg p-4 space-y-4">
                <Label className="font-semibold text-lg">💰 Preço Normal - {currentVersion.name}</Label>
                
                {/* 6 Meses */}
                <div className={`border-b pb-4 ${!currentVersion.sales.enabled_6_meses ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="font-medium">6 Meses</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Habilitado</span>
                      <Switch
                        checked={currentVersion.sales.enabled_6_meses}
                        onCheckedChange={(checked) => updateSales('enabled_6_meses', checked)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Valor BRL (centavos)</Label>
                      <Input
                        type="number"
                        value={currentVersion.sales.price_6_meses || ''}
                        onChange={(e) => updateSales('price_6_meses', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="2700"
                        disabled={!currentVersion.sales.enabled_6_meses}
                      />
                      {currentVersion.sales.price_6_meses && (
                        <p className="text-xs text-green-600 mt-1">{formatPriceInput(String(currentVersion.sales.price_6_meses))}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Valor USD (centavos)</Label>
                      <Input
                        type="number"
                        value={currentVersion.sales.price_6_meses_usd || ''}
                        onChange={(e) => updateSales('price_6_meses_usd', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="700"
                        disabled={!currentVersion.sales.enabled_6_meses}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Link Checkout</Label>
                      <Input
                        type="url"
                        value={currentVersion.sales.checkout_link_6_meses || ''}
                        onChange={(e) => updateSales('checkout_link_6_meses', e.target.value || null)}
                        placeholder="https://..."
                        disabled={!currentVersion.sales.enabled_6_meses}
                      />
                    </div>
                  </div>
                </div>

                {/* 1 Ano */}
                <div className={`border-b pb-4 ${!currentVersion.sales.enabled_1_ano ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="font-medium">1 Ano</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Habilitado</span>
                      <Switch
                        checked={currentVersion.sales.enabled_1_ano}
                        onCheckedChange={(checked) => updateSales('enabled_1_ano', checked)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Valor BRL (centavos)</Label>
                      <Input
                        type="number"
                        value={currentVersion.sales.price_1_ano || ''}
                        onChange={(e) => updateSales('price_1_ano', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="3700"
                        disabled={!currentVersion.sales.enabled_1_ano}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Valor USD (centavos)</Label>
                      <Input
                        type="number"
                        value={currentVersion.sales.price_1_ano_usd || ''}
                        onChange={(e) => updateSales('price_1_ano_usd', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="900"
                        disabled={!currentVersion.sales.enabled_1_ano}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Link Checkout</Label>
                      <Input
                        type="url"
                        value={currentVersion.sales.checkout_link_1_ano || ''}
                        onChange={(e) => updateSales('checkout_link_1_ano', e.target.value || null)}
                        placeholder="https://..."
                        disabled={!currentVersion.sales.enabled_1_ano}
                      />
                    </div>
                  </div>
                </div>

                {/* Vitalício */}
                <div className={`${!currentVersion.sales.enabled_vitalicio ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="font-medium">Vitalício</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Habilitado</span>
                      <Switch
                        checked={currentVersion.sales.enabled_vitalicio}
                        onCheckedChange={(checked) => updateSales('enabled_vitalicio', checked)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Valor BRL (centavos)</Label>
                      <Input
                        type="number"
                        value={currentVersion.sales.price_vitalicio || ''}
                        onChange={(e) => updateSales('price_vitalicio', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="4700"
                        disabled={!currentVersion.sales.enabled_vitalicio}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Valor USD (centavos)</Label>
                      <Input
                        type="number"
                        value={currentVersion.sales.price_vitalicio_usd || ''}
                        onChange={(e) => updateSales('price_vitalicio_usd', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="1200"
                        disabled={!currentVersion.sales.enabled_vitalicio}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Link Checkout</Label>
                      <Input
                        type="url"
                        value={currentVersion.sales.checkout_link_vitalicio || ''}
                        onChange={(e) => updateSales('checkout_link_vitalicio', e.target.value || null)}
                        placeholder="https://..."
                        disabled={!currentVersion.sales.enabled_vitalicio}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Renovação */}
              <div className="border rounded-lg p-4 space-y-4 border-green-500/30 bg-green-500/5">
                <Badge className="bg-green-500/20 text-green-600">🔄 30% OFF - Renovação</Badge>
                <div className="space-y-3">
                  {currentVersion.sales.enabled_6_meses && (
                    <div>
                      <Label className="text-sm">Link Renovação 6 Meses</Label>
                      <Input
                        type="url"
                        value={currentVersion.sales.checkout_link_renovacao_6_meses || ''}
                        onChange={(e) => updateSales('checkout_link_renovacao_6_meses', e.target.value || null)}
                        placeholder="https://..."
                      />
                    </div>
                  )}
                  {currentVersion.sales.enabled_1_ano && (
                    <div>
                      <Label className="text-sm">Link Renovação 1 Ano</Label>
                      <Input
                        type="url"
                        value={currentVersion.sales.checkout_link_renovacao_1_ano || ''}
                        onChange={(e) => updateSales('checkout_link_renovacao_1_ano', e.target.value || null)}
                        placeholder="https://..."
                      />
                    </div>
                  )}
                  {currentVersion.sales.enabled_vitalicio && (
                    <div>
                      <Label className="text-sm">Link Renovação Vitalício</Label>
                      <Input
                        type="url"
                        value={currentVersion.sales.checkout_link_renovacao_vitalicio || ''}
                        onChange={(e) => updateSales('checkout_link_renovacao_vitalicio', e.target.value || null)}
                        placeholder="https://..."
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Membros */}
              <div className="border rounded-lg p-4 space-y-4 border-purple-500/30 bg-purple-500/5">
                <Badge className="bg-purple-500/20 text-purple-600">👑 20% OFF - Membros</Badge>
                <div className="space-y-3">
                  {currentVersion.sales.enabled_6_meses && (
                    <div>
                      <Label className="text-sm">Link Membro 6 Meses</Label>
                      <Input
                        type="url"
                        value={currentVersion.sales.checkout_link_membro_6_meses || ''}
                        onChange={(e) => updateSales('checkout_link_membro_6_meses', e.target.value || null)}
                        placeholder="https://..."
                      />
                    </div>
                  )}
                  {currentVersion.sales.enabled_1_ano && (
                    <div>
                      <Label className="text-sm">Link Membro 1 Ano</Label>
                      <Input
                        type="url"
                        value={currentVersion.sales.checkout_link_membro_1_ano || ''}
                        onChange={(e) => updateSales('checkout_link_membro_1_ano', e.target.value || null)}
                        placeholder="https://..."
                      />
                    </div>
                  )}
                  {currentVersion.sales.enabled_vitalicio && (
                    <div>
                      <Label className="text-sm">Link Membro Vitalício</Label>
                      <Input
                        type="url"
                        value={currentVersion.sales.checkout_link_membro_vitalicio || ''}
                        onChange={(e) => updateSales('checkout_link_membro_vitalicio', e.target.value || null)}
                        placeholder="https://..."
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* AULAS TAB */}
        <TabsContent value="aulas" className="mt-4">
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {/* Locale indicator for Aulas */}
              {selectedLocale !== 'pt' && (
                <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg mb-4">
                  <p className="text-sm text-orange-400 flex items-center gap-2">
                    {LOCALE_INFO.find(l => l.key === selectedLocale)?.flag}
                    Editando aulas em <strong>{LOCALE_INFO.find(l => l.key === selectedLocale)?.label}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Estas aulas serão exibidas para usuários que acessam em {LOCALE_INFO.find(l => l.key === selectedLocale)?.label}
                  </p>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <Label className="font-semibold flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Aulas - {currentVersion.name} 
                  {selectedLocale !== 'pt' && (
                    <Badge variant="outline" className="text-xs border-orange-500/50 text-orange-400 ml-2">
                      {LOCALE_INFO.find(l => l.key === selectedLocale)?.flag} {LOCALE_INFO.find(l => l.key === selectedLocale)?.label}
                    </Badge>
                  )}
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={addLesson}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Aula
                </Button>
              </div>
              
              {getCurrentLessons().length === 0 && (
                <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                  <Video className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma aula cadastrada {selectedLocale !== 'pt' ? `em ${LOCALE_INFO.find(l => l.key === selectedLocale)?.label}` : ''}</p>
                  <p className="text-xs">Clique em "Adicionar Aula" para começar</p>
                </div>
              )}
              
              {getCurrentLessons().map((lesson, lessonIndex) => (
                <div key={lessonIndex} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Aula {lessonIndex + 1}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLesson(lessonIndex)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">Título da Aula</Label>
                    <Input
                      value={lesson.title}
                      onChange={(e) => updateLesson(lessonIndex, 'title', e.target.value)}
                      placeholder="Ex: Aula 1 - Introdução"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">Descrição (opcional)</Label>
                    <Textarea
                      value={lesson.description || ''}
                      onChange={(e) => updateLesson(lessonIndex, 'description', e.target.value)}
                      placeholder="Descreva o conteúdo desta aula..."
                      className="min-h-[60px]"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">URL do Vídeo (YouTube, Vimeo, etc.)</Label>
                    <Input
                      value={lesson.videoUrl}
                      onChange={(e) => updateLesson(lessonIndex, 'videoUrl', e.target.value)}
                      placeholder="Ex: https://youtube.com/watch?v=..."
                    />
                  </div>
                  
                  {/* Lesson Buttons */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        Links de Ação (opcional)
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addLessonButton(lessonIndex)}
                        className="h-6 text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Adicionar Link
                      </Button>
                    </div>
                    
                    {lesson.buttons?.map((button, buttonIndex) => (
                      <div key={buttonIndex} className="flex gap-2 items-center">
                        <Input
                          value={button.text}
                          onChange={(e) => updateLessonButton(lessonIndex, buttonIndex, 'text', e.target.value)}
                          placeholder="Texto do botão"
                          className="flex-1"
                        />
                        <Input
                          value={button.url}
                          onChange={(e) => updateLessonButton(lessonIndex, buttonIndex, 'url', e.target.value)}
                          placeholder="URL"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLessonButton(lessonIndex, buttonIndex)}
                          className="text-destructive hover:text-destructive h-8 w-8 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <Button onClick={onSave} disabled={saving} className="w-full mt-4">
        {saving ? "Salvando Versões..." : "Salvar Todas as Versões"}
      </Button>
    </div>
  );
};

export default ToolVersionEditor;