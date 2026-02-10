import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Edit, Trash2, Key, Shield, Mail, User, Copy, RefreshCw } from "lucide-react";

interface Admin {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  recovery_email: string | null;
}

const AdminManageAdmins = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Add admin dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRecoveryEmail, setNewRecoveryEmail] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [showSuccessInfo, setShowSuccessInfo] = useState(false);
  
  // Recovery email edit state
  const [editRecoveryDialogOpen, setEditRecoveryDialogOpen] = useState(false);
  const [editingRecoveryAdmin, setEditingRecoveryAdmin] = useState<Admin | null>(null);
  const [editRecoveryEmail, setEditRecoveryEmail] = useState("");
  const [updatingRecoveryEmail, setUpdatingRecoveryEmail] = useState(false);
  
  // Edit password dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAdmin, setDeletingAdmin] = useState<Admin | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/admin-login");
        return;
      }

      setCurrentUserId(session.user.id);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        navigate("/admin-login");
        return;
      }

      setIsAdmin(true);
      await fetchAdmins();
    } catch (error) {
      console.error("Error checking admin status:", error);
      navigate("/admin-login");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      // Get all admin user_ids from user_roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (rolesError) throw rolesError;

      if (!adminRoles || adminRoles.length === 0) {
        setAdmins([]);
        return;
      }

      // Get profiles for all admin users
      const adminUserIds = adminRoles.map(r => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, name, recovery_email")
        .in("id", adminUserIds);

      if (profilesError) throw profilesError;

      const adminsList: Admin[] = adminRoles.map(role => {
        const profile = profiles?.find(p => p.id === role.user_id);
        return {
          id: role.user_id,
          user_id: role.user_id,
          email: profile?.email || "Email não encontrado",
          name: profile?.name || null,
          recovery_email: profile?.recovery_email || null,
        };
      });

      setAdmins(adminsList);
    } catch (error) {
      console.error("Error fetching admins:", error);
      toast.error("Erro ao carregar administradores");
    }
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleAddAdmin = async () => {
    if (!newEmail.trim()) {
      toast.error("Email é obrigatório");
      return;
    }

    setAddingAdmin(true);
    const password = generatePassword();
    setGeneratedPassword(password);

    try {
      const { data, error } = await supabase.functions.invoke("manage-admin", {
        body: { 
          action: "create",
          email: newEmail.toLowerCase().trim(),
          name: newName.trim() || null,
          password,
          recovery_email: newRecoveryEmail.trim() || null,
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Administrador criado com sucesso!");
      setShowSuccessInfo(true);
      await fetchAdmins();
    } catch (error: any) {
      console.error("Error adding admin:", error);
      toast.error(error.message || "Erro ao criar administrador");
      setGeneratedPassword("");
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!editingAdmin || !newPassword.trim()) {
      toast.error("Nova senha é obrigatória");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Senha deve ter no mínimo 6 caracteres");
      return;
    }

    setUpdatingPassword(true);

    try {
      const { data, error } = await supabase.functions.invoke("manage-admin", {
        body: { 
          action: "update_password",
          user_id: editingAdmin.user_id,
          password: newPassword
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Senha atualizada com sucesso!");
      setEditDialogOpen(false);
      setEditingAdmin(null);
      setNewPassword("");
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast.error(error.message || "Erro ao atualizar senha");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!deletingAdmin) return;

    if (deletingAdmin.user_id === currentUserId) {
      toast.error("Você não pode excluir sua própria conta");
      return;
    }

    setDeleting(true);

    try {
      const { data, error } = await supabase.functions.invoke("manage-admin", {
        body: { 
          action: "delete",
          user_id: deletingAdmin.user_id
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Administrador excluído com sucesso!");
      setDeleteDialogOpen(false);
      setDeletingAdmin(null);
      await fetchAdmins();
    } catch (error: any) {
      console.error("Error deleting admin:", error);
      toast.error(error.message || "Erro ao excluir administrador");
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const resetAddDialog = () => {
    setNewEmail("");
    setNewName("");
    setNewRecoveryEmail("");
    setGeneratedPassword("");
    setShowSuccessInfo(false);
    setAddDialogOpen(false);
  };

  const handleUpdateRecoveryEmail = async () => {
    if (!editingRecoveryAdmin) return;

    setUpdatingRecoveryEmail(true);

    try {
      const { data, error } = await supabase.functions.invoke("manage-admin", {
        body: { 
          action: "update_recovery_email",
          user_id: editingRecoveryAdmin.user_id,
          recovery_email: editRecoveryEmail.trim() || null,
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Email de resgate atualizado!");
      setEditRecoveryDialogOpen(false);
      setEditingRecoveryAdmin(null);
      setEditRecoveryEmail("");
      await fetchAdmins();
    } catch (error: any) {
      console.error("Error updating recovery email:", error);
      toast.error(error.message || "Erro ao atualizar email de resgate");
    } finally {
      setUpdatingRecoveryEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin-prompts/ferramentas")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Gerenciar Administradores</h1>
            <p className="text-muted-foreground">Adicione, edite senhas ou remova administradores</p>
          </div>
          
          {/* Add Admin Button */}
          <Dialog open={addDialogOpen} onOpenChange={(open) => !open && resetAddDialog()}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Adicionar Admin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Novo Administrador</DialogTitle>
              </DialogHeader>
              
              {!showSuccessInfo ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@exemplo.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome (opcional)</Label>
                    <Input
                      id="name"
                      placeholder="Nome do administrador"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recoveryEmail">Email de Resgate 2FA (opcional)</Label>
                    <Input
                      id="recoveryEmail"
                      type="email"
                      placeholder="email.real@gmail.com"
                      value={newRecoveryEmail}
                      onChange={(e) => setNewRecoveryEmail(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Email onde o admin receberá o código de verificação 2FA
                    </p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={resetAddDialog}>Cancelar</Button>
                    <Button onClick={handleAddAdmin} disabled={addingAdmin}>
                      {addingAdmin ? "Criando..." : "Criar Administrador"}
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-green-600 font-medium mb-3">Administrador criado com sucesso!</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-mono">{newEmail}</span>
                        <Button size="sm" variant="ghost" onClick={() => copyToClipboard(newEmail)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-mono">{generatedPassword}</span>
                        <Button size="sm" variant="ghost" onClick={() => copyToClipboard(generatedPassword)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Copie as credenciais acima e envie para o novo administrador.
                  </p>
                  <DialogFooter>
                    <Button onClick={resetAddDialog}>Fechar</Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Admins List */}
        <div className="grid gap-4">
          {admins.length === 0 ? (
            <Card className="p-8 text-center">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum administrador encontrado</p>
            </Card>
          ) : (
            admins.map((admin) => (
              <Card key={admin.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {admin.name || "Sem nome"}
                        {admin.user_id === currentUserId && (
                          <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Você</span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">{admin.email}</p>
                      {admin.recovery_email && (
                        <p className="text-xs text-muted-foreground/70 flex items-center gap-1">
                          <Mail className="h-3 w-3" /> 2FA: {admin.recovery_email}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Edit Password Button */}
                    <Dialog open={editDialogOpen && editingAdmin?.id === admin.id} onOpenChange={(open) => {
                      if (!open) {
                        setEditDialogOpen(false);
                        setEditingAdmin(null);
                        setNewPassword("");
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingAdmin(admin);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Key className="h-4 w-4 mr-1" />
                          Alterar Senha
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Alterar Senha</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Alterar senha de: <strong>{admin.email}</strong>
                          </p>
                          <div className="space-y-2">
                            <Label htmlFor="newPassword">Nova Senha</Label>
                            <div className="flex gap-2">
                              <Input
                                id="newPassword"
                                type="text"
                                placeholder="Digite a nova senha"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                              />
                              <Button 
                                variant="outline" 
                                size="icon"
                                onClick={() => setNewPassword(generatePassword())}
                                title="Gerar senha"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={handleUpdatePassword} disabled={updatingPassword}>
                              {updatingPassword ? "Atualizando..." : "Atualizar Senha"}
                            </Button>
                          </DialogFooter>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Edit Recovery Email Button */}
                    <Dialog open={editRecoveryDialogOpen && editingRecoveryAdmin?.id === admin.id} onOpenChange={(open) => {
                      if (!open) {
                        setEditRecoveryDialogOpen(false);
                        setEditingRecoveryAdmin(null);
                        setEditRecoveryEmail("");
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingRecoveryAdmin(admin);
                            setEditRecoveryEmail(admin.recovery_email || "");
                            setEditRecoveryDialogOpen(true);
                          }}
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          Email 2FA
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Email de Resgate 2FA</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Definir email de resgate para: <strong>{admin.email}</strong>
                          </p>
                          <div className="space-y-2">
                            <Label htmlFor="editRecoveryEmail">Email de Resgate</Label>
                            <Input
                              id="editRecoveryEmail"
                              type="email"
                              placeholder="email.real@gmail.com"
                              value={editRecoveryEmail}
                              onChange={(e) => setEditRecoveryEmail(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                              O código 2FA será enviado para este email. Deixe vazio para enviar ao email de login.
                            </p>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEditRecoveryDialogOpen(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={handleUpdateRecoveryEmail} disabled={updatingRecoveryEmail}>
                              {updatingRecoveryEmail ? "Salvando..." : "Salvar"}
                            </Button>
                          </DialogFooter>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Delete Button */}
                    {admin.user_id !== currentUserId && (
                      <Dialog open={deleteDialogOpen && deletingAdmin?.id === admin.id} onOpenChange={(open) => {
                        if (!open) {
                          setDeleteDialogOpen(false);
                          setDeletingAdmin(null);
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => {
                              setDeletingAdmin(admin);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Excluir Administrador</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                              Tem certeza que deseja excluir o administrador <strong>{admin.email}</strong>?
                            </p>
                            <p className="text-sm text-destructive">
                              Esta ação não pode ser desfeita. O usuário perderá todo o acesso administrativo.
                            </p>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                                Cancelar
                              </Button>
                              <Button variant="destructive" onClick={handleDeleteAdmin} disabled={deleting}>
                                {deleting ? "Excluindo..." : "Excluir"}
                              </Button>
                            </DialogFooter>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminManageAdmins;