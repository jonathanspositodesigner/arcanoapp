import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceFingerprint, getDeviceName } from "@/lib/deviceFingerprint";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type LoginStep = "credentials" | "verification";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>("credentials");
  const [otpCode, setOtpCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();
        
        if (roleData) {
          navigate('/admin-hub');
        }
      }
    };
    checkAdminStatus();
  }, [navigate]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const checkTrustedDevice = async (userId: string): Promise<boolean> => {
    const fingerprint = getDeviceFingerprint();
    
    const { data, error } = await supabase
      .from('admin_trusted_devices')
      .select('id')
      .eq('user_id', userId)
      .eq('device_fingerprint', fingerprint)
      .maybeSingle();
    
    if (error) {
      console.error('Erro ao verificar dispositivo:', error);
      return false;
    }
    
    if (data) {
      // Atualiza last_used_at
      await supabase
        .from('admin_trusted_devices')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id);
      return true;
    }
    
    return false;
  };

  const send2FACode = async (userId: string) => {
    const fingerprint = getDeviceFingerprint();
    const deviceName = getDeviceName();

    const { error } = await supabase.functions.invoke('send-admin-2fa', {
      body: {
        user_id: userId,
        email,
        device_fingerprint: fingerprint,
        device_name: deviceName,
      },
    });

    if (error) {
      console.error('Erro ao enviar código 2FA:', error);
      throw new Error('Erro ao enviar código de verificação');
    }

    setResendCooldown(60);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Verifica se é admin
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError || !roleData) {
        await supabase.auth.signOut();
        toast.error("Acesso negado. Você não tem permissões de administrador.");
        return;
      }

      // Verifica se dispositivo é confiável
      const isTrusted = await checkTrustedDevice(data.user.id);

      if (isTrusted) {
        toast.success("Login realizado com sucesso!");
        navigate('/admin-hub');
      } else {
        // Dispositivo desconhecido - envia código 2FA
        setPendingUserId(data.user.id);
        await send2FACode(data.user.id);
        setStep("verification");
        toast.info("Código de verificação enviado para seu email");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (otpCode.length !== 6 || !pendingUserId) return;

    setIsLoading(true);

    try {
      const fingerprint = getDeviceFingerprint();
      const deviceName = getDeviceName();

      const { data, error } = await supabase.functions.invoke('verify-admin-2fa', {
        body: {
          user_id: pendingUserId,
          code: otpCode,
          device_fingerprint: fingerprint,
          device_name: deviceName,
          trust_device: trustDevice,
        },
      });

      if (error) throw error;

      if (data.valid) {
        toast.success("Verificação concluída!");
        navigate('/admin-hub');
      } else {
        toast.error(data.error || "Código inválido");
        setOtpCode("");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao verificar código");
      setOtpCode("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || !pendingUserId) return;

    setIsLoading(true);
    try {
      await send2FACode(pendingUserId);
      toast.success("Novo código enviado!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao reenviar código");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = async () => {
    await supabase.auth.signOut();
    setStep("credentials");
    setPendingUserId(null);
    setOtpCode("");
    setPassword("");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-hover">
        {step === "credentials" ? (
          <>
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>

            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Acesso Administrativo
              </h1>
              <p className="text-muted-foreground">
                Entre com suas credenciais de administrador
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu-email@exemplo.com"
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-2"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-primary hover:opacity-90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              onClick={handleBackToLogin}
              className="mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao login
            </Button>

            <div className="mb-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Verificação de Segurança
              </h1>
              <p className="text-muted-foreground text-sm">
                Detectamos um acesso de um dispositivo desconhecido.
                <br />
                Digite o código enviado para <strong>{email}</strong>
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={(value) => setOtpCode(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="trust"
                  checked={trustDevice}
                  onCheckedChange={(checked) => setTrustDevice(checked as boolean)}
                />
                <label
                  htmlFor="trust"
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  Confiar neste dispositivo (não pedir código novamente)
                </label>
              </div>

              <Button
                onClick={handleVerifyCode}
                disabled={isLoading || otpCode.length !== 6}
                className="w-full bg-gradient-primary hover:opacity-90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Verificar Código"
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || isLoading}
                  className="text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0
                    ? `Reenviar código em ${resendCooldown}s`
                    : "Reenviar código"}
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default AdminLogin;
