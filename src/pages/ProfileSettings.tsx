import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, User, Camera, Lock, Eye, EyeOff, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { user, isPremium, isLoading: premiumLoading } = usePremiumStatus();
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  useEffect(() => {
    if (!premiumLoading && !user) {
      navigate('/login');
    }
  }, [user, premiumLoading, navigate]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('name, phone, bio, avatar_url')
        .eq('id', user.id)
        .single();

      if (data) {
        setName(data.name || "");
        setPhone(data.phone || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatar_url || "");
      }
    };

    loadProfile();
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("A imagem deve ter no máximo 2MB");
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      let newAvatarUrl = avatarUrl;

      // Upload avatar if changed
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('admin-prompts')
          .upload(`avatars/${fileName}`, avatarFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('admin-prompts')
          .getPublicUrl(`avatars/${fileName}`);
        
        newAvatarUrl = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          name,
          phone,
          bio,
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success("Perfil atualizado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar perfil");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setIsPasswordLoading(true);

    try {
      // First verify current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        toast.error("Senha atual incorreta");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Mark password as changed
      if (user) {
        await supabase
          .from('profiles')
          .update({ password_changed: true })
          .eq('id', user.id);
      }

      toast.success("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar senha");
    } finally {
      setIsPasswordLoading(false);
    }
  };

  if (premiumLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/biblioteca-prompts")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <User className="h-6 w-6" />
          Configurações do Perfil
        </h1>

        {/* Profile Information */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Informações Pessoais</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {avatarPreview || avatarUrl ? (
                    <img 
                      src={avatarPreview || avatarUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 cursor-pointer hover:opacity-90">
                  <Camera className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Clique no ícone para alterar sua foto
                </p>
                <p className="text-xs text-muted-foreground">
                  Máximo 2MB
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="mt-2 bg-muted"
              />
            </div>

            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="bio">Sobre você</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Conte um pouco sobre você..."
                className="mt-2"
                rows={3}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </form>
        </Card>

        {/* Change Password */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Alterar Senha
          </h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Senha Atual</Label>
              <div className="relative mt-2">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="newPasswordProfile">Nova Senha</Label>
              <div className="relative mt-2">
                <Input
                  id="newPasswordProfile"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPasswordProfile">Confirmar Nova Senha</Label>
              <div className="relative mt-2">
                <Input
                  id="confirmPasswordProfile"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isPasswordLoading}
              variant="outline"
              className="w-full"
            >
              {isPasswordLoading ? "Alterando..." : "Alterar Senha"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSettings;
