import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, User, Camera, Lock, Eye, EyeOff, Save, Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useUpscalerCredits } from "@/hooks/useUpscalerCredits";
import { useTranslation } from "react-i18next";
import { CreditsCard } from "@/components/upscaler/CreditsCard";

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const { user, isPremium, isLoading: premiumLoading } = usePremiumStatus();
  const { isSupported, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const { balance: credits, isLoading: creditsLoading } = useUpscalerCredits(user?.id);
  
  // FONTE ÚNICA DE VERDADE: Notification.permission
  const hasPermission = typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  
  const [showDisableModal, setShowDisableModal] = useState(false);
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
        toast.error(t('errors.imageMaxSize'));
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

      toast.success(t('success.profileUpdated'));
    } catch (error: any) {
      toast.error(error.message || t('errors.saveProfileError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error(t('errors.passwordMinLength'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('errors.passwordsDoNotMatch'));
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
        toast.error(t('errors.incorrectCurrentPassword'));
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

      toast.success(t('success.passwordChanged'));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || t('errors.passwordChangeError'));
    } finally {
      setIsPasswordLoading(false);
    }
  };

  if (premiumLoading) {
    return (
      <div className="min-h-screen bg-[#0D0221] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0221] p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/biblioteca-prompts")}
          className="mb-4 text-purple-300 hover:text-white hover:bg-purple-500/20"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('back')}
        </Button>

        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <User className="h-6 w-6 text-purple-400" />
          {t('profile.title')}
        </h1>

        {/* Profile Information */}
        <Card className="p-6 bg-[#1A0A2E] border-purple-500/20">
          <h2 className="text-lg font-semibold mb-4 text-white">{t('profile.personalInfo')}</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-purple-900/50 flex items-center justify-center overflow-hidden">
                  {avatarPreview || avatarUrl ? (
                    <img 
                      src={avatarPreview || avatarUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-10 w-10 text-purple-400" />
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 bg-purple-600 text-white rounded-full p-1.5 cursor-pointer hover:bg-purple-700">
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
                <p className="text-sm text-purple-300">
                  {t('profile.clickToChangePhoto')}
                </p>
                <p className="text-xs text-purple-400">
                  {t('profile.maxSize')}
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-purple-200">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="mt-2 bg-[#0D0221] border-purple-500/30 text-purple-400"
              />
            </div>

            <div>
              <Label htmlFor="name" className="text-purple-200">{t('name')}</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('signupModal.namePlaceholder')}
                className="mt-2 bg-[#0D0221] border-purple-500/30 text-white placeholder:text-purple-400"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-purple-200">{t('phone')}</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="mt-2 bg-[#0D0221] border-purple-500/30 text-white placeholder:text-purple-400"
              />
            </div>

            <div>
              <Label htmlFor="bio" className="text-purple-200">{t('profile.aboutYou')}</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t('profile.aboutYouPlaceholder')}
                className="mt-2 bg-[#0D0221] border-purple-500/30 text-white placeholder:text-purple-400"
                rows={3}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? t('saving') : t('profile.saveChanges')}
            </Button>
          </form>
        </Card>

        {/* Credits Card - below personal info */}
        <CreditsCard 
          credits={credits} 
          creditsLoading={creditsLoading} 
          userId={user?.id} 
        />

        {/* Change Password */}
        <Card className="p-6 bg-[#1A0A2E] border-purple-500/20">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
            <Lock className="h-5 w-5 text-purple-400" />
            {t('changePassword')}
          </h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword" className="text-purple-200">{t('currentPassword')}</Label>
              <div className="relative mt-2">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-[#0D0221] border-purple-500/30 text-white placeholder:text-purple-400"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="newPasswordProfile" className="text-purple-200">{t('newPassword')}</Label>
              <div className="relative mt-2">
                <Input
                  id="newPasswordProfile"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="bg-[#0D0221] border-purple-500/30 text-white placeholder:text-purple-400"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPasswordProfile" className="text-purple-200">{t('confirmNewPassword')}</Label>
              <div className="relative mt-2">
                <Input
                  id="confirmPasswordProfile"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="bg-[#0D0221] border-purple-500/30 text-white placeholder:text-purple-400"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isPasswordLoading}
              variant="outline"
              className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:text-white"
            >
              {isPasswordLoading ? t('changing') : t('changePassword')}
            </Button>
          </form>
        </Card>

        {/* Notification Settings - usa permission do browser como fonte de verdade */}
        {isSupported && (
          <Card className="p-6 bg-[#1A0A2E] border-purple-500/20">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
              <Bell className="h-5 w-5 text-purple-400" />
              {t('profile.notifications')}
            </h2>
            <div className="text-sm text-purple-300">
              {hasPermission ? (
                <div className="flex items-center justify-between">
                  <span>{t('profile.notificationsEnabled')}</span>
                  <button
                    onClick={() => setShowDisableModal(true)}
                    className="text-xs text-purple-400 hover:text-white underline transition-colors"
                  >
                    {t('profile.deactivate')}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span>{t('profile.notificationsDisabled')}</span>
                  <button
                    onClick={async () => {
                      const success = await subscribe();
                      if (success) {
                        toast.success(t('success.notificationsEnabled'));
                      } else {
                        toast.error(t('success.notificationsError'));
                      }
                    }}
                    className="text-xs text-green-400 hover:text-green-300 underline transition-colors flex items-center gap-1"
                  >
                    <Bell className="h-3 w-3" />
                    {t('profile.activate')}
                  </button>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Disable Notifications Modal */}
      <Dialog open={showDisableModal} onOpenChange={setShowDisableModal}>
        <DialogContent className="max-w-sm bg-[#1A0A2E] border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="text-center flex items-center justify-center gap-2 text-white">
              <BellOff className="h-5 w-5 text-red-500" />
              {t('disableNotifications.title')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-purple-300 text-sm text-center mb-6">
              {t('disableNotifications.description')}
            </p>
            <ul className="text-purple-300 text-sm space-y-2 mb-6">
              <li className="flex items-center gap-2">
                <span className="text-yellow-500">•</span>
                {t('disableNotifications.newContent')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-yellow-500">•</span>
                {t('disableNotifications.exclusivePromos')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-yellow-500">•</span>
                {t('disableNotifications.platformNews')}
              </li>
            </ul>

            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white mb-3"
              onClick={() => setShowDisableModal(false)}
            >
              {t('disableNotifications.keepBenefits')}
            </Button>

            <button
              onClick={async () => {
                const success = await unsubscribe();
                if (success) {
                  toast.success(t('success.notificationsDisabled'));
                  setShowDisableModal(false);
                } else {
                  toast.error(t('success.notificationsDeactivateError'));
                }
              }}
              disabled={pushLoading}
              className="w-full text-xs text-purple-400 hover:text-white underline transition-colors text-center py-2"
            >
              {pushLoading ? t('disableNotifications.deactivating') : t('disableNotifications.loseBenefits')}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileSettings;
