import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Target, Plus, Check, Pencil, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
}

const AdminGoalsCard = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const fetchGoals = async () => {
    const { data, error } = await supabase
      .from("admin_goals")
      .select("*")
      .order("is_completed", { ascending: true })
      .order("due_date", { ascending: true });

    if (error) {
      console.error("Error fetching goals:", error);
      return;
    }
    setGoals(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setEditingGoal(null);
  };

  const handleOpenModal = (goal?: Goal) => {
    if (goal) {
      setEditingGoal(goal);
      setTitle(goal.title);
      setDescription(goal.description || "");
      setDueDate(goal.due_date);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !dueDate) {
      toast.error("Preencha título e data");
      return;
    }

    if (editingGoal) {
      const { error } = await supabase
        .from("admin_goals")
        .update({ title, description: description || null, due_date: dueDate })
        .eq("id", editingGoal.id);

      if (error) {
        toast.error("Erro ao atualizar meta");
        return;
      }
      toast.success("Meta atualizada!");
    } else {
      const { error } = await supabase
        .from("admin_goals")
        .insert({ title, description: description || null, due_date: dueDate });

      if (error) {
        toast.error("Erro ao criar meta");
        return;
      }
      toast.success("Meta criada!");
    }

    setIsModalOpen(false);
    resetForm();
    fetchGoals();
  };

  const handleComplete = async (goal: Goal) => {
    const { error } = await supabase
      .from("admin_goals")
      .update({ 
        is_completed: !goal.is_completed, 
        completed_at: goal.is_completed ? null : new Date().toISOString() 
      })
      .eq("id", goal.id);

    if (error) {
      toast.error("Erro ao atualizar meta");
      return;
    }
    toast.success(goal.is_completed ? "Meta reaberta!" : "Meta concluída!");
    fetchGoals();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta meta?")) return;

    const { error } = await supabase
      .from("admin_goals")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir meta");
      return;
    }
    toast.success("Meta excluída!");
    fetchGoals();
  };

  const getDateColor = (dateStr: string, isCompleted: boolean) => {
    if (isCompleted) return "text-muted-foreground";
    const date = parseISO(dateStr);
    if (isPast(date) && !isToday(date)) return "text-destructive";
    if (isToday(date)) return "text-yellow-500";
    return "text-muted-foreground";
  };

  const pendingGoals = goals.filter(g => !g.is_completed);
  const completedGoals = goals.filter(g => g.is_completed);

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Próximos Passos / Metas
        </CardTitle>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4 mr-1" />
              Nova Meta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGoal ? "Editar Meta" : "Nova Meta"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Título *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Implementar sistema de pagamentos"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes da meta..."
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Data para conclusão *</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <Button onClick={handleSave} className="w-full">
                {editingGoal ? "Salvar Alterações" : "Criar Meta"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : goals.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhuma meta cadastrada</p>
        ) : (
          <div className="space-y-4">
            {/* Pending goals */}
            {pendingGoals.length > 0 && (
              <div className="space-y-2">
                {pendingGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border"
                  >
                    <button
                      onClick={() => handleComplete(goal)}
                      className="mt-0.5 h-5 w-5 rounded border-2 border-primary flex items-center justify-center hover:bg-primary/20 transition-colors shrink-0"
                    >
                      {goal.is_completed && <Check className="h-3 w-3 text-primary" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{goal.title}</p>
                      {goal.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">{goal.description}</p>
                      )}
                      <p className={`text-xs mt-1 flex items-center gap-1 ${getDateColor(goal.due_date, goal.is_completed)}`}>
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(goal.due_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenModal(goal)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(goal.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Completed goals */}
            {completedGoals.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Concluídas ({completedGoals.length})
                </p>
                {completedGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 opacity-60"
                  >
                    <button
                      onClick={() => handleComplete(goal)}
                      className="mt-0.5 h-5 w-5 rounded bg-primary flex items-center justify-center hover:bg-primary/80 transition-colors shrink-0"
                    >
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-muted-foreground line-through">{goal.title}</p>
                      <p className="text-xs mt-1 text-muted-foreground">
                        Concluída em {format(parseISO(goal.completed_at!), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                      onClick={() => handleDelete(goal.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminGoalsCard;
