import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminManagePremium = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [planType, setPlanType] = useState("arcano_basico");
  const [billingPeriod, setBillingPeriod] = useState("monthly");
  const [isActive, setIsActive] = useState(true);
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [greennProductId, setGreennProductId] = useState("");
  const [greennContractId, setGreennContractId] = useState("");

  useEffect(() => {
    const checkAdminStatus = async () => {
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

      setIsAdmin(true);
      setIsLoading(false);
    };

    checkAdminStatus();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Email é obrigatório");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-premium-user', {
        body: {
          email: email.trim(),
          planType,
          billingPeriod,
          expiresInDays: parseInt(expiresInDays),
          isActive,
          greennProductId: greennProductId ? parseInt(greennProductId) : undefined,
          greennContractId: greennContractId || undefined
        }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success(data.isNew 
        ? "Usuário premium cadastrado com sucesso!" 
        : "Usuário premium atualizado com sucesso!"
      );

      // Reset form
      setEmail("");
      setPlanType("arcano_basico");
      setBillingPeriod("monthly");
      setIsActive(true);
      setExpiresInDays("30");
      setGreennProductId("");
      setGreennContractId("");

    } catch (error: any) {
      console.error("Error creating premium user:", error);
      toast.error(error.message || "Erro ao cadastrar usuário premium");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Carregando...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/admin-dashboard')}
            size="icon"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Cadastrar Usuário Premium
            </h1>
            <p className="text-muted-foreground">
              Adicione manualmente um usuário ao sistema premium
            </p>
          </div>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email do usuário *</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Se o usuário não existir, será criado automaticamente
              </p>
            </div>

            {/* Plan Type */}
            <div className="space-y-2">
              <Label htmlFor="planType">Tipo do Plano *</Label>
              <Select value={planType} onValueChange={setPlanType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="arcano_basico">Arcano Básico</SelectItem>
                  <SelectItem value="arcano_pro">Arcano Pro</SelectItem>
                  <SelectItem value="arcano_unlimited">Arcano IA Unlimited</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Billing Period */}
            <div className="space-y-2">
              <Label htmlFor="billingPeriod">Período de Cobrança *</Label>
              <Select value={billingPeriod} onValueChange={setBillingPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Expires In Days */}
            <div className="space-y-2">
              <Label htmlFor="expiresInDays">Expira em (dias) *</Label>
              <Input
                id="expiresInDays"
                type="number"
                min="1"
                max="730"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Data de expiração será calculada a partir de hoje (ex: 30 para mensal, 365 para anual)
              </p>
            </div>

            {/* Is Active */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isActive">Status Ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Define se o usuário tem acesso premium imediato
                </p>
              </div>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            {/* Optional Fields */}
            <div className="border-t pt-6 space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Campos opcionais (integração Greenn)
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="greennProductId">ID do Produto Greenn</Label>
                <Input
                  id="greennProductId"
                  type="number"
                  placeholder="Ex: 148926"
                  value={greennProductId}
                  onChange={(e) => setGreennProductId(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="greennContractId">ID do Contrato Greenn</Label>
                <Input
                  id="greennContractId"
                  type="text"
                  placeholder="Ex: 12345"
                  value={greennContractId}
                  onChange={(e) => setGreennContractId(e.target.value)}
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-primary hover:opacity-90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Cadastrar Usuário Premium
                </>
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AdminManagePremium;
