import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Upload, GripVertical, Package, Gift, GraduationCap, BookOpen, Cpu, Eye, EyeOff, Copy, Webhook, Settings, Link, Check, Video, ExternalLink, X, Globe, Layers, Sparkles, Zap, Target, Calendar } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import ToolVersionEditor from "@/components/ToolVersionEditor";

interface TutorialLesson {
  title: string;
  description: string;
  videoUrl: string;
  buttons: { text: string; url: string }[];
}

// Tool Version Interfaces
interface ToolVersionWebhook {
  greenn_product_id_6_meses: number | null;
  greenn_product_id_1_ano: number | null;
  greenn_product_id_order_bump: number | null;
  greenn_product_id_vitalicio: number | null;
}

interface ToolVersionSales {
  price_6_meses: number | null;
  price_1_ano: number | null;
  price_vitalicio: number | null;
  price_6_meses_usd: number | null;
  price_1_ano_usd: number | null;
  price_vitalicio_usd: number | null;
  enabled_6_meses: boolean;
  enabled_1_ano: boolean;
  enabled_vitalicio: boolean;
  checkout_link_6_meses: string | null;
  checkout_link_1_ano: string | null;
  checkout_link_vitalicio: string | null;
  checkout_link_renovacao_6_meses: string | null;
  checkout_link_renovacao_1_ano: string | null;
  checkout_link_renovacao_vitalicio: string | null;
  checkout_link_membro_6_meses: string | null;
  checkout_link_membro_1_ano: string | null;
  checkout_link_membro_vitalicio: string | null;
  notification_discount_enabled: boolean;
  notification_discount_percent: number | null;
  checkout_link_notif_6_meses: string | null;
  checkout_link_notif_1_ano: string | null;
  checkout_link_notif_vitalicio: string | null;
  checkout_link_latam_6_meses: string | null;
  checkout_link_latam_1_ano: string | null;
  checkout_link_latam_vitalicio: string | null;
  checkout_link_latam_renovacao_6_meses: string | null;
  checkout_link_latam_renovacao_1_ano: string | null;
  checkout_link_latam_renovacao_vitalicio: string | null;
  checkout_link_latam_membro_6_meses: string | null;
  checkout_link_latam_membro_1_ano: string | null;
  checkout_link_latam_membro_vitalicio: string | null;
}

interface ToolVersionBadge {
  text: string;
  icon: 'sparkles' | 'zap' | 'target' | 'star';
  color: 'yellow' | 'blue' | 'purple' | 'green' | 'orange';
}

export interface ToolVersion {
  id: string;
  name: string;
  slug: string;
  cover_url: string | null;
  display_order: number;
  is_visible: boolean;
  unlock_days: number;
  badges: ToolVersionBadge[];
  lessons: TutorialLesson[];
  webhook: ToolVersionWebhook;
  sales: ToolVersionSales;
}

interface Pack {
  id: string;
  name: string;
  slug: string;
  cover_url: string | null;
  display_order: number;
  type: 'pack' | 'bonus' | 'curso' | 'tutorial' | 'ferramentas_ia' | 'ferramenta';
  is_visible: boolean;
  greenn_product_id_6_meses?: number | null;
  greenn_product_id_1_ano?: number | null;
  greenn_product_id_order_bump?: number | null;
  greenn_product_id_vitalicio?: number | null;
  // Normal checkout links
  checkout_link_6_meses?: string | null;
  checkout_link_1_ano?: string | null;
  checkout_link_vitalicio?: string | null;
  // Prices BRL (in cents)
  price_6_meses?: number | null;
  price_1_ano?: number | null;
  price_vitalicio?: number | null;
  // Prices USD (in cents)
  price_6_meses_usd?: number | null;
  price_1_ano_usd?: number | null;
  price_vitalicio_usd?: number | null;
  // Enabled toggles
  enabled_6_meses?: boolean;
  enabled_1_ano?: boolean;
  enabled_vitalicio?: boolean;
  // Renewal checkout links (30% OFF)
  checkout_link_renovacao_6_meses?: string | null;
  checkout_link_renovacao_1_ano?: string | null;
  checkout_link_renovacao_vitalicio?: string | null;
  // Member checkout links (20% OFF)
  checkout_link_membro_6_meses?: string | null;
  checkout_link_membro_1_ano?: string | null;
  checkout_link_membro_vitalicio?: string | null;
  // Notification discount (20% OFF for push subscribers)
  notification_discount_enabled?: boolean;
  notification_discount_percent?: number | null;
  checkout_link_notif_6_meses?: string | null;
  checkout_link_notif_1_ano?: string | null;
  checkout_link_notif_vitalicio?: string | null;
  // LATAM checkout links
  checkout_link_latam_6_meses?: string | null;
  checkout_link_latam_1_ano?: string | null;
  checkout_link_latam_vitalicio?: string | null;
  checkout_link_latam_renovacao_6_meses?: string | null;
  checkout_link_latam_renovacao_1_ano?: string | null;
  checkout_link_latam_renovacao_vitalicio?: string | null;
  checkout_link_latam_membro_6_meses?: string | null;
  checkout_link_latam_membro_1_ano?: string | null;
  checkout_link_latam_membro_vitalicio?: string | null;
  // Bonus download link
  download_url?: string | null;
  // Tutorial lessons
  tutorial_lessons?: TutorialLesson[] | null;
}

type ItemType = 'pack' | 'bonus' | 'curso' | 'tutorial' | 'ferramentas_ia' | 'ferramenta';

interface WebhookFormData {
  greenn_product_id_6_meses: string;
  greenn_product_id_1_ano: string;
  greenn_product_id_order_bump: string;
  greenn_product_id_vitalicio: string;
}

interface SalesFormData {
  // Prices BRL
  price_6_meses: string;
  price_1_ano: string;
  price_vitalicio: string;
  // Prices USD
  price_6_meses_usd: string;
  price_1_ano_usd: string;
  price_vitalicio_usd: string;
  // Enabled toggles
  enabled_6_meses: boolean;
  enabled_1_ano: boolean;
  enabled_vitalicio: boolean;
  // Normal checkout links
  checkout_link_6_meses: string;
  checkout_link_1_ano: string;
  checkout_link_vitalicio: string;
  // Renewal checkout links (30% OFF)
  checkout_link_renovacao_6_meses: string;
  checkout_link_renovacao_1_ano: string;
  checkout_link_renovacao_vitalicio: string;
  // Member checkout links (20% OFF)
  checkout_link_membro_6_meses: string;
  checkout_link_membro_1_ano: string;
  checkout_link_membro_vitalicio: string;
  // Notification discount (20% OFF for push subscribers)
  notification_discount_enabled: boolean;
  notification_discount_percent: string;
  checkout_link_notif_6_meses: string;
  checkout_link_notif_1_ano: string;
  checkout_link_notif_vitalicio: string;
  // LATAM checkout links
  checkout_link_latam_6_meses: string;
  checkout_link_latam_1_ano: string;
  checkout_link_latam_vitalicio: string;
  checkout_link_latam_renovacao_6_meses: string;
  checkout_link_latam_renovacao_1_ano: string;
  checkout_link_latam_renovacao_vitalicio: string;
  checkout_link_latam_membro_6_meses: string;
  checkout_link_latam_membro_1_ano: string;
  checkout_link_latam_membro_vitalicio: string;
}

const WEBHOOK_URL = "https://jooojbaljrshgpaxdlou.supabase.co/functions/v1/webhook-greenn-artes";

