import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSmartBackNavigation } from "@/hooks/useSmartBackNavigation";
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
import { useCredits } from "@/contexts/CreditsContext";
import { useTranslation } from "react-i18next";
import { CreditsCard } from "@/components/upscaler/CreditsCard";
import AppLayout from "@/components/layout/AppLayout";

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { goBack } = useSmartBackNavigation({ fallback: '/biblioteca-prompts' });
  const { t } = useTranslation('auth');
  const { user, isPremium, isLoading: premiumLoading } = usePremiumStatus();
  const { isSupported, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const { balance: credits, isLoading: creditsLoading, isUnlimited } = useCredits();
  
  // FONTE ÚNICA DE VERDADE: Notification.permission
  const hasPermission = typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [bio, setBio] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
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
        .select('name, phone, cpf, bio, avatar_url, address_line, address_zip, address_city, address_state')
        .eq('id', user.id)
        .single();

      if (data) {
        setName(data.name || "");
        setPhone(data.phone || "");
        setCpf(data.cpf || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatar_url || "");
        setAddressLine(data.address_line || "");
        setAddressZip(data.address_zip || "");
        setAddressCity(data.address_city || "");
        setAddressState(data.address_state || "");
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
          cpf,
          bio,
          avatar_url: newAvatarUrl,
          address_line: addressLine || null,
          address_zip: addressZip || null,
          address_city: addressCity || null,
          address_state: addressState || null,
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-500"></div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={goBack}
          className="mb-4 text-muted-foreground hover:text-foreground hover:bg-accent0/20"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('back')}
        </Button>

        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <User className="h-6 w-6 text-muted-foreground" />
          {t('profile.title')}
        </h1>

        {/* Profile Information */}
        <Card className="p-6 bg-background border-border">
          <h2 className="text-lg font-semibold mb-4 text-foreground">{t('profile.personalInfo')}</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center overflow-hidden">
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
                <label className="absolute -bottom-1 -right-1 bg-slate-600 text-foreground rounded-full p-1.5 cursor-pointer hover:bg-slate-700">
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
                  {t('profile.clickToChangePhoto')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('profile.maxSize')}
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-muted-foreground">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="mt-2 bg-background border-border text-muted-foreground"
              />
            </div>

            <div>
              <Label htmlFor="name" className="text-muted-foreground">{t('name')}</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('signupModal.namePlaceholder')}
                className="mt-2 bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-muted-foreground">{t('phone')}</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="mt-2 bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <Label htmlFor="cpf" className="text-muted-foreground">CPF</Label>
              <Input
                id="cpf"
                type="text"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                className="mt-2 bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="border-t border-border pt-4 mt-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">📍 Endereço</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="addressLine" className="text-muted-foreground">Endereço</Label>
                  <Input
                    id="addressLine"
                    type="text"
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    placeholder="Rua, número, complemento"
                    className="mt-2 bg-background border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="addressZip" className="text-muted-foreground">CEP</Label>
                    <Input
                      id="addressZip"
                      type="text"
                      value={addressZip}
                      onChange={(e) => setAddressZip(e.target.value)}
                      placeholder="00000-000"
                      className="mt-2 bg-background border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div>
                    <Label htmlFor="addressCity" className="text-muted-foreground">Cidade</Label>
                    <Input
                      id="addressCity"
                      type="text"
                      value={addressCity}
                      onChange={(e) => setAddressCity(e.target.value)}
                      placeholder="Sua cidade"
                      className="mt-2 bg-background border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="addressState" className="text-muted-foreground">Estado</Label>
                  <Input
                    id="addressState"
                    type="text"
                    value={addressState}
                    onChange={(e) => setAddressState(e.target.value)}
                    placeholder="SP"
                    maxLength={2}
                    className="mt-2 bg-background border-border text-foreground placeholder:text-muted-foreground w-24"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="bio" className="text-muted-foreground">{t('profile.aboutYou')}</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t('profile.aboutYouPlaceholder')}
                className="mt-2 bg-background border-border text-foreground placeholder:text-muted-foreground"
                rows={3}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-600 hover:bg-slate-700 text-foreground"
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
          isUnlimited={isUnlimited}
        />

        {/* Change Password */}
        <Card className="p-6 bg-background border-border">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
            <Lock className="h-5 w-5 text-muted-foreground" />
            {t('changePassword')}
          </h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword" className="text-muted-foreground">{t('currentPassword')}</Label>
              <div className="relative mt-2">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground"
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
              <Label htmlFor="newPasswordProfile" className="text-muted-foreground">{t('newPassword')}</Label>
              <div className="relative mt-2">
                <Input
                  id="newPasswordProfile"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground"
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
              <Label htmlFor="confirmPasswordProfile" className="text-muted-foreground">{t('confirmNewPassword')}</Label>
              <div className="relative mt-2">
                <Input
                  id="confirmPasswordProfile"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground"
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
              className="w-full border-border text-muted-foreground hover:bg-accent0/20 hover:text-foreground"
            >
              {isPasswordLoading ? t('changing') : t('changePassword')}
            </Button>
          </form>
        </Card>

        {/* Notification Settings - usa permission do browser como fonte de verdade */}
        {isSupported && (
          <Card className="p-6 bg-background border-border">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {t('profile.notifications')}
            </h2>
            <div className="text-sm text-muted-foreground">
              {hasPermission ? (
                <div className="flex items-center justify-between">
                  <span>{t('profile.notificationsEnabled')}</span>
                  <button
                    onClick={() => setShowDisableModal(true)}
                    className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
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
        <DialogContent className="max-w-sm bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-center flex items-center justify-center gap-2 text-foreground">
              <BellOff className="h-5 w-5 text-red-500" />
              {t('disableNotifications.title')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-muted-foreground text-sm text-center mb-6">
              {t('disableNotifications.description')}
            </p>
            <ul className="text-muted-foreground text-sm space-y-2 mb-6">
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
              className="w-full bg-green-600 hover:bg-green-700 text-foreground mb-3"
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
              className="w-full text-xs text-muted-foreground hover:text-foreground underline transition-colors text-center py-2"
            >
              {pushLoading ? t('disableNotifications.deactivating') : t('disableNotifications.loseBenefits')}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </AppLayout>
  );
};

export default ProfileSettings;
