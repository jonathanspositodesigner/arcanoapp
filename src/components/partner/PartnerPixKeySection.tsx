import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Key, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PixKey {
  id: string;
  pix_key: string;
  pix_key_type: string;
}

interface Props {
  partnerId: string;
  pixKey: PixKey | null;
  onPixKeyChange: (key: PixKey | null) => void;
}

const PIX_TYPE_LABELS: Record<string, string> = {
  cpf: "CPF",
  email: "E-mail",
  telefone: "Telefone",
  aleatoria: "Chave Aleatória",
};

function maskPixKey(type: string, key: string): string {
  if (type === "cpf" && key.length >= 3) {
    return `***.***.***-${key.slice(-2)}`;
  }
  if (type === "email" && key.includes("@")) {
    const [local, domain] = key.split("@");
    return `${local.slice(0, 2)}***@${domain}`;
  }
  if (type === "telefone" && key.length >= 4) {
    return `****${key.slice(-4)}`;
  }
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

const PartnerPixKeySection = ({ partnerId, pixKey, onPixKeyChange }: Props) => {
  const [showModal, setShowModal] = useState(false);
  const [pixType, setPixType] = useState(pixKey?.pix_key_type || "cpf");
  const [pixValue, setPixValue] = useState(pixKey?.pix_key || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (showModal) {
      setPixType(pixKey?.pix_key_type || "cpf");
      setPixValue(pixKey?.pix_key || "");
    }
  }, [showModal, pixKey]);

  const handleSave = async () => {
    if (!pixValue.trim()) {
      toast.error("Preencha a chave PIX");
      return;
    }
    setIsSaving(true);
    try {
      if (pixKey) {
        const { error } = await supabase
          .from("partner_pix_keys")
          .update({ pix_key: pixValue.trim(), pix_key_type: pixType })
          .eq("partner_id", partnerId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("partner_pix_keys")
          .insert({ partner_id: partnerId, pix_key: pixValue.trim(), pix_key_type: pixType });
        if (error) throw error;
      }
      onPixKeyChange({ id: pixKey?.id || "", pix_key: pixValue.trim(), pix_key_type: pixType });
      toast.success("Chave PIX salva com sucesso!");
      setShowModal(false);
    } catch (err: any) {
      toast.error("Erro ao salvar chave PIX");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Key className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Chave PIX</p>
              {pixKey ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{PIX_TYPE_LABELS[pixKey.pix_key_type]}</Badge>
                  <span className="text-sm font-medium text-foreground">{maskPixKey(pixKey.pix_key_type, pixKey.pix_key)}</span>
                </div>
              ) : (
                <p className="text-sm text-yellow-400">Nenhuma chave cadastrada</p>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowModal(true)}>
            {pixKey ? <><Edit2 className="h-4 w-4 mr-1" /> Editar</> : "Cadastrar"}
          </Button>
        </div>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pixKey ? "Editar" : "Cadastrar"} Chave PIX</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo da Chave</Label>
              <Select value={pixType} onValueChange={setPixType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="telefone">Telefone</SelectItem>
                  <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Chave PIX</Label>
              <Input
                value={pixValue}
                onChange={(e) => setPixValue(e.target.value)}
                placeholder={pixType === "cpf" ? "000.000.000-00" : pixType === "email" ? "email@exemplo.com" : pixType === "telefone" ? "+5511999999999" : "Chave aleatória"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PartnerPixKeySection;