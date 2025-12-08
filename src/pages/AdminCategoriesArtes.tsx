import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  slug: string;
  display_order: number;
}

const AdminCategoriesArtes = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/admin-login');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      toast.error("Acesso negado");
      navigate('/');
      return;
    }

    fetchCategories();
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('artes_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      toast.error("Erro ao carregar categorias");
      console.error(error);
    } else {
      setCategories(data || []);
    }
    setIsLoading(false);
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName("");
    setShowModal(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('artes_categories')
          .update({ name: name.trim(), slug: generateSlug(name.trim()) })
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast.success("Categoria atualizada!");
      } else {
        const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.display_order)) : 0;
        const { error } = await supabase
          .from('artes_categories')
          .insert({ 
            name: name.trim(), 
            slug: generateSlug(name.trim()),
            display_order: maxOrder + 1
          });

        if (error) throw error;
        toast.success("Categoria adicionada!");
      }

      setShowModal(false);
      fetchCategories();
    } catch (error: any) {
      console.error(error);
      if (error.code === '23505') {
        toast.error("Esta categoria já existe");
      } else {
        toast.error("Erro ao salvar categoria");
      }
    }
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Tem certeza que deseja excluir "${category.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('artes_categories')
        .delete()
        .eq('id', category.id);

      if (error) throw error;
      toast.success("Categoria excluída!");
      fetchCategories();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir categoria");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Button variant="ghost" onClick={() => navigate("/admin-dashboard")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Painel
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Categorias de Artes</h1>
            <p className="text-muted-foreground">Gerencie as categorias da Biblioteca de Artes</p>
          </div>
          <Button onClick={handleOpenAdd} className="bg-gradient-primary">
            <Plus className="h-4 w-4 mr-2" />
            Nova Categoria
          </Button>
        </div>

        <div className="space-y-2">
          {categories.map((category) => (
            <Card key={category.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-foreground">{category.name}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleOpenEdit(category)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(category)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}

          {categories.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma categoria cadastrada
            </div>
          )}
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da Categoria</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Aniversário"
                className="mt-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} className="bg-gradient-primary">
                {editingCategory ? "Salvar" : "Adicionar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCategoriesArtes;
