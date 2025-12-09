import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, User, Eye, EyeOff } from "lucide-react";

const ProfileSettingsArtes = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    phone: "",
    bio: "",
  });
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login-artes");
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('name, phone, bio')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
      } else if (data) {
        setProfile({
          name: data.name || "",
          phone: data.phone || "",
          bio: data.bio || "",
        });
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sessão expirada");
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          name: profile.name,
          phone: profile.phone,
          bio: profile.bio,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        toast.error("Erro ao salvar perfil");
        return;
      }

      toast.success("Perfil salvo com sucesso!");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Erro ao salvar perfil");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sessão expirada");
        return;
      }

      // Verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (signInError) {
        toast.error("Senha atual incorreta");
        setIsSaving(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast.error("Erro ao alterar senha");
        return;
      }

      toast.success("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setShowPasswordSection(false);
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Erro ao alterar senha");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] p-4">
      <div className="max-w-lg mx-auto">
        <Button
          variant="ghost"
          className="text-white/70 hover:text-white mb-6"
          onClick={() => navigate("/biblioteca-artes")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Biblioteca
        </Button>

        <Card className="bg-[#1a1a2e]/80 border-[#2d4a5e]/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="h-5 w-5" />
              Meu Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-white/60">Nome</label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white"
                placeholder="Seu nome"
              />
            </div>

            <div>
              <label className="text-sm text-white/60">Telefone</label>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <label className="text-sm text-white/60">Bio</label>
              <Textarea
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white min-h-[80px]"
                placeholder="Fale um pouco sobre você"
              />
            </div>

            <Button
              className="w-full bg-[#2d4a5e] hover:bg-[#3d5a6e] text-white"
              onClick={handleSaveProfile}
              disabled={isSaving}
            >
              {isSaving ? "Salvando..." : "Salvar Perfil"}
            </Button>

            {/* Password Section */}
            <div className="border-t border-[#2d4a5e]/30 pt-4 mt-4">
              <Button
                variant="outline"
                className="w-full border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-400"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
              >
                Alterar Senha
              </Button>

              {showPasswordSection && (
                <div className="mt-4 space-y-4">
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="Senha atual"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Nova senha"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    className="w-full bg-[#2d4a5e] hover:bg-[#3d5a6e] text-white"
                    onClick={handleChangePassword}
                    disabled={isSaving || !currentPassword || !newPassword}
                  >
                    Alterar Senha
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSettingsArtes;