const AdminManagePacks = () => {
  const navigate = useNavigate();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTypeSelectOpen, setIsTypeSelectOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<Pack | null>(null);
  const [formData, setFormData] = useState({ name: "", slug: "", type: "pack" as ItemType });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<ItemType>('pack');
  const [activeTab, setActiveTab] = useState<ItemType>('pack');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [editTab, setEditTab] = useState<'info' | 'webhook' | 'links'>('info');
  
  // Tool Version States
  const [toolVersions, setToolVersions] = useState<ToolVersion[]>([]);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [versionEditTab, setVersionEditTab] = useState<'info' | 'webhook' | 'links' | 'aulas'>('info');
  const [versionCoverFile, setVersionCoverFile] = useState<File | null>(null);
  const [versionCoverPreview, setVersionCoverPreview] = useState<string | null>(null);
  
  const [webhookFormData, setWebhookFormData] = useState<WebhookFormData>({
    greenn_product_id_6_meses: '',
    greenn_product_id_1_ano: '',
    greenn_product_id_order_bump: '',
    greenn_product_id_vitalicio: ''
  });
  const [salesFormData, setSalesFormData] = useState<SalesFormData>({
    price_6_meses: '',
    price_1_ano: '',
    price_vitalicio: '',
    price_6_meses_usd: '',
    price_1_ano_usd: '',
    price_vitalicio_usd: '',
    enabled_6_meses: true,
    enabled_1_ano: true,
    enabled_vitalicio: true,
    checkout_link_6_meses: '',
    checkout_link_1_ano: '',
    checkout_link_vitalicio: '',
    checkout_link_renovacao_6_meses: '',
    checkout_link_renovacao_1_ano: '',
    checkout_link_renovacao_vitalicio: '',
    checkout_link_membro_6_meses: '',
    checkout_link_membro_1_ano: '',
    checkout_link_membro_vitalicio: '',
    notification_discount_enabled: false,
    notification_discount_percent: '20',
    checkout_link_notif_6_meses: '',
    checkout_link_notif_1_ano: '',
    checkout_link_notif_vitalicio: '',
    checkout_link_latam_6_meses: '',
    checkout_link_latam_1_ano: '',
    checkout_link_latam_vitalicio: '',
    checkout_link_latam_renovacao_6_meses: '',
    checkout_link_latam_renovacao_1_ano: '',
    checkout_link_latam_renovacao_vitalicio: '',
    checkout_link_latam_membro_6_meses: '',
    checkout_link_latam_membro_1_ano: '',
    checkout_link_latam_membro_vitalicio: ''
  });

  useEffect(() => {
    checkAdmin();
    fetchPacks();
  }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/admin-login");
      return;
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin");
    if (!roles || roles.length === 0) {
      navigate("/");
    }
  };

  const fetchPacks = async () => {
    const { data, error } = await supabase
      .from("artes_packs")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar itens");
      return;
    }
    setPacks((data || []) as unknown as Pack[]);
    setLoading(false);
  };

  const getPacksByType = (type: ItemType) => {
    // Include 'ferramenta' type when filtering for 'ferramentas_ia'
    if (type === 'ferramentas_ia') {
      return packs.filter(p => p.type === 'ferramentas_ia' || p.type === 'ferramenta');
    }
    return packs.filter(p => p.type === type);
  };

  const handleDragStart = (index: number, type: ItemType) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = async (type: ItemType) => {
    if (draggedIndex === null || dragOverIndex === null || draggedIndex === dragOverIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const typeFiltered = getPacksByType(type);
    const newPacks = [...typeFiltered];
    const [draggedPack] = newPacks.splice(draggedIndex, 1);
    newPacks.splice(dragOverIndex, 0, draggedPack);

    // Update local state immediately for smooth UX
    const updatedAll = packs.map(p => {
      if (p.type !== type) return p;
      const idx = newPacks.findIndex(np => np.id === p.id);
      return idx >= 0 ? { ...p, display_order: idx } : p;
    });
    setPacks(updatedAll);
    setDraggedIndex(null);
    setDragOverIndex(null);

    // Update display_order in database
    try {
      for (let i = 0; i < newPacks.length; i++) {
        await supabase
          .from("artes_packs")
          .update({ display_order: i })
          .eq("id", newPacks[i].id);
      }
      toast.success("Ordem atualizada!");
    } catch (error) {
      toast.error("Erro ao salvar ordem");
      fetchPacks(); // Revert on error
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Imagem deve ter no máximo 5MB");
        return;
      }
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const uploadCover = async (packId: string): Promise<string | null> => {
    if (!coverFile) return null;
    
    const fileExt = coverFile.name.split(".").pop();
    const fileName = `${packId}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from("pack-covers")
      .upload(fileName, coverFile, { upsert: true });

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data } = supabase.storage.from("pack-covers").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleTypeSelect = (type: ItemType) => {
    setSelectedType(type);
    setIsTypeSelectOpen(false);
    setIsAddOpen(true);
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const typeItems = getPacksByType(selectedType);
      const maxOrder = typeItems.length > 0 ? Math.max(...typeItems.map(p => p.display_order), 0) : 0;
      
      const { data, error } = await supabase
        .from("artes_packs")
        .insert({
          name: formData.name,
          slug: formData.slug || generateSlug(formData.name),
          display_order: maxOrder + 1,
          type: selectedType
        })
        .select()
        .single();

      if (error) throw error;

      if (coverFile && data) {
        const coverUrl = await uploadCover(data.id);
        if (coverUrl) {
          await supabase
            .from("artes_packs")
            .update({ cover_url: coverUrl })
            .eq("id", data.id);
        }
      }

      const typeLabel = selectedType === 'pack' ? 'Pack' : selectedType === 'bonus' ? 'Bônus' : 'Curso';
      toast.success(`${typeLabel} criado com sucesso!`);
      setIsAddOpen(false);
      resetForm();
      fetchPacks();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar item");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingPack || !formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setSaving(true);
    try {
      let coverUrl = editingPack.cover_url;
      
      if (coverFile) {
        const newCoverUrl = await uploadCover(editingPack.id);
        if (newCoverUrl) coverUrl = newCoverUrl;
      }

      const updateData: any = {
        name: formData.name,
        slug: formData.slug || generateSlug(formData.name),
        cover_url: coverUrl,
        type: formData.type
      };
      
      // Only save download_url for bonus type
      if (formData.type === 'bonus') {
        updateData.download_url = downloadUrl || null;
      }
      
      // Save tutorial_lessons for tutorial and ferramentas_ia types
      if (formData.type === 'tutorial' || formData.type === 'ferramentas_ia' || formData.type === 'ferramenta') {
        updateData.tutorial_lessons = tutorialLessons.length > 0 ? tutorialLessons : [];
      }
      
      const { error } = await supabase
        .from("artes_packs")
        .update(updateData)
        .eq("id", editingPack.id);

      if (error) throw error;

      toast.success("Item atualizado com sucesso!");
      setEditingPack(null);
      resetForm();
      fetchPacks();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar item");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pack: Pack) => {
    const typeLabel = pack.type === 'pack' ? 'pack' : pack.type === 'bonus' ? 'bônus' : 'curso';
    if (!confirm(`Tem certeza que deseja excluir o ${typeLabel} "${pack.name}"?`)) return;

    try {
      // Check if pack has artes (only for packs and bonus)
      if (pack.type !== 'curso') {
        const { count } = await supabase
          .from("admin_artes")
          .select("*", { count: "exact", head: true })
          .eq("pack", pack.name);

        if (count && count > 0) {
          toast.error(`Este ${typeLabel} possui ${count} artes. Remova ou mova as artes antes de excluir.`);
          return;
        }
      }

      const { error } = await supabase
        .from("artes_packs")
        .delete()
        .eq("id", pack.id);

      if (error) throw error;

      // Delete cover from storage
      if (pack.cover_url) {
        const fileName = pack.cover_url.split("/").pop();
        if (fileName) {
          await supabase.storage.from("pack-covers").remove([fileName]);
        }
      }

      toast.success("Item excluído com sucesso!");
      fetchPacks();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir item");
    }
  };

  const handleToggleVisibility = async (pack: Pack) => {
    try {
      const { error } = await supabase
        .from("artes_packs")
        .update({ is_visible: !pack.is_visible })
        .eq("id", pack.id);

      if (error) throw error;

      toast.success(pack.is_visible ? "Item ocultado" : "Item visível");
      fetchPacks();
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar visibilidade");
    }
  };

  const [tutorialLessons, setTutorialLessons] = useState<TutorialLesson[]>([]);

  const resetForm = () => {
    setFormData({ name: "", slug: "", type: "pack" });
    setCoverFile(null);
    setCoverPreview(null);
    setDownloadUrl('');
    setTutorialLessons([]);
    // Reset version states
    setToolVersions([]);
    setSelectedVersionIndex(0);
    setVersionEditTab('info');
    setVersionCoverFile(null);
    setVersionCoverPreview(null);
  };

  // === Tool Version Management Functions ===
  const createEmptyVersion = (versionNumber: number): ToolVersion => ({
    id: `v${versionNumber}`,
    name: `v${versionNumber}.0`,
    slug: `v${versionNumber}`,
    cover_url: null,
    display_order: versionNumber - 1,
    is_visible: true,
    unlock_days: versionNumber === 1 ? 0 : 7,
    badges: [],
    lessons: [],
    webhook: {
      greenn_product_id_6_meses: null,
      greenn_product_id_1_ano: null,
      greenn_product_id_order_bump: null,
      greenn_product_id_vitalicio: null
    },
    sales: {
      price_6_meses: null,
      price_1_ano: null,
      price_vitalicio: null,
      price_6_meses_usd: null,
      price_1_ano_usd: null,
      price_vitalicio_usd: null,
      enabled_6_meses: true,
      enabled_1_ano: true,
      enabled_vitalicio: true,
      checkout_link_6_meses: null,
      checkout_link_1_ano: null,
      checkout_link_vitalicio: null,
      checkout_link_renovacao_6_meses: null,
      checkout_link_renovacao_1_ano: null,
      checkout_link_renovacao_vitalicio: null,
      checkout_link_membro_6_meses: null,
      checkout_link_membro_1_ano: null,
      checkout_link_membro_vitalicio: null,
      notification_discount_enabled: false,
      notification_discount_percent: 20,
      checkout_link_notif_6_meses: null,
      checkout_link_notif_1_ano: null,
      checkout_link_notif_vitalicio: null,
      checkout_link_latam_6_meses: null,
      checkout_link_latam_1_ano: null,
      checkout_link_latam_vitalicio: null,
      checkout_link_latam_renovacao_6_meses: null,
      checkout_link_latam_renovacao_1_ano: null,
      checkout_link_latam_renovacao_vitalicio: null,
      checkout_link_latam_membro_6_meses: null,
      checkout_link_latam_membro_1_ano: null,
      checkout_link_latam_membro_vitalicio: null
    }
  });

  const addToolVersion = () => {
    const newVersionNumber = toolVersions.length + 1;
    const newVersion = createEmptyVersion(newVersionNumber);
    setToolVersions([...toolVersions, newVersion]);
    setSelectedVersionIndex(toolVersions.length);
    setVersionEditTab('info');
    setVersionCoverFile(null);
    setVersionCoverPreview(null);
    toast.success(`Versão ${newVersion.name} criada!`);
  };

  const updateToolVersion = (index: number, updates: Partial<ToolVersion>) => {
    const updated = [...toolVersions];
    updated[index] = { ...updated[index], ...updates };
    setToolVersions(updated);
  };

  const updateVersionWebhook = (index: number, field: keyof ToolVersionWebhook, value: number | null) => {
    const updated = [...toolVersions];
    updated[index] = {
      ...updated[index],
      webhook: { ...updated[index].webhook, [field]: value }
    };
    setToolVersions(updated);
  };

  const updateVersionSales = (index: number, field: keyof ToolVersionSales, value: any) => {
    const updated = [...toolVersions];
    updated[index] = {
      ...updated[index],
      sales: { ...updated[index].sales, [field]: value }
    };
    setToolVersions(updated);
  };

  const addVersionLesson = (versionIndex: number) => {
    const updated = [...toolVersions];
    updated[versionIndex] = {
      ...updated[versionIndex],
      lessons: [...updated[versionIndex].lessons, { title: '', description: '', videoUrl: '', buttons: [] }]
    };
    setToolVersions(updated);
  };

  const updateVersionLesson = (versionIndex: number, lessonIndex: number, field: keyof TutorialLesson, value: any) => {
    const updated = [...toolVersions];
    const lessons = [...updated[versionIndex].lessons];
    lessons[lessonIndex] = { ...lessons[lessonIndex], [field]: value };
    updated[versionIndex] = { ...updated[versionIndex], lessons };
    setToolVersions(updated);
  };

  const removeVersionLesson = (versionIndex: number, lessonIndex: number) => {
    const updated = [...toolVersions];
    updated[versionIndex] = {
      ...updated[versionIndex],
      lessons: updated[versionIndex].lessons.filter((_, i) => i !== lessonIndex)
    };
    setToolVersions(updated);
  };

  const addVersionLessonButton = (versionIndex: number, lessonIndex: number) => {
    const updated = [...toolVersions];
    const lessons = [...updated[versionIndex].lessons];
    lessons[lessonIndex] = {
      ...lessons[lessonIndex],
      buttons: [...(lessons[lessonIndex].buttons || []), { text: '', url: '' }]
    };
    updated[versionIndex] = { ...updated[versionIndex], lessons };
    setToolVersions(updated);
  };

  const updateVersionLessonButton = (versionIndex: number, lessonIndex: number, buttonIndex: number, field: 'text' | 'url', value: string) => {
    const updated = [...toolVersions];
    const lessons = [...updated[versionIndex].lessons];
    const buttons = [...lessons[lessonIndex].buttons];
    buttons[buttonIndex] = { ...buttons[buttonIndex], [field]: value };
    lessons[lessonIndex] = { ...lessons[lessonIndex], buttons };
    updated[versionIndex] = { ...updated[versionIndex], lessons };
    setToolVersions(updated);
  };

  const removeVersionLessonButton = (versionIndex: number, lessonIndex: number, buttonIndex: number) => {
    const updated = [...toolVersions];
    const lessons = [...updated[versionIndex].lessons];
    lessons[lessonIndex] = {
      ...lessons[lessonIndex],
      buttons: lessons[lessonIndex].buttons.filter((_, i) => i !== buttonIndex)
    };
    updated[versionIndex] = { ...updated[versionIndex], lessons };
    setToolVersions(updated);
  };

  const addVersionBadge = (versionIndex: number) => {
    const updated = [...toolVersions];
    updated[versionIndex] = {
      ...updated[versionIndex],
      badges: [...updated[versionIndex].badges, { text: 'NOVO', icon: 'sparkles' as const, color: 'yellow' as const }]
    };
    setToolVersions(updated);
  };

  const updateVersionBadge = (versionIndex: number, badgeIndex: number, updates: Partial<ToolVersionBadge>) => {
    const updated = [...toolVersions];
    const badges = [...updated[versionIndex].badges];
    badges[badgeIndex] = { ...badges[badgeIndex], ...updates } as ToolVersionBadge;
    updated[versionIndex] = { ...updated[versionIndex], badges };
    setToolVersions(updated);
  };

  const removeVersionBadge = (versionIndex: number, badgeIndex: number) => {
    const updated = [...toolVersions];
    updated[versionIndex] = {
      ...updated[versionIndex],
      badges: updated[versionIndex].badges.filter((_, i) => i !== badgeIndex)
    };
    setToolVersions(updated);
  };

  const removeToolVersion = (index: number) => {
    if (toolVersions.length <= 1) {
      toast.error("É necessário ter pelo menos uma versão");
      return;
    }
    const updated = toolVersions.filter((_, i) => i !== index);
    // Re-order display_order
    updated.forEach((v, i) => { v.display_order = i; });
    setToolVersions(updated);
    setSelectedVersionIndex(Math.max(0, index - 1));
    toast.success("Versão removida");
  };

  const uploadVersionCover = async (packId: string, versionId: string): Promise<string | null> => {
    if (!versionCoverFile) return null;
    
    const fileExt = versionCoverFile.name.split(".").pop();
    const fileName = `${packId}-${versionId}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from("pack-covers")
      .upload(fileName, versionCoverFile, { upsert: true });

    if (error) {
      console.error("Upload version cover error:", error);
      return null;
    }

    const { data } = supabase.storage.from("pack-covers").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSaveToolVersions = async () => {
    if (!editingPack) return;
    
    setSaving(true);
    try {
      // Upload version cover if there's a new one
      if (versionCoverFile && toolVersions[selectedVersionIndex]) {
        const coverUrl = await uploadVersionCover(editingPack.id, toolVersions[selectedVersionIndex].id);
        if (coverUrl) {
          const updated = [...toolVersions];
          updated[selectedVersionIndex] = { ...updated[selectedVersionIndex], cover_url: coverUrl };
          setToolVersions(updated);
          
          // Update in DB
          const { error } = await supabase
            .from("artes_packs")
            .update({ tool_versions: updated as unknown as any })
            .eq("id", editingPack.id);
          
          if (error) throw error;
        }
      } else {
        const { error } = await supabase
          .from("artes_packs")
          .update({ tool_versions: toolVersions as unknown as any })
          .eq("id", editingPack.id);

        if (error) throw error;
      }

      toast.success("Versões salvas com sucesso!");
      setVersionCoverFile(null);
      fetchPacks();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar versões");
    } finally {
      setSaving(false);
    }
  };

  const handleVersionCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Imagem deve ter no máximo 5MB");
        return;
      }
      setVersionCoverFile(file);
      setVersionCoverPreview(URL.createObjectURL(file));
    }
  };

  const openEdit = (pack: Pack) => {
    setEditingPack(pack);
    setFormData({ name: pack.name, slug: pack.slug, type: pack.type });
    setCoverPreview(pack.cover_url);
    setCoverFile(null);
    setEditTab('info');
    setDownloadUrl(pack.download_url || '');
    setTutorialLessons((pack.tutorial_lessons as TutorialLesson[]) || []);
    
    // Load tool versions for ferramentas_ia types
    if (pack.type === 'ferramentas_ia' || pack.type === 'ferramenta') {
      const versions = (pack as any).tool_versions as ToolVersion[] | null;
      if (versions && versions.length > 0) {
        setToolVersions(versions);
      } else {
        // Create default v1 if no versions exist
        setToolVersions([createEmptyVersion(1)]);
      }
      setSelectedVersionIndex(0);
      setVersionEditTab('info');
      setVersionCoverFile(null);
      setVersionCoverPreview(null);
    } else {
      setToolVersions([]);
    }
    
    setWebhookFormData({
      greenn_product_id_6_meses: pack.greenn_product_id_6_meses?.toString() || '',
      greenn_product_id_1_ano: pack.greenn_product_id_1_ano?.toString() || '',
      greenn_product_id_order_bump: pack.greenn_product_id_order_bump?.toString() || '',
      greenn_product_id_vitalicio: pack.greenn_product_id_vitalicio?.toString() || ''
    });
    setSalesFormData({
      price_6_meses: pack.price_6_meses?.toString() || '2700',
      price_1_ano: pack.price_1_ano?.toString() || '3700',
      price_vitalicio: pack.price_vitalicio?.toString() || '4700',
      price_6_meses_usd: pack.price_6_meses_usd?.toString() || '',
      price_1_ano_usd: pack.price_1_ano_usd?.toString() || '',
      price_vitalicio_usd: pack.price_vitalicio_usd?.toString() || '',
      enabled_6_meses: pack.enabled_6_meses ?? true,
      enabled_1_ano: pack.enabled_1_ano ?? true,
      enabled_vitalicio: pack.enabled_vitalicio ?? true,
      checkout_link_6_meses: pack.checkout_link_6_meses || '',
      checkout_link_1_ano: pack.checkout_link_1_ano || '',
      checkout_link_vitalicio: pack.checkout_link_vitalicio || '',
      checkout_link_renovacao_6_meses: pack.checkout_link_renovacao_6_meses || '',
      checkout_link_renovacao_1_ano: pack.checkout_link_renovacao_1_ano || '',
      checkout_link_renovacao_vitalicio: pack.checkout_link_renovacao_vitalicio || '',
      checkout_link_membro_6_meses: pack.checkout_link_membro_6_meses || '',
      checkout_link_membro_1_ano: pack.checkout_link_membro_1_ano || '',
      checkout_link_membro_vitalicio: pack.checkout_link_membro_vitalicio || '',
      notification_discount_enabled: pack.notification_discount_enabled ?? false,
      notification_discount_percent: pack.notification_discount_percent?.toString() || '20',
      checkout_link_notif_6_meses: pack.checkout_link_notif_6_meses || '',
      checkout_link_notif_1_ano: pack.checkout_link_notif_1_ano || '',
      checkout_link_notif_vitalicio: pack.checkout_link_notif_vitalicio || '',
      checkout_link_latam_6_meses: pack.checkout_link_latam_6_meses || '',
      checkout_link_latam_1_ano: pack.checkout_link_latam_1_ano || '',
      checkout_link_latam_vitalicio: pack.checkout_link_latam_vitalicio || '',
      checkout_link_latam_renovacao_6_meses: pack.checkout_link_latam_renovacao_6_meses || '',
      checkout_link_latam_renovacao_1_ano: pack.checkout_link_latam_renovacao_1_ano || '',
      checkout_link_latam_renovacao_vitalicio: pack.checkout_link_latam_renovacao_vitalicio || '',
      checkout_link_latam_membro_6_meses: pack.checkout_link_latam_membro_6_meses || '',
      checkout_link_latam_membro_1_ano: pack.checkout_link_latam_membro_1_ano || '',
      checkout_link_latam_membro_vitalicio: pack.checkout_link_latam_membro_vitalicio || ''
    });
  };

  const addLesson = () => {
    setTutorialLessons([...tutorialLessons, { title: '', description: '', videoUrl: '', buttons: [] }]);
  };

  const updateLesson = (index: number, field: keyof TutorialLesson, value: any) => {
    const updated = [...tutorialLessons];
    updated[index] = { ...updated[index], [field]: value };
    setTutorialLessons(updated);
  };

  const removeLesson = (index: number) => {
    setTutorialLessons(tutorialLessons.filter((_, i) => i !== index));
  };

  const addLessonButton = (lessonIndex: number) => {
    const updated = [...tutorialLessons];
    updated[lessonIndex].buttons = [...(updated[lessonIndex].buttons || []), { text: '', url: '' }];
    setTutorialLessons(updated);
  };

  const updateLessonButton = (lessonIndex: number, buttonIndex: number, field: 'text' | 'url', value: string) => {
    const updated = [...tutorialLessons];
    updated[lessonIndex].buttons[buttonIndex] = { ...updated[lessonIndex].buttons[buttonIndex], [field]: value };
    setTutorialLessons(updated);
  };

  const removeLessonButton = (lessonIndex: number, buttonIndex: number) => {
    const updated = [...tutorialLessons];
    updated[lessonIndex].buttons = updated[lessonIndex].buttons.filter((_, i) => i !== buttonIndex);
    setTutorialLessons(updated);
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(WEBHOOK_URL);
    toast.success("URL do webhook copiada!");
  };

  const handleSaveWebhookConfig = async () => {
    if (!editingPack) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("artes_packs")
        .update({
          greenn_product_id_6_meses: webhookFormData.greenn_product_id_6_meses ? parseInt(webhookFormData.greenn_product_id_6_meses) : null,
          greenn_product_id_1_ano: webhookFormData.greenn_product_id_1_ano ? parseInt(webhookFormData.greenn_product_id_1_ano) : null,
          greenn_product_id_order_bump: webhookFormData.greenn_product_id_order_bump ? parseInt(webhookFormData.greenn_product_id_order_bump) : null,
          greenn_product_id_vitalicio: webhookFormData.greenn_product_id_vitalicio ? parseInt(webhookFormData.greenn_product_id_vitalicio) : null
        })
        .eq("id", editingPack.id);

      if (error) throw error;

      toast.success("Configuração de webhook salva!");
      fetchPacks();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSalesConfig = async () => {
    if (!editingPack) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("artes_packs")
        .update({
          // Prices BRL
          price_6_meses: salesFormData.price_6_meses ? parseInt(salesFormData.price_6_meses) : null,
          price_1_ano: salesFormData.price_1_ano ? parseInt(salesFormData.price_1_ano) : null,
          price_vitalicio: salesFormData.price_vitalicio ? parseInt(salesFormData.price_vitalicio) : null,
          // Prices USD
          price_6_meses_usd: salesFormData.price_6_meses_usd ? parseInt(salesFormData.price_6_meses_usd) : null,
          price_1_ano_usd: salesFormData.price_1_ano_usd ? parseInt(salesFormData.price_1_ano_usd) : null,
          price_vitalicio_usd: salesFormData.price_vitalicio_usd ? parseInt(salesFormData.price_vitalicio_usd) : null,
          // Enabled toggles
          enabled_6_meses: salesFormData.enabled_6_meses,
          enabled_1_ano: salesFormData.enabled_1_ano,
          enabled_vitalicio: salesFormData.enabled_vitalicio,
          // Normal checkout links
          checkout_link_6_meses: salesFormData.checkout_link_6_meses || null,
          checkout_link_1_ano: salesFormData.checkout_link_1_ano || null,
          checkout_link_vitalicio: salesFormData.checkout_link_vitalicio || null,
          // Renewal checkout links
          checkout_link_renovacao_6_meses: salesFormData.checkout_link_renovacao_6_meses || null,
          checkout_link_renovacao_1_ano: salesFormData.checkout_link_renovacao_1_ano || null,
          checkout_link_renovacao_vitalicio: salesFormData.checkout_link_renovacao_vitalicio || null,
          // Member checkout links
          checkout_link_membro_6_meses: salesFormData.checkout_link_membro_6_meses || null,
          checkout_link_membro_1_ano: salesFormData.checkout_link_membro_1_ano || null,
          checkout_link_membro_vitalicio: salesFormData.checkout_link_membro_vitalicio || null,
          // Notification discount
          notification_discount_enabled: salesFormData.notification_discount_enabled,
          notification_discount_percent: salesFormData.notification_discount_percent ? parseInt(salesFormData.notification_discount_percent) : 20,
          checkout_link_notif_6_meses: salesFormData.checkout_link_notif_6_meses || null,
          checkout_link_notif_1_ano: salesFormData.checkout_link_notif_1_ano || null,
          checkout_link_notif_vitalicio: salesFormData.checkout_link_notif_vitalicio || null,
          // LATAM checkout links
          checkout_link_latam_6_meses: salesFormData.checkout_link_latam_6_meses || null,
          checkout_link_latam_1_ano: salesFormData.checkout_link_latam_1_ano || null,
          checkout_link_latam_vitalicio: salesFormData.checkout_link_latam_vitalicio || null,
          checkout_link_latam_renovacao_6_meses: salesFormData.checkout_link_latam_renovacao_6_meses || null,
          checkout_link_latam_renovacao_1_ano: salesFormData.checkout_link_latam_renovacao_1_ano || null,
          checkout_link_latam_renovacao_vitalicio: salesFormData.checkout_link_latam_renovacao_vitalicio || null,
          checkout_link_latam_membro_6_meses: salesFormData.checkout_link_latam_membro_6_meses || null,
          checkout_link_latam_membro_1_ano: salesFormData.checkout_link_latam_membro_1_ano || null,
          checkout_link_latam_membro_vitalicio: salesFormData.checkout_link_latam_membro_vitalicio || null
        })
        .eq("id", editingPack.id);

      if (error) throw error;

      toast.success("Configurações de vendas salvas!");
      fetchPacks();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };
  
  const formatPriceInput = (cents: string, currency: 'BRL' | 'USD' = 'BRL') => {
    const value = parseInt(cents) || 0;
    if (currency === 'USD') {
      return `$ ${(value / 100).toFixed(2)}`;
    }
    return `R$ ${(value / 100).toFixed(2).replace('.', ',')}`;
  };

  const getTypeIcon = (type: ItemType) => {
    switch (type) {
      case 'pack': return <Package className="w-5 h-5" />;
      case 'bonus': return <Gift className="w-5 h-5" />;
      case 'curso': return <GraduationCap className="w-5 h-5" />;
      case 'tutorial': return <BookOpen className="w-5 h-5" />;
      case 'ferramentas_ia': return <Cpu className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: ItemType) => {
    switch (type) {
      case 'pack': return 'Pack';
      case 'bonus': return 'Bônus';
      case 'curso': return 'Curso';
      case 'tutorial': return 'Tutorial';
      case 'ferramentas_ia': return 'Ferramentas de IA';
    }
  };

  const renderPackList = (type: ItemType) => {
    const items = getPacksByType(type);
    
    return (
      <div className="grid gap-2">
        {items.map((pack, index) => (
          <Card 
            key={pack.id} 
            className={`overflow-hidden cursor-grab active:cursor-grabbing transition-all ${
              draggedIndex === index ? 'opacity-50 scale-95' : ''
            } ${dragOverIndex === index ? 'border-primary border-2' : ''}`}
            draggable
            onDragStart={() => handleDragStart(index, type)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={() => handleDragEnd(type)}
            onDragLeave={() => setDragOverIndex(null)}
          >
            <div className="flex items-center">
              <div className="p-3 cursor-grab text-muted-foreground hover:text-foreground">
                <GripVertical className="w-5 h-5" />
              </div>
              <div className="w-28 h-20 flex-shrink-0">
                {pack.cover_url ? (
                  <img
                    src={pack.cover_url}
                    alt={pack.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center">
                    {getTypeIcon(pack.type)}
                  </div>
                )}
              </div>
              <div className="flex-1 p-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{pack.name}</h3>
                  {!pack.is_visible && (
                    <Badge variant="secondary" className="text-xs">
                      <EyeOff className="w-3 h-3 mr-1" />
                      Oculto
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">/{pack.slug}</p>
              </div>
              <div className="flex gap-2 p-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleToggleVisibility(pack)}
                  title={pack.is_visible ? "Ocultar" : "Mostrar"}
                >
                  {pack.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEdit(pack)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(pack)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {items.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum {getTypeLabel(type).toLowerCase()} cadastrado
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/admin-artes-eventos/ferramentas")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Gerenciar Conteúdo</h1>
          </div>
          
          {/* Type Selection Modal */}
          <Dialog open={isTypeSelectOpen} onOpenChange={setIsTypeSelectOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>O que você deseja criar?</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 mt-4">
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => handleTypeSelect('pack')}
                >
                  <Package className="w-8 h-8 text-primary" />
                  <span className="font-medium">Pack</span>
                  <span className="text-xs text-muted-foreground">Coleção de artes editáveis</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => handleTypeSelect('bonus')}
                >
                  <Gift className="w-8 h-8 text-orange-500" />
                  <span className="font-medium">Bônus</span>
                  <span className="text-xs text-muted-foreground">Conteúdo extra para membros</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => handleTypeSelect('curso')}
                >
                  <GraduationCap className="w-8 h-8 text-blue-500" />
                  <span className="font-medium">Curso</span>
                  <span className="text-xs text-muted-foreground">Curso ou treinamento</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => handleTypeSelect('tutorial')}
                >
                  <BookOpen className="w-8 h-8 text-green-500" />
                  <span className="font-medium">Tutorial</span>
                  <span className="text-xs text-muted-foreground">Tutorial e guias</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => handleTypeSelect('ferramentas_ia')}
                >
                  <Cpu className="w-8 h-8 text-purple-500" />
                  <span className="font-medium">Ferramentas de IA</span>
                  <span className="text-xs text-muted-foreground">Ferramentas de inteligência artificial</span>
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Item Dialog */}
          <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getTypeIcon(selectedType)}
                  Criar Novo {getTypeLabel(selectedType)}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder={`Ex: ${selectedType === 'pack' ? 'Pack Arcano Vol.7' : selectedType === 'bonus' ? 'Bônus Especial' : 'Curso de Design'}`}
                  />
                </div>
                <div>
                  <Label>Slug (URL)</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="slug-do-item"
                  />
                </div>
                <div>
                  <Label>Imagem de Capa</Label>
                  <div className="mt-2">
                    {coverPreview ? (
                      <div className="relative">
                        <img
                          src={coverPreview}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => { setCoverFile(null); setCoverPreview(null); }}
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
                          onChange={handleCoverChange}
                        />
                      </label>
                    )}
                  </div>
                </div>
                <Button onClick={handleAdd} disabled={saving} className="w-full">
                  {saving ? "Salvando..." : `Criar ${getTypeLabel(selectedType)}`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ItemType)} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="pack" className="flex items-center gap-1 text-xs sm:text-sm">
              <Package className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Packs</span>
              <Badge variant="secondary" className="ml-1 text-xs">{getPacksByType('pack').length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="bonus" className="flex items-center gap-1 text-xs sm:text-sm">
              <Gift className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Bônus</span>
              <Badge variant="secondary" className="ml-1 text-xs">{getPacksByType('bonus').length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="curso" className="flex items-center gap-1 text-xs sm:text-sm">
              <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Cursos</span>
              <Badge variant="secondary" className="ml-1 text-xs">{getPacksByType('curso').length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="tutorial" className="flex items-center gap-1 text-xs sm:text-sm">
              <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Tutoriais</span>
              <Badge variant="secondary" className="ml-1 text-xs">{getPacksByType('tutorial').length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="ferramentas_ia" className="flex items-center gap-1 text-xs sm:text-sm">
              <Cpu className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">IA</span>
              <Badge variant="secondary" className="ml-1 text-xs">{getPacksByType('ferramentas_ia').length}</Badge>
            </TabsTrigger>
          </TabsList>

          <p className="text-sm text-muted-foreground mb-4">
            Arraste os itens para reorganizar a ordem de exibição
          </p>

          <TabsContent value="pack">
            {renderPackList('pack')}
          </TabsContent>
          <TabsContent value="bonus">
            {renderPackList('bonus')}
          </TabsContent>
          <TabsContent value="curso">
            {renderPackList('curso')}
          </TabsContent>
          <TabsContent value="tutorial">
            {renderPackList('tutorial')}
          </TabsContent>
          <TabsContent value="ferramentas_ia">
            {renderPackList('ferramentas_ia')}
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={!!editingPack} onOpenChange={(open) => { if (!open) { setEditingPack(null); resetForm(); } }}>
          <DialogContent className={`max-h-[90vh] overflow-y-auto ${(editingPack?.type === 'ferramentas_ia' || editingPack?.type === 'ferramenta') ? 'max-w-3xl' : 'max-w-lg'}`}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingPack && getTypeIcon(editingPack.type)}
                Editar {editingPack && getTypeLabel(editingPack.type)}
              </DialogTitle>
            </DialogHeader>
            
            {/* Special layout for Ferramentas IA - shows ToolVersionEditor */}
            {(editingPack?.type === 'ferramentas_ia' || editingPack?.type === 'ferramenta') ? (
              <div className="mt-4 space-y-4">
                {/* Basic info fields */}
                <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                  <div>
                    <Label>Nome da Ferramenta</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Ex: Upscaler Arcano"
                    />
                  </div>
                  <div>
                    <Label>Slug (URL)</Label>
                    <Input
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="upscaller-arcano"
                    />
                  </div>
                </div>
                
                {/* Tool Version Editor */}
                <ToolVersionEditor
                  versions={toolVersions}
                  selectedIndex={selectedVersionIndex}
                  onSelectVersion={setSelectedVersionIndex}
                  onAddVersion={addToolVersion}
                  onUpdateVersion={updateToolVersion}
                  onRemoveVersion={removeToolVersion}
                  onSave={handleSaveToolVersions}
                  saving={saving}
                  coverPreview={versionCoverPreview}
                  onCoverChange={handleVersionCoverChange}
                  onClearCover={() => {
                    setVersionCoverFile(null);
                    setVersionCoverPreview(null);
                    if (toolVersions[selectedVersionIndex]) {
                      updateToolVersion(selectedVersionIndex, { cover_url: null });
                    }
                  }}
                  webhookUrl={WEBHOOK_URL}
                />
              </div>
            ) : (
            <Tabs value={editTab} onValueChange={(v) => setEditTab(v as 'info' | 'webhook' | 'links')} className="w-full mt-4">
              <TabsList className={`grid w-full ${editingPack?.type === 'bonus' || editingPack?.type === 'tutorial' ? 'grid-cols-1' : 'grid-cols-3'}`}>
                <TabsTrigger value="info" className="flex items-center gap-1 text-xs">
                  <Settings className="w-3 h-3" />
                  Info
                </TabsTrigger>
                {editingPack?.type !== 'bonus' && editingPack?.type !== 'tutorial' && (
                  <>
                    <TabsTrigger value="webhook" className="flex items-center gap-1 text-xs">
                      <Webhook className="w-3 h-3" />
                      Webhook
                    </TabsTrigger>
                    <TabsTrigger value="links" className="flex items-center gap-1 text-xs">
                      <Link className="w-3 h-3" />
                      Vendas
                    </TabsTrigger>
                  </>
                )}
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Nome do item"
                  />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={formData.type} onValueChange={(value: ItemType) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pack">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Pack
                        </div>
                      </SelectItem>
                      <SelectItem value="bonus">
                        <div className="flex items-center gap-2">
                          <Gift className="w-4 h-4" />
                          Bônus
                        </div>
                      </SelectItem>
                      <SelectItem value="curso">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4" />
                          Curso
                        </div>
                      </SelectItem>
                      <SelectItem value="tutorial">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          Tutorial
                        </div>
                      </SelectItem>
                      <SelectItem value="ferramentas_ia">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-4 h-4" />
                          Ferramentas de IA
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Slug (URL)</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="slug-do-item"
                  />
                </div>
                <div>
                  <Label>Imagem de Capa</Label>
                  <div className="mt-2">
                    {coverPreview ? (
                      <div className="relative">
                        <img
                          src={coverPreview}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => { setCoverFile(null); setCoverPreview(null); }}
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
                          onChange={handleCoverChange}
                        />
                      </label>
                    )}
                  </div>
                </div>
                {/* Download URL field - Only for bonus type */}
                {editingPack?.type === 'bonus' && (
                  <div>
                    <Label>Link de Download</Label>
                    <Input
                      value={downloadUrl}
                      onChange={(e) => setDownloadUrl(e.target.value)}
                      placeholder="Ex: https://drive.google.com/..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Link para download direto do bônus (Drive, Dropbox, etc.)
                    </p>
                  </div>
                )}
                
                {/* Tutorial Lessons Editor - Only for tutorial type (ferramentas_ia uses ToolVersionEditor) */}
                {editingPack?.type === 'tutorial' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        Aulas do Tutorial
                      </Label>
                      <Button type="button" variant="outline" size="sm" onClick={addLesson}>
                        <Plus className="w-4 h-4 mr-1" />
                        Adicionar Aula
                      </Button>
                    </div>
                    
                    {tutorialLessons.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                        <Video className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhuma aula cadastrada</p>
                        <p className="text-xs">Clique em "Adicionar Aula" para começar</p>
                      </div>
                    )}
                    
                    {tutorialLessons.map((lesson, lessonIndex) => (
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
                )}
                
                <Button onClick={handleEdit} disabled={saving} className="w-full">
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </TabsContent>

              <TabsContent value="webhook" className="space-y-4 mt-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Webhook className="w-5 h-5 text-primary" />
                    <Label className="font-semibold">URL do Webhook</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Cole esta URL no seu produto da Greenn para receber as vendas automaticamente.
                  </p>
                  <div className="flex gap-2">
                    <Input 
                      value={WEBHOOK_URL} 
                      readOnly 
                      className="text-xs bg-background"
                    />
                    <Button variant="outline" size="icon" onClick={handleCopyWebhook}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="font-semibold mb-3 block">IDs dos Produtos Greenn</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Cole o ID de cada produto/oferta da Greenn no campo correspondente ao tipo de acesso.
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm">ID Produto 6 Meses</Label>
                      <Input
                        type="number"
                        value={webhookFormData.greenn_product_id_6_meses}
                        onChange={(e) => setWebhookFormData(prev => ({ ...prev, greenn_product_id_6_meses: e.target.value }))}
                        placeholder="Ex: 89608"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Acesso 6 meses (sem bônus)</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm">ID Produto 1 Ano</Label>
                      <Input
                        type="number"
                        value={webhookFormData.greenn_product_id_1_ano}
                        onChange={(e) => setWebhookFormData(prev => ({ ...prev, greenn_product_id_1_ano: e.target.value }))}
                        placeholder="Ex: 89595"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Acesso 1 ano (com bônus)</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm">ID Order Bump Vitalício</Label>
                      <Input
                        type="number"
                        value={webhookFormData.greenn_product_id_order_bump}
                        onChange={(e) => setWebhookFormData(prev => ({ ...prev, greenn_product_id_order_bump: e.target.value }))}
                        placeholder="Ex: 92417"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Order bump para upgrade vitalício (com bônus)</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm">ID Vitalício Standalone</Label>
                      <Input
                        type="number"
                        value={webhookFormData.greenn_product_id_vitalicio}
                        onChange={(e) => setWebhookFormData(prev => ({ ...prev, greenn_product_id_vitalicio: e.target.value }))}
                        placeholder="Ex: 149334"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Produto vitalício avulso (com bônus)</p>
                    </div>
                  </div>
                </div>
                
                <Button onClick={handleSaveWebhookConfig} disabled={saving} className="w-full">
                  {saving ? "Salvando..." : "Salvar Configuração Webhook"}
                </Button>
              </TabsContent>

              <TabsContent value="links" className="space-y-6 mt-4 max-h-[60vh] overflow-y-auto pr-2">
                {/* PREÇO NORMAL */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Link className="w-5 h-5 text-primary" />
                    <Label className="font-semibold text-lg">💰 Preço Normal</Label>
                  </div>
                  
                  {/* 6 Meses */}
                  <div className={`border-b pb-4 ${!salesFormData.enabled_6_meses ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Label className="font-medium">6 Meses</Label>
                        {salesFormData.enabled_6_meses && salesFormData.price_6_meses && salesFormData.checkout_link_6_meses && (
                          <Check className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Habilitado</span>
                        <Switch
                          checked={salesFormData.enabled_6_meses}
                          onCheckedChange={(checked) => setSalesFormData(prev => ({ ...prev, enabled_6_meses: checked }))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="relative">
                        <Label className="text-xs text-muted-foreground">Valor BRL (centavos)</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={salesFormData.price_6_meses}
                            onChange={(e) => setSalesFormData(prev => ({ ...prev, price_6_meses: e.target.value }))}
                            placeholder="2700"
                            disabled={!salesFormData.enabled_6_meses}
                            className={salesFormData.price_6_meses && salesFormData.enabled_6_meses ? "pr-8 border-green-500/50" : ""}
                          />
                          {salesFormData.price_6_meses && salesFormData.enabled_6_meses && (
                            <Check className="w-4 h-4 text-green-500 absolute right-2 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                        <p className="text-xs text-green-600 mt-1">{formatPriceInput(salesFormData.price_6_meses)}</p>
                      </div>
                      <div className="relative">
                        <Label className="text-xs text-muted-foreground">Valor USD (centavos)</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={salesFormData.price_6_meses_usd}
                            onChange={(e) => setSalesFormData(prev => ({ ...prev, price_6_meses_usd: e.target.value }))}
                            placeholder="700"
                            disabled={!salesFormData.enabled_6_meses}
                            className={salesFormData.price_6_meses_usd && salesFormData.enabled_6_meses ? "pr-8 border-blue-500/50" : ""}
                          />
                          {salesFormData.price_6_meses_usd && salesFormData.enabled_6_meses && (
                            <Check className="w-4 h-4 text-blue-500 absolute right-2 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                        <p className="text-xs text-blue-600 mt-1">{formatPriceInput(salesFormData.price_6_meses_usd, 'USD')}</p>
                      </div>
                      <div className="relative">
                        <Label className="text-xs text-muted-foreground">Link Checkout BR</Label>
                        <div className="relative">
                          <Input
                            type="url"
                            value={salesFormData.checkout_link_6_meses}
                            onChange={(e) => setSalesFormData(prev => ({ ...prev, checkout_link_6_meses: e.target.value }))}
                            placeholder="https://..."
                            disabled={!salesFormData.enabled_6_meses}
                            className={salesFormData.checkout_link_6_meses && salesFormData.enabled_6_meses ? "pr-8 border-green-500/50" : ""}
                          />
                          {salesFormData.checkout_link_6_meses && salesFormData.enabled_6_meses && (
                            <Check className="w-4 h-4 text-green-500 absolute right-2 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Link Checkout LATAM
                      </Label>
                      <div className="relative">
                        <Input
                          type="url"
                          value={salesFormData.checkout_link_latam_6_meses}
                          onChange={(e) => setSalesFormData(prev => ({ ...prev, checkout_link_latam_6_meses: e.target.value }))}
                          placeholder="https://..."
                          disabled={!salesFormData.enabled_6_meses}
                          className={salesFormData.checkout_link_latam_6_meses && salesFormData.enabled_6_meses ? "pr-8 border-blue-500/50" : ""}
                        />
                        {salesFormData.checkout_link_latam_6_meses && salesFormData.enabled_6_meses && (
                          <Check className="w-4 h-4 text-blue-500 absolute right-2 top-1/2 -translate-y-1/2" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* 1 Ano */}
                  <div className={`border-b pb-4 ${!salesFormData.enabled_1_ano ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Label className="font-medium">1 Ano</Label>
                        {salesFormData.enabled_1_ano && salesFormData.price_1_ano && salesFormData.checkout_link_1_ano && (
                          <Check className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Habilitado</span>
                        <Switch
                          checked={salesFormData.enabled_1_ano}
                          onCheckedChange={(checked) => setSalesFormData(prev => ({ ...prev, enabled_1_ano: checked }))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="relative">
                        <Label className="text-xs text-muted-foreground">Valor BRL (centavos)</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={salesFormData.price_1_ano}
                            onChange={(e) => setSalesFormData(prev => ({ ...prev, price_1_ano: e.target.value }))}
                            placeholder="3700"
                            disabled={!salesFormData.enabled_1_ano}
                            className={salesFormData.price_1_ano && salesFormData.enabled_1_ano ? "pr-8 border-green-500/50" : ""}
                          />
                          {salesFormData.price_1_ano && salesFormData.enabled_1_ano && (
                            <Check className="w-4 h-4 text-green-500 absolute right-2 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                        <p className="text-xs text-green-600 mt-1">{formatPriceInput(salesFormData.price_1_ano)}</p>
                      </div>
                      <div className="relative">
                        <Label className="text-xs text-muted-foreground">Valor USD (centavos)</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={salesFormData.price_1_ano_usd}
                            onChange={(e) => setSalesFormData(prev => ({ ...prev, price_1_ano_usd: e.target.value }))}
                            placeholder="900"
                            disabled={!salesFormData.enabled_1_ano}
                            className={salesFormData.price_1_ano_usd && salesFormData.enabled_1_ano ? "pr-8 border-blue-500/50" : ""}
                          />
                          {salesFormData.price_1_ano_usd && salesFormData.enabled_1_ano && (
                            <Check className="w-4 h-4 text-blue-500 absolute right-2 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                        <p className="text-xs text-blue-600 mt-1">{formatPriceInput(salesFormData.price_1_ano_usd, 'USD')}</p>
                      </div>
                      <div className="relative">
                        <Label className="text-xs text-muted-foreground">Link Checkout BR</Label>
                        <div className="relative">
                          <Input
                            type="url"
                            value={salesFormData.checkout_link_1_ano}
                            onChange={(e) => setSalesFormData(prev => ({ ...prev, checkout_link_1_ano: e.target.value }))}
                            placeholder="https://..."
                            disabled={!salesFormData.enabled_1_ano}
                            className={salesFormData.checkout_link_1_ano && salesFormData.enabled_1_ano ? "pr-8 border-green-500/50" : ""}
                          />
                          {salesFormData.checkout_link_1_ano && salesFormData.enabled_1_ano && (
                            <Check className="w-4 h-4 text-green-500 absolute right-2 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Link Checkout LATAM
                      </Label>
                      <div className="relative">
                        <Input
                          type="url"
                          value={salesFormData.checkout_link_latam_1_ano}
                          onChange={(e) => setSalesFormData(prev => ({ ...prev, checkout_link_latam_1_ano: e.target.value }))}
                          placeholder="https://..."
                          disabled={!salesFormData.enabled_1_ano}
                          className={salesFormData.checkout_link_latam_1_ano && salesFormData.enabled_1_ano ? "pr-8 border-blue-500/50" : ""}
                        />
                        {salesFormData.checkout_link_latam_1_ano && salesFormData.enabled_1_ano && (
                          <Check className="w-4 h-4 text-blue-500 absolute right-2 top-1/2 -translate-y-1/2" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Vitalício */}
                  <div className={!salesFormData.enabled_vitalicio ? 'opacity-50' : ''}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Label className="font-medium">Vitalício</Label>
                        {salesFormData.enabled_vitalicio && salesFormData.price_vitalicio && salesFormData.checkout_link_vitalicio && (
                          <Check className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Habilitado</span>
                        <Switch
                          checked={salesFormData.enabled_vitalicio}
                          onCheckedChange={(checked) => setSalesFormData(prev => ({ ...prev, enabled_vitalicio: checked }))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="relative">
                        <Label className="text-xs text-muted-foreground">Valor BRL (centavos)</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={salesFormData.price_vitalicio}
                            onChange={(e) => setSalesFormData(prev => ({ ...prev, price_vitalicio: e.target.value }))}
                            placeholder="4700"
                            disabled={!salesFormData.enabled_vitalicio}
                            className={salesFormData.price_vitalicio && salesFormData.enabled_vitalicio ? "pr-8 border-green-500/50" : ""}
                          />
                          {salesFormData.price_vitalicio && salesFormData.enabled_vitalicio && (
                            <Check className="w-4 h-4 text-green-500 absolute right-2 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                        <p className="text-xs text-green-600 mt-1">{formatPriceInput(salesFormData.price_vitalicio)}</p>
                      </div>
                      <div className="relative">
                        <Label className="text-xs text-muted-foreground">Valor USD (centavos)</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={salesFormData.price_vitalicio_usd}
                            onChange={(e) => setSalesFormData(prev => ({ ...prev, price_vitalicio_usd: e.target.value }))}
                            placeholder="1200"
                            disabled={!salesFormData.enabled_vitalicio}
                            className={salesFormData.price_vitalicio_usd && salesFormData.enabled_vitalicio ? "pr-8 border-blue-500/50" : ""}
                          />
                          {salesFormData.price_vitalicio_usd && salesFormData.enabled_vitalicio && (
                            <Check className="w-4 h-4 text-blue-500 absolute right-2 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                        <p className="text-xs text-blue-600 mt-1">{formatPriceInput(salesFormData.price_vitalicio_usd, 'USD')}</p>
                      </div>
                      <div className="relative">
                        <Label className="text-xs text-muted-foreground">Link Checkout BR</Label>
                        <div className="relative">
                          <Input
                            type="url"
                            value={salesFormData.checkout_link_vitalicio}
                            onChange={(e) => setSalesFormData(prev => ({ ...prev, checkout_link_vitalicio: e.target.value }))}
                            placeholder="https://..."
                            disabled={!salesFormData.enabled_vitalicio}
                            className={salesFormData.checkout_link_vitalicio && salesFormData.enabled_vitalicio ? "pr-8 border-green-500/50" : ""}
                          />
                          {salesFormData.checkout_link_vitalicio && salesFormData.enabled_vitalicio && (
                            <Check className="w-4 h-4 text-green-500 absolute right-2 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Link Checkout LATAM
                      </Label>
                      <div className="relative">
                        <Input
                          type="url"
                          value={salesFormData.checkout_link_latam_vitalicio}
                          onChange={(e) => setSalesFormData(prev => ({ ...prev, checkout_link_latam_vitalicio: e.target.value }))}
                          placeholder="https://..."
                          disabled={!salesFormData.enabled_vitalicio}
                          className={salesFormData.checkout_link_latam_vitalicio && salesFormData.enabled_vitalicio ? "pr-8 border-blue-500/50" : ""}
                        />
                        {salesFormData.checkout_link_latam_vitalicio && salesFormData.enabled_vitalicio && (
                          <Check className="w-4 h-4 text-blue-500 absolute right-2 top-1/2 -translate-y-1/2" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* RENOVAÇÃO COM DESCONTO (30% OFF) */}
                <div className="border rounded-lg p-4 space-y-4 border-green-500/30 bg-green-500/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-green-500/20 text-green-600">🔄 30% OFF</Badge>
                    <Label className="font-semibold">Renovação com Desconto</Label>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Links para clientes que estão renovando acesso expirado
                  </p>
                  
                  <div className="space-y-3">
                    {salesFormData.enabled_6_meses && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Label className="text-sm">Link Renovação 6 Meses</Label>
                          {salesFormData.checkout_link_renovacao_6_meses && (
                            <Check className="w-3 h-3 text-green-500" />
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type="url"
                            value={salesFormData.checkout_link_renovacao_6_meses}
                            onChange={(e) => setSalesFormData(prev => ({ ...prev, checkout_link_renovacao_6_meses: e.target.value }))}
                            placeholder="https://greenn.com.br/checkout/..."
                            className={salesFormData.checkout_link_renovacao_6_meses ? "pr-8 border-green-500/50" : ""}
                          />
                          {salesFormData.checkout_link_renovacao_6_meses && (
                            <Check className="w-4 h-4 text-green-500 absolute right-2 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                      </div>
                    )}
                    {salesFormData.enabled_1_ano && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Label className="text-sm">Link Renovação 1 Ano</Label>
                          {salesFormData.checkout_link_renovacao_1_ano && (
                            <Check className="w-3 h-3 text-green-500" />
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type="url"
                            value={salesFormData.checkout_link_renovacao_1_ano}
                            onChange={(e) => setSalesFormData(prev => ({ ...prev, checkout_link_renovacao_1_ano: e.target.value }))}
                            placeholder="https://greenn.com.br/checkout/..."
                            className={salesFormData.checkout_link_renovacao_1_ano ? "pr-8 border-green-500/50" : ""}
                          />
                          {salesFormData.checkout_link_renovacao_1_ano && (
                            <Check className="w-4 h-4 text-green-500 absolute right-2 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                      </div>
                    )}
                    {salesFormData.enabled_vitalicio && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Label className="text-sm">Link Renovação Vitalício</Label>
                          {salesFormData.checkout_link_renovacao_vitalicio && (
                            <Check className="w-3 h-3 text-green-500" />
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type="url"
                            value={salesFormData.checkout_link_renovacao_vitalicio}
                            onChange={(e) => setSalesFormData(prev => ({ ...prev, checkout_link_renovacao_vitalicio: e.target.value }))}
                            placeholder="https://greenn.com.br/checkout/..."
                            className={salesFormData.checkout_link_renovacao_vitalicio ? "pr-8 border-green-500/50" : ""}
                          />
                          {salesFormData.checkout_link_renovacao_vitalicio && (
                            <Check className="w-4 h-4 text-green-500 absolute right-2 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                      </div>
                    )}
                    {!salesFormData.enabled_6_meses && !salesFormData.enabled_1_ano && !salesFormData.enabled_vitalicio && (
                      <p className="text-xs text-muted-foreground italic">Nenhuma opção de preço habilitada</p>
                    )}
                  </div>
                </div>

                {/* LATAM - RENOVAÇÃO (30% OFF) */}
                <div className="border rounded-lg p-4 space-y-4 border-blue-500/30 bg-blue-500/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-blue-500/20 text-blue-600">🌎 LATAM 30% OFF</Badge>
                    <Label className="font-semibold">Renovação LATAM</Label>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Links de renovação para clientes da América Latina
                  </p>
                  
                  <div className="space-y-3">
                    {salesFormData.enabled_6_meses && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Label className="text-sm">Link Renovação LATAM 6 Meses</Label>
                          {salesFormData.checkout_link_latam_renovacao_6_meses && (
                            <Check className="w-3 h-3 text-blue-500" />
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type="url"
                            value={salesFormData.checkout_link_latam_renovacao_6_meses}
                            onChange={(e) => setSalesFormData(prev => ({ ...prev, checkout_link_latam_renovacao_6_meses: e.target.value }))}
                            placeholder="https://greenn.com.br/checkout/..."
                            className={salesFormData.checkout_link_latam_renovacao_6_meses ? "pr-8 border-blue-500/50" : ""}
                          />
                          {salesFormData.checkout_link_latam_renovacao_6_meses && (
                            <Check className="w-4 h-4 text-blue-500 absolute right-2 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                      </div>
                    )}
                    {salesFormData.enabled_1_ano && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Label className="text-sm">Link Renovação LATAM 1 Ano</Label>
                          {salesFormData.checkout_link_latam_renovacao_1_ano && (
                            <Check className="w-3 h-3 text-blue-500" />
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type="url"
                            value={salesFormData.checkout_link_latam_renovacao_1_ano}
                            onChange={(e) => setSalesFormData(prev => ({ ...prev, checkout_link_latam_renovacao_1_ano: e.target.value }))}
                            placeholder="https://greenn.com.br/checkout/..."
                            className={salesFormData.checkout_link_latam_renovacao_1_ano ? "pr-8 border-blue-500/50" : ""}
                          />
                          {salesFormData.checkout_link_latam_renovacao_1_ano && (
                            <Check className="w-4 h-4 text-blue-500 absolute right-2 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                      </div>
                    )}
                    {salesFormData.enabled_vitalicio && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Label className="text-sm">Link Renovação LATAM Vitalício</Label>
                          {salesFormData.checkout_link_latam_renovacao_vitalicio && (
                            <Check className="w-3 h-3 text-blue-500" />
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type="url"
                            value={salesFormData.checkout_link_latam_renovacao_vitalicio}
                            onChange={(e) => setSalesFormData(prev => ({ ...prev, checkout_link_latam_renovacao_vitalicio: e.target.value }))}
                            placeholder="https://greenn.com.br/checkout/..."
                            className={salesFormData.checkout_link_latam_renovacao_vitalicio ? "pr-8 border-blue-500/50" : ""}
                          />
                          {salesFormData.checkout_link_latam_renovacao_vitalicio && (
                            <Check className="w-4 h-4 text-blue-500 absolute right-2 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                      </div>
                    )}
                    {!salesFormData.enabled_6_meses && !salesFormData.enabled_1_ano && !salesFormData.enabled_vitalicio && (
                      <p className="text-xs text-muted-foreground italic">Nenhuma opção de preço habilitada</p>
                    )}
                  </div>
                </div>

                {/* DESCONTO PARA MEMBROS BR (20% OFF) */}
                <div className="border rounded-lg p-4 space-y-4 border-purple-500/30 bg-purple-500/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-purple-500/20 text-purple-600">👑 20% OFF</Badge>
                    <Label className="font-semibold">Desconto para Membros (Brasil)</Label>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Links para membros brasileiros que já possuem um pack e querem comprar outro
                  </p>
                  
                  <div className="space-y-3">
                    {salesFormData.enabled_6_meses && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Label className="text-sm">Link Membro 6 Meses</Label>
                          {salesFormData.checkout_link_membro_6_meses && (
                            <Check className="w-3 h-3 text-green-500" />
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type="url"
                            value={salesFormData.checkout_link_membro_6_meses}
                            onChange={(e) => setSalesFormData(prev => ({ ...prev, checkout_link_membro_6_meses: e.target.value }))}
                            placeholder="https://greenn.com.br/checkout/..."
                            className={salesFormData.checkout_link_membro_6_meses ? "pr-8 border-green-500/50" : ""}
                          />
                          {salesFormData.checkout_link_membro_6_meses && (
                            <Check className="w-4 h-4 text-green-500 absolute right-2 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                      </div>
                    )}
                    {salesFormData.enabled_1_ano && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Label className="text-sm">Link Membro 1 Ano</Label>
                          {salesFormData.checkout_link_membro_1_ano && (
                            <Check className="w-3 h-3 text-green-500" />
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type="url"
                            value={salesFormData.checkout_link_membro_1_ano}
                            onChange={(e) => setSalesFormData(prev => ({ ...prev, checkout_link_membro_1_ano: e.target.value }))}
                            placeholder="https://greenn.com.br/checkout/..."
                            className={salesFormData.checkout_link_membro_1_ano ? "pr-8 border-green-500/50" : ""}
                          />
                          {salesFormData.checkout_link_membro_1_ano && (
                            <Check className="w-4 h-4 text-green-500 absolute right-2 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                      </div>
                    )}
                    {salesFormData.enabled_vitalicio && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Label className="text-sm">Link Membro Vitalício</Label>
                          {salesFormData.checkout_link_membro_vitalicio && (
                            <Check className="w-3 h-3 text-green-500" />
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type="url"
                            value={salesFormData.checkout_link_membro_vitalicio}
                            onChange={(e) => setSalesFormData(prev => ({ ...prev, checkout_link_membro_vitalicio: e.target.value }))}
                            placeholder="https://greenn.com.br/checkout/..."
                            className={salesFormData.checkout_link_membro_vitalicio ? "pr-8 border-green-500/50" : ""}
                          />
                          {salesFormData.checkout_link_membro_vitalicio && (
                            <Check className="w-4 h-4 text-green-500 absolute right-2 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                      </div>
                    )}
                    {!salesFormData.enabled_6_meses && !salesFormData.enabled_1_ano && !salesFormData.enabled_vitalicio && (
                      <p className="text-xs text-muted-foreground italic">Nenhuma opção de preço habilitada</p>
                    )}
                  </div>
                </div>

                {/* LATAM - MEMBROS (20% OFF) */}
                <div className="border rounded-lg p-4 space-y-4 border-cyan-500/30 bg-cyan-500/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-cyan-500/20 text-cyan-600">🌎 LATAM 20% OFF</Badge>
                    <Label className="font-semibold">Desconto Membros LATAM</Label>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Links para membros da América Latina que querem comprar outro pack
                  </p>
                  
                  <div className="space-y-3">
                    {salesFormData.enabled_6_meses && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Label className="text-sm">Link Membro LATAM 6 Meses</Label>
                          {salesFormData.checkout_link_latam_membro_6_meses && (
                            <Check className="w-3 h-3 text-cyan-500" />
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type="url"
                            value={salesFormData.checkout_link_latam_membro_6_meses}
                            onChange={(e) => setSalesFormData(prev => ({ ...prev, checkout_link_latam_membro_6_meses: e.target.value }))}
                            placeholder="https://greenn.com.br/checkout/..."
                            className={salesFormData.checkout_link_latam_membro_6_meses ? "pr-8 border-cyan-500/50" : ""}
                          />
                          {salesFormData.checkout_link_latam_membro_6_meses && (
                            <Check className="w-4 h-4 text-cyan-500 absolute right-2 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                      </div>
                    )}
                    {salesFormData.enabled_1_ano && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Label className="text-sm">Link Membro LATAM 1 Ano</Label>
                          {salesFormData.checkout_link_latam_membro_1_ano && (
                            <Check className="w-3 h-3 text-cyan-500" />
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type="url"
                            value={salesFormData.checkout_link_latam_membro_1_ano}
                            onChange={(e) => setSalesFormData(prev => ({ ...prev, checkout_link_latam_membro_1_ano: e.target.value }))}
                            placeholder="https://greenn.com.br/checkout/..."
                            className={salesFormData.checkout_link_latam_membro_1_ano ? "pr-8 border-cyan-500/50" : ""}
                          />
                          {salesFormData.checkout_link_latam_membro_1_ano && (
                            <Check className="w-4 h-4 text-cyan-500 absolute right-2 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                      </div>
                    )}
                    {salesFormData.enabled_vitalicio && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Label className="text-sm">Link Membro LATAM Vitalício</Label>
                          {salesFormData.checkout_link_latam_membro_vitalicio && (
                            <Check className="w-3 h-3 text-cyan-500" />
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type="url"
                            value={salesFormData.checkout_link_latam_membro_vitalicio}
                            onChange={(e) => setSalesFormData(prev => ({ ...prev, checkout_link_latam_membro_vitalicio: e.target.value }))}
                            placeholder="https://greenn.com.br/checkout/..."
                            className={salesFormData.checkout_link_latam_membro_vitalicio ? "pr-8 border-cyan-500/50" : ""}
                          />
                          {salesFormData.checkout_link_latam_membro_vitalicio && (
                            <Check className="w-4 h-4 text-cyan-500 absolute right-2 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                      </div>
                    )}
                    {!salesFormData.enabled_6_meses && !salesFormData.enabled_1_ano && !salesFormData.enabled_vitalicio && (
                      <p className="text-xs text-muted-foreground italic">Nenhuma opção de preço habilitada</p>
                    )}
                  </div>
                </div>

                {/* DESCONTO POR NOTIFICAÇÃO (20% OFF) */}
                <div className="border rounded-lg p-4 space-y-4 border-amber-500/30 bg-amber-500/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-500/20 text-amber-600">🔔 20% OFF</Badge>
                      <Label className="font-semibold">Desconto por Notificação</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Ativo</span>
                      <Switch
                        checked={salesFormData.notification_discount_enabled}
                        onCheckedChange={(checked) => setSalesFormData(prev => ({ ...prev, notification_discount_enabled: checked }))}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Desconto para usuários que ativaram notificações push
                  </p>
                  
                  {salesFormData.notification_discount_enabled && (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm">Percentual de Desconto</Label>
                        <div className="relative w-32">
                          <Input
                            type="number"
                            value={salesFormData.notification_discount_percent}
                            onChange={(e) => setSalesFormData(prev => ({ ...prev, notification_discount_percent: e.target.value }))}
                            placeholder="20"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                        </div>
                      </div>
                      
                      {salesFormData.enabled_6_meses && (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Label className="text-sm">Link Notif. 6 Meses</Label>
                            {salesFormData.checkout_link_notif_6_meses && (
                              <Check className="w-3 h-3 text-green-500" />
                            )}
                          </div>
                          <div className="relative">
                            <Input
                              type="url"
                              value={salesFormData.checkout_link_notif_6_meses}
                              onChange={(e) => setSalesFormData(prev => ({ ...prev, checkout_link_notif_6_meses: e.target.value }))}
                              placeholder="https://greenn.com.br/checkout/..."
                              className={salesFormData.checkout_link_notif_6_meses ? "pr-8 border-green-500/50" : ""}
                            />
                            {salesFormData.checkout_link_notif_6_meses && (
                              <Check className="w-4 h-4 text-green-500 absolute right-2 top-1/2 -translate-y-1/2" />
                            )}
                          </div>
                        </div>
                      )}
                      {salesFormData.enabled_1_ano && (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Label className="text-sm">Link Notif. 1 Ano</Label>
                            {salesFormData.checkout_link_notif_1_ano && (
                              <Check className="w-3 h-3 text-green-500" />
                            )}
                          </div>
                          <div className="relative">
                            <Input
                              type="url"
                              value={salesFormData.checkout_link_notif_1_ano}
                              onChange={(e) => setSalesFormData(prev => ({ ...prev, checkout_link_notif_1_ano: e.target.value }))}
                              placeholder="https://greenn.com.br/checkout/..."
                              className={salesFormData.checkout_link_notif_1_ano ? "pr-8 border-green-500/50" : ""}
                            />
                            {salesFormData.checkout_link_notif_1_ano && (
                              <Check className="w-4 h-4 text-green-500 absolute right-2 top-1/2 -translate-y-1/2" />
                            )}
                          </div>
                        </div>
                      )}
                      {salesFormData.enabled_vitalicio && (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Label className="text-sm">Link Notif. Vitalício</Label>
                            {salesFormData.checkout_link_notif_vitalicio && (
                              <Check className="w-3 h-3 text-green-500" />
                            )}
                          </div>
                          <div className="relative">
                            <Input
                              type="url"
                              value={salesFormData.checkout_link_notif_vitalicio}
                              onChange={(e) => setSalesFormData(prev => ({ ...prev, checkout_link_notif_vitalicio: e.target.value }))}
                              placeholder="https://greenn.com.br/checkout/..."
                              className={salesFormData.checkout_link_notif_vitalicio ? "pr-8 border-green-500/50" : ""}
                            />
                            {salesFormData.checkout_link_notif_vitalicio && (
                              <Check className="w-4 h-4 text-green-500 absolute right-2 top-1/2 -translate-y-1/2" />
                            )}
                          </div>
                        </div>
                      )}
                      {!salesFormData.enabled_6_meses && !salesFormData.enabled_1_ano && !salesFormData.enabled_vitalicio && (
                        <p className="text-xs text-muted-foreground italic">Nenhuma opção de preço habilitada</p>
                      )}
                    </div>
                  )}
                </div>
                
                <Button onClick={handleSaveSalesConfig} disabled={saving} className="w-full">
                  {saving ? "Salvando..." : "Salvar Configurações de Vendas"}
                </Button>
              </TabsContent>
            </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminManagePacks;
