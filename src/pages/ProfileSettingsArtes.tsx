import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, User, Eye, EyeOff, Bell, BellOff } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const ProfileSettingsArtes = () => {
  const { t } = useTranslation(['common', 'auth']);
  const navigate = useNavigate();
  const location = useLocation();
  const fromMusicos = location.state?.from === 'musicos';
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
  const [showDisableModal, setShowDisableModal] = useState(false);

  const { isSupported, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  
  // FONTE ÚNICA DE VERDADE: Notification.permission
  const hasPermission = typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';

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
        toast.error(t('auth:errors.sessionExpired'));
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
        toast.error(t('auth:errors.saveProfileError'));
        return;
      }

      toast.success(t('auth:success.profileSaved'));
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error(t('auth:errors.saveProfileError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error(t('auth:errors.passwordMinLength'));
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t('auth:errors.sessionExpired'));
        return;
      }

      // Verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (signInError) {
        toast.error(t('auth:errors.incorrectCurrentPassword'));
        setIsSaving(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast.error(t('auth:errors.passwordChangeError'));
        return;
      }

      toast.success(t('auth:success.passwordChanged'));
      setCurrentPassword("");
      setNewPassword("");
      setShowPasswordSection(false);
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error(t('auth:errors.passwordChangeError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnableNotifications = async () => {
    const success = await subscribe();
    if (success) {
      toast.success(t('auth:success.notificationsEnabled'));
    } else {
      toast.error(t('common:error'));
    }
  };

  const handleDisableNotifications = async () => {
    const success = await unsubscribe();
    if (success) {
      toast.success(t('auth:success.notificationsDisabled'));
      setShowDisableModal(false);
    } else {
      toast.error(t('common:error'));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] flex items-center justify-center">
        <div className="text-white">{t('common:loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] p-4">
      <div className="max-w-lg mx-auto">
        <Button
          variant="ghost"
          className="text-white/70 hover:text-white mb-6"
          onClick={() => navigate(fromMusicos ? "/biblioteca-artes-musicos" : "/biblioteca-artes")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {fromMusicos ? t('common:profile.backToMusiciansLibrary') : t('common:profile.backToLibrary')}
        </Button>

        <Card className="bg-[#1a1a2e]/80 border-[#2d4a5e]/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('common:profile.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-white/60">{t('common:profile.name')}</label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white"
                placeholder={t('common:profile.namePlaceholder')}
              />
            </div>

            <div>
              <label className="text-sm text-white/60">{t('common:profile.phone')}</label>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white"
                placeholder={t('common:profile.phonePlaceholder')}
              />
            </div>

            <div>
              <label className="text-sm text-white/60">{t('common:profile.bio')}</label>
              <Textarea
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white min-h-[80px]"
                placeholder={t('common:profile.bioPlaceholder')}
              />
            </div>

            <Button
              className="w-full bg-[#2d4a5e] hover:bg-[#3d5a6e] text-white"
              onClick={handleSaveProfile}
              disabled={isSaving}
            >
              {isSaving ? t('common:profile.saving') : t('common:profile.saveProfile')}
            </Button>

            {/* Password Section */}
            <div className="border-t border-[#2d4a5e]/30 pt-4 mt-4">
              <Button
                variant="outline"
                className="w-full border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-400"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
              >
                {t('common:profile.changePassword')}
              </Button>

              {showPasswordSection && (
                <div className="mt-4 space-y-4">
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder={t('common:profile.currentPassword')}
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
                      placeholder={t('common:profile.newPassword')}
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
                    {t('common:profile.changePassword')}
                  </Button>
                </div>
              )}
            </div>

            {/* Notification Settings - usa permission do browser como fonte de verdade */}
            {isSupported && (
              <div className="border-t border-[#2d4a5e]/30 pt-4 mt-4">
                <p className="text-xs text-white/40 mb-2">{t('common:profile.notifications')}</p>
                {hasPermission ? (
                  <button
                    onClick={() => setShowDisableModal(true)}
                    className="text-xs text-white/40 hover:text-white/60 underline transition-colors"
                  >
                    {t('common:profile.disableNotifications')}
                  </button>
                ) : (
                  <button
                    onClick={handleEnableNotifications}
                    className="text-xs text-green-400/70 hover:text-green-400 underline transition-colors flex items-center gap-1"
                  >
                    <Bell className="h-3 w-3" />
                    {t('common:profile.enableNotifications')}
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Disable Notifications Modal */}
      <Dialog open={showDisableModal} onOpenChange={setShowDisableModal}>
        <DialogContent className="bg-[#1a1a2e] border-[#2d4a5e]/30 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-center flex items-center justify-center gap-2">
              <BellOff className="h-5 w-5 text-red-400" />
              {t('common:notifications.disableTitle')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-white/70 text-sm text-center mb-6">
              {t('common:notifications.disableWarning')}
            </p>
            <ul className="text-white/60 text-sm space-y-2 mb-6">
              <li className="flex items-center gap-2">
                <span className="text-amber-400">•</span>
                {t('common:notifications.newContent')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400">•</span>
                {t('common:notifications.exclusivePromos')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400">•</span>
                {t('common:notifications.platformNews')}
              </li>
            </ul>

            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white mb-3"
              onClick={() => setShowDisableModal(false)}
            >
              {t('common:notifications.keepBenefits')}
            </Button>

            <button
              onClick={handleDisableNotifications}
              disabled={pushLoading}
              className="w-full text-xs text-white/40 hover:text-white/60 underline transition-colors text-center py-2"
            >
              {pushLoading ? t('common:notifications.disabling') : t('common:notifications.loseBenefits')}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileSettingsArtes;
