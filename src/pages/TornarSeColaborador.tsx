import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  MousePointerClick,
  Sparkles,
  ImageIcon,
  Video,
  Palette,
  Wand2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const TornarSeColaborador = () => {
  const [form, setForm] = useState({
    nome: "",
    instagram: "",
    email: "",
    whatsapp: "",
    portfolio: "",
  });
  const [aceite, setAceite] = useState(false);
  const [aceiteError, setAceiteError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nome.trim()) e.nome = "Campo obrigatório";
    if (!form.instagram.trim()) e.instagram = "Campo obrigatório";
    if (!form.email.trim()) e.email = "Campo obrigatório";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email inválido";
    if (!form.whatsapp.trim()) e.whatsapp = "Campo obrigatório";
    if (!form.portfolio.trim()) e.portfolio = "Campo obrigatório";
    else if (!/^https?:\/\/.+/.test(form.portfolio)) e.portfolio = "Insira uma URL válida (https://...)";
    setErrors(e);
    if (!aceite) setAceiteError(true);
    return Object.keys(e).length === 0 && aceite;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("solicitacoes_colaboradores").insert({
        nome: form.nome.trim(),
        instagram: form.instagram.trim(),
        email: form.email.trim().toLowerCase(),
        whatsapp: form.whatsapp.trim(),
        portfolio: form.portfolio.trim(),
        aceite_termo: true,
      });

      if (error) throw error;

      // Send notification email (fire and forget)
      supabase.functions.invoke("notify-new-collaborator", {
        body: {
          nome: form.nome.trim(),
          instagram: form.instagram.trim(),
          email: form.email.trim().toLowerCase(),
          whatsapp: form.whatsapp.trim(),
          portfolio: form.portfolio.trim(),
          created_at: new Date().toISOString(),
        },
      }).catch(err => console.error("Email notification error:", err));

      setSubmitted(true);
    } catch (err: any) {
      console.error("Submit error:", err);
      toast.error("Erro ao enviar solicitação. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="py-16 space-y-4">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
            <h2 className="text-2xl font-bold text-foreground">Solicitação enviada com sucesso!</h2>
            <p className="text-muted-foreground">
              Recebemos seu cadastro e entraremos em contato em breve pelo Instagram ou e-mail informado. Fique ligado!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-16">

        {/* SEÇÃO 1 — APRESENTAÇÃO */}
        <section className="text-center space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Torne-se um Colaborador Arcano
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            O Arcano é uma plataforma brasileira de geração de conteúdo com inteligência artificial.
            Aqui você encontra ferramentas para criar imagens, vídeos e muito mais — tudo com IA.
          </p>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Agora você pode fazer parte disso como Colaborador: publique seus prompts e conteúdos
            criativos na plataforma e seja remunerado toda vez que alguém usar o que você criou.
          </p>
        </section>

        {/* SEÇÃO 2 — COMO VOCÊ GANHA */}
        <section className="space-y-8">
          <h2 className="text-2xl font-bold text-center text-foreground">
            Como funciona a remuneração
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-primary/20">
              <CardContent className="p-6 space-y-3 text-center">
                <MousePointerClick className="mx-auto h-10 w-10 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Clique no prompt</h3>
                <p className="text-sm text-muted-foreground">
                  Toda vez que um usuário copiar o seu prompt dentro da plataforma, você recebe uma remuneração automática.
                </p>
              </CardContent>
            </Card>
            <Card className="border-primary/20">
              <CardContent className="p-6 space-y-3 text-center">
                <Sparkles className="mx-auto h-10 w-10 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Geração com o seu conteúdo</h3>
                <p className="text-sm text-muted-foreground">
                  Quando um usuário usar o seu prompt para gerar imagens ou vídeos nas ferramentas do Arcano, você recebe uma remuneração proporcional ao tipo de ferramenta utilizada.
                </p>
              </CardContent>
            </Card>
          </div>
          <p className="text-xs text-muted-foreground text-center max-w-xl mx-auto">
            Os valores são calculados automaticamente e acumulados no seu painel de contribuidor. O saque fica disponível a partir de um saldo mínimo.
          </p>
        </section>

        {/* SEÇÃO 3 — TIPOS DE CONTEÚDO */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-center text-foreground">O que você pode publicar</h2>
          <div className="space-y-3 max-w-xl mx-auto">
            {[
              { icon: ImageIcon, text: "Prompts de geração de imagem com IA" },
              { icon: Video, text: "Prompts de geração de vídeo com IA (incluindo Seedance 2)" },
              { icon: Palette, text: "Conteúdos para ferramentas como Pose Changer, Veste AI, Arcano Cloner, MovieLED Maker" },
              { icon: Wand2, text: "Qualquer prompt criativo e original gerado por você" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <item.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">{item.text}</span>
              </div>
            ))}
          </div>
          <Card className="border-yellow-500/30 bg-yellow-500/5 max-w-xl mx-auto">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
              <p className="text-sm text-yellow-200/80">
                Todo conteúdo deve ser 100% autoral. Não são aceitos prompts copiados, imagens de bancos genéricos ou conteúdo gerado por terceiros.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* SEÇÃO 4 — TERMO */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-center text-foreground">
            Termo de Compromisso do Colaborador
          </h2>
          <div className="max-w-2xl mx-auto rounded-lg border border-border bg-card p-6 max-h-[260px] overflow-y-auto text-sm text-muted-foreground leading-relaxed space-y-4">
            <p className="font-semibold text-foreground">TERMO DE COMPROMISSO E LICENÇA DE USO — COLABORADOR ARCANO</p>
            <p>Ao submeter este formulário e marcar a caixa de aceite abaixo, você ("Colaborador") declara ter lido, compreendido e concordado integralmente com os termos a seguir, celebrado com ARCANO / VOXVISUAL ("Plataforma").</p>

            <p className="font-semibold text-foreground">1. AUTORIA E ORIGINALIDADE</p>
            <p>O Colaborador declara que todos os conteúdos enviados à Plataforma — incluindo prompts, descrições, imagens, vídeos e quaisquer outros materiais ("Conteúdo") — são de sua criação original e autoral. Fica expressamente vedado o envio de:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Conteúdo copiado, adaptado ou derivado de terceiros sem autorização;</li>
              <li>Imagens, ilustrações ou vetores provenientes de bancos de imagens genéricos (gratuitos ou pagos), como Freepik, Shutterstock, Getty Images, Adobe Stock e similares;</li>
              <li>Prompts ou conteúdos gerados integralmente por outra pessoa, mesmo que com ferramentas de IA;</li>
              <li>Qualquer material que viole direitos autorais, marcas registradas ou propriedade intelectual de terceiros.</li>
            </ul>

            <p className="font-semibold text-foreground">2. LICENÇA À PLATAFORMA</p>
            <p>Ao publicar Conteúdo na Plataforma, o Colaborador concede à Arcano/VoxVisual uma licença não exclusiva, irrevogável, global, gratuita e sublicenciável para usar, reproduzir, adaptar, distribuir, exibir e criar trabalhos derivados do Conteúdo para fins operacionais, promocionais e de marketing da Plataforma, sem necessidade de aviso prévio ou pagamento adicional.</p>

            <p className="font-semibold text-foreground">3. COPROPRIEDADE PARA USO INSTITUCIONAL</p>
            <p>O Colaborador reconhece e aceita que a Plataforma passa a ter copropriedade sobre o Conteúdo publicado exclusivamente para fins de uso interno, campanhas institucionais, divulgação da plataforma e materiais de marketing da Arcano/VoxVisual. Tal copropriedade não transfere a titularidade criativa do Colaborador sobre sua obra original.</p>

            <p className="font-semibold text-foreground">4. RESPONSABILIDADE DO COLABORADOR</p>
            <p>O Colaborador é integralmente responsável pelo Conteúdo que publica. Em caso de reclamação, notificação ou ação judicial por parte de terceiros relacionada ao Conteúdo enviado, o Colaborador se compromete a responder por eventuais danos, isentando a Plataforma de qualquer responsabilidade.</p>

            <p className="font-semibold text-foreground">5. REMUNERAÇÃO</p>
            <p>A remuneração ao Colaborador é condicionada ao uso efetivo de seu Conteúdo por usuários da Plataforma, conforme política de remuneração vigente disponível no painel do colaborador. A Plataforma se reserva o direito de ajustar os valores e critérios de remuneração mediante comunicação prévia de 15 (quinze) dias.</p>

            <p className="font-semibold text-foreground">6. SUSPENSÃO E REMOÇÃO DE CONTEÚDO</p>
            <p>A Plataforma se reserva o direito de remover, sem aviso prévio, qualquer Conteúdo que viole estes termos, as leis brasileiras vigentes ou as diretrizes editoriais da Plataforma. A violação reiterada poderá resultar no encerramento da conta do Colaborador e cancelamento dos ganhos pendentes.</p>

            <p className="font-semibold text-foreground">7. PRIVACIDADE</p>
            <p>Os dados pessoais fornecidos no cadastro serão tratados conforme a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018) e utilizados exclusivamente para fins operacionais da Plataforma.</p>

            <p className="font-semibold text-foreground">8. FORO</p>
            <p>Fica eleito o foro da Comarca de Almenara/MG para dirimir quaisquer controvérsias decorrentes deste Termo, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>

            <p className="italic">Ao marcar a caixa abaixo, você confirma que leu e concorda com todos os termos acima.</p>
          </div>

          <div className="max-w-2xl mx-auto flex items-start gap-2">
            <Checkbox
              id="aceite-termo"
              checked={aceite}
              onCheckedChange={(checked) => {
                setAceite(!!checked);
                if (checked) setAceiteError(false);
              }}
            />
            <div>
              <Label htmlFor="aceite-termo" className="text-sm text-foreground cursor-pointer">
                Li e concordo com o Termo de Compromisso do Colaborador Arcano
              </Label>
              {aceiteError && (
                <p className="text-xs text-destructive mt-1">
                  Você precisa aceitar o Termo de Compromisso para continuar.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* SEÇÃO 5 — FORMULÁRIO */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-center text-foreground">Envie sua solicitação</h2>
          <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-4">
            {[
              { key: "nome", label: "Nome completo", type: "text", placeholder: "Seu nome completo" },
              { key: "instagram", label: "Instagram", type: "text", placeholder: "@seuinstagram" },
              { key: "email", label: "E-mail", type: "email", placeholder: "seu@email.com" },
              { key: "whatsapp", label: "WhatsApp", type: "text", placeholder: "(DDD) 99999-9999" },
              { key: "portfolio", label: "Link do portfólio", type: "url", placeholder: "https://..." },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  type={type}
                  placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => handleChange(key, e.target.value)}
                />
                {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
              </div>
            ))}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Enviando..." : "Enviar solicitação para ser colaborador"}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default TornarSeColaborador;