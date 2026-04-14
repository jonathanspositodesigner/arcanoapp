import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const ChangePassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const sentParam = searchParams.get("sent");
  const emailParam = searchParams.get("email");
  const orderIdParam = searchParams.get("order_id") || "";
  const { t } = useTranslation("auth");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  const isFirstAccessWithoutSession = sentParam === "1" && !!emailParam && !hasSession;

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setHasSession(true);
      } else if (!sentParam || !emailParam) {
        toast.info(t("errors.needLogin") || "Você precisa estar logado para alterar a senha.");
        navigate(`/login?redirect=${encodeURIComponent("/change-password?redirect=" + redirectTo)}`);
        return;
      }

      setIsCheckingSession(false);
    };

    checkSession();
  }, [navigate, redirectTo, t, sentParam, emailParam]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error(t("errors.passwordMinLength"));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t("errors.passwordsDoNotMatch"));
      return;
    }

    setIsLoading(true);

    try {
      if (isFirstAccessWithoutSession && emailParam) {
        const normalizedEmail = emailParam.trim().toLowerCase();

        const { data, error } = await supabase.functions.invoke("complete-purchase-onboarding", {
          body: {
            email: normalizedEmail,
            password: newPassword,
            order_id: orderIdParam || undefined,
          },
        });

        if (error) {
          let errorMsg = "Não foi possível validar sua compra para liberar o acesso.";
          try {
            if (error.context && typeof error.context.json === "function") {
              const body = await error.context.json();
              if (body?.error) errorMsg = body.error;
            }
          } catch (_) {}
          console.error("Onboarding error:", error);
          toast.error(errorMsg);
          return;
        }

        if (!data?.success) {
          toast.error(data?.error || "Não foi possível validar sua compra para liberar o acesso.");
          return;
        }

        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: newPassword,
        });

        if (loginError) {
          toast.error("Senha cadastrada, mas não foi possível entrar automaticamente.");
          return;
        }

        if (loginData?.user?.id) {
          await supabase
            .from("profiles")
            .update({ password_changed: true })
            .eq("id", loginData.user.id);
        }

        toast.success("Senha cadastrada com sucesso!");
        navigate(redirectTo);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("profiles").update({ password_changed: true }).eq("id", user.id);
      }

      toast.success(t("success.passwordChanged"));
      navigate(redirectTo);
    } catch (error: any) {
      toast.error(error.message || t("errors.passwordChangeError"));
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-background border-border">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Lock className="h-8 w-8 text-muted-foreground" />
            <h1 className="text-2xl font-bold text-white">
              {isFirstAccessWithoutSession ? "Primeiro Acesso" : t("createNewPassword")}
            </h1>
          </div>

          {isFirstAccessWithoutSession ? (
            <>
              <p className="text-muted-foreground mb-3">Cadastre sua senha agora para liberar seu acesso.</p>
              <p className="text-foreground font-medium bg-accent0/20 py-2 px-4 rounded-lg inline-block mb-2">
                {emailParam}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">{t("createNewPasswordDescription")}</p>
          )}
        </div>

        <form onSubmit={handleChangePassword} className="space-y-6">
          <div>
            <Label htmlFor="newPassword" className="text-muted-foreground">
              {t("newPassword")}
            </Label>
            <div className="relative mt-2">
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="bg-background border-border text-white placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-muted-foreground">
              {t("confirmNewPassword")}
            </Label>
            <div className="relative mt-2">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="bg-background border-border text-white placeholder:text-muted-foreground"
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
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-slate-500 to-pink-500 hover:opacity-90 text-white"
          >
            {isLoading
              ? "Salvando..."
              : isFirstAccessWithoutSession
                ? "Cadastrar senha e entrar"
                : t("saveNewPassword")}
          </Button>

          {isFirstAccessWithoutSession && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(-1)}
              className="w-full text-muted-foreground/70 hover:text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Usar outro email
            </Button>
          )}
        </form>
      </Card>
    </div>
  );
};

export default ChangePassword;
