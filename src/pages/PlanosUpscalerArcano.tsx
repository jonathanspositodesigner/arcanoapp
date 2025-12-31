import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft, Sparkles, Crown, Zap, ImagePlus, Infinity, Camera, Palette, Music, Upload, Download, Wand2, ArrowRight, Shield, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumArtesStatus } from "@/hooks/usePremiumArtesStatus";

interface ToolData {
  id: string;
  name: string;
  slug: string;
  price_vitalicio: number | null;
  checkout_link_vitalicio: string | null;
  checkout_link_membro_vitalicio: string | null;
  cover_url: string | null;
}

// Componente de slider antes/depois
const BeforeAfterSlider = ({ 
  beforeImage, 
  afterImage, 
  label 
}: { 
  beforeImage: string; 
  afterImage: string; 
  label: string;
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      handleMove(e.clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  return (
    <div className="space-y-3">
      <div 
        ref={containerRef}
        className="relative w-full aspect-square rounded-2xl overflow-hidden cursor-ew-resize select-none border border-white/10"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
      >
        {/* Imagem "Depois" (background) */}
        <img 
          src={afterImage} 
          alt="Depois" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Imagem "Antes" (clipped) */}
        <div 
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img 
            src={beforeImage} 
            alt="Antes" 
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>

        {/* Slider line */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
              <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
            </div>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
          Antes
        </div>
        <div className="absolute top-3 right-3 bg-fuchsia-500 text-white text-xs px-2 py-1 rounded-full">
          Depois
        </div>
      </div>
      <p className="text-center text-white/60 text-sm">{label}</p>
    </div>
  );
};

const PlanosUpscalerArcano = () => {
  const navigate = useNavigate();
  const { user, isPremium, hasAccessToPack, isLoading: authLoading } = usePremiumArtesStatus();
  const [tool, setTool] = useState<ToolData | null>(null);
  const [loading, setLoading] = useState(true);

  const TOOL_SLUG = "upscaller-arcano";

  useEffect(() => {
    fetchToolData();
  }, []);

  const fetchToolData = async () => {
    const { data, error } = await supabase
      .from("artes_packs")
      .select(`
        id, name, slug, cover_url,
        price_vitalicio,
        checkout_link_vitalicio,
        checkout_link_membro_vitalicio
      `)
      .eq("slug", TOOL_SLUG)
      .single();

    if (!error && data) {
      setTool(data as ToolData);
    }
    setLoading(false);
  };

  const formatPrice = (cents: number) => {
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
  };

  const handlePurchase = () => {
    if (!tool) return;

    const checkoutLink = isPremium && tool.checkout_link_membro_vitalicio
      ? tool.checkout_link_membro_vitalicio
      : tool.checkout_link_vitalicio;

    if (checkoutLink) {
      window.open(checkoutLink, "_blank");
    } else {
      window.open("https://voxvisual.com.br/linksbio/", "_blank");
    }
  };

  const hasAccess = hasAccessToPack(TOOL_SLUG);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0a15] via-[#1a0f25] to-[#0a0510] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fuchsia-500"></div>
      </div>
    );
  }

  const price = tool?.price_vitalicio || 2990;
  const originalPrice = 9700; // R$ 97,00 original

  // Imagens placeholder - substitua pelos seus exemplos reais
  const beforeAfterExamples = [
    {
      before: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=30&blur=10",
      after: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=95",
      label: "Foto melhorada em 4K",
      badge: "FOTO"
    },
    {
      before: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=30&blur=10",
      after: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=95",
      label: "Selo 3D em alta definição",
      badge: "3D"
    }
  ];

  const userResults = [
    {
      before: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=30&blur=10",
      after: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=95",
      label: "Resultado de usuário"
    },
    {
      before: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=30&blur=10",
      after: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&q=95",
      label: "Resultado de usuário"
    },
    {
      before: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=30&blur=10",
      after: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=95",
      label: "Resultado de usuário"
    }
  ];

  const features = [
    { icon: Sparkles, text: "Melhore suas imagens até 4K" },
    { icon: ImagePlus, text: "Remoção de fundo automática com IA" },
    { icon: Infinity, text: "Acesso vitalício à ferramenta" },
    { icon: Zap, text: "Todas as atualizações futuras incluídas" },
  ];

  const targetAudience = [
    {
      icon: Music,
      title: "DJs e Produtores",
      description: "Melhore suas fotos de eventos e material promocional"
    },
    {
      icon: Palette,
      title: "Artistas Visuais",
      description: "Recebe fotos de baixa qualidade de clientes? Transforme em imagens profissionais"
    },
    {
      icon: Camera,
      title: "Designers Gráficos",
      description: "Melhore fotos de clientes e crie seus 3Ds em alta qualidade"
    }
  ];

  const steps = [
    {
      icon: Upload,
      title: "Faça upload",
      description: "Envie sua imagem em baixa qualidade"
    },
    {
      icon: Wand2,
      title: "Escolha o modo",
      description: "Upscale até 4K ou remoção de fundo"
    },
    {
      icon: Download,
      title: "Baixe",
      description: "Sua imagem melhorada em segundos"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a15] via-[#1a0f25] to-[#0a0510]">
      {/* Header */}
      <div className="p-4">
        <Button
          variant="ghost"
          className="text-white/70 hover:text-white"
          onClick={() => navigate("/biblioteca-artes")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      {/* Se já tem acesso */}
      {hasAccess ? (
        <div className="max-w-lg mx-auto px-4 py-12">
          <Card className="bg-[#1a0f25]/80 border-green-500/50">
            <CardContent className="p-6 text-center">
              <Badge className="bg-green-500 text-white text-lg px-4 py-2 mb-4">
                <Check className="h-5 w-5 mr-2" />
                Você já tem acesso!
              </Badge>
              <p className="text-white/70 mb-4">
                Você já possui acesso ao Upscaler Arcano.
              </p>
              <Button
                onClick={() => navigate("/biblioteca-artes")}
                className="bg-gradient-to-r from-fuchsia-600 to-purple-600"
              >
                Ir para Biblioteca
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* HERO SECTION */}
          <section className="px-4 py-12 text-center max-w-4xl mx-auto">
            <Badge className="bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30 mb-6">
              <Sparkles className="h-3 w-3 mr-1" />
              Ferramenta de IA
            </Badge>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Melhore a qualidade das suas{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-500">
                fotos com IA
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-8">
              Transforme fotos de celular, imagens de clientes ou artes geradas por IA em imagens nítidas e profissionais
            </p>

            {/* Hero Image - Primeiro exemplo */}
            <div className="max-w-md mx-auto">
              <BeforeAfterSlider
                beforeImage={beforeAfterExamples[0].before}
                afterImage={beforeAfterExamples[0].after}
                label="Arraste para ver a diferença"
              />
            </div>
          </section>

          {/* SEÇÃO DA DOR */}
          <section className="px-4 py-16 bg-black/20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-10">
                Você já passou por isso?
              </h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                  <div className="text-4xl mb-4">📱</div>
                  <p className="text-white/80">
                    Tirou foto com celular e ficou <span className="text-fuchsia-400 font-semibold">ruim</span>?
                  </p>
                </div>
                
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                  <div className="text-4xl mb-4">😤</div>
                  <p className="text-white/80">
                    Recebeu foto de cliente em <span className="text-fuchsia-400 font-semibold">baixa qualidade</span>?
                  </p>
                </div>
                
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                  <div className="text-4xl mb-4">🤖</div>
                  <p className="text-white/80">
                    Gerou imagem com IA mas a qualidade <span className="text-fuchsia-400 font-semibold">não ficou boa</span>?
                  </p>
                </div>
              </div>
              
              <p className="text-center text-xl text-white mt-10">
                O <span className="text-fuchsia-400 font-bold">Upscaler Arcano</span> resolve isso em segundos.
              </p>
            </div>
          </section>

          {/* SEÇÃO ANTES/DEPOIS */}
          <section className="px-4 py-16">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
                Melhore <span className="text-fuchsia-400">Fotos</span> e <span className="text-fuchsia-400">Selos 3D</span>
              </h2>
              <p className="text-white/60 text-center mb-10">
                Funciona também para logos, mockups, artes de IA e muito mais
              </p>
              
              <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
                {beforeAfterExamples.map((example, index) => (
                  <div key={index} className="relative">
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-fuchsia-500 text-white border-0">
                      {example.badge}
                    </Badge>
                    <BeforeAfterSlider
                      beforeImage={example.before}
                      afterImage={example.after}
                      label={example.label}
                    />
                  </div>
                ))}
              </div>
              
              {/* Lista de outros usos */}
              <div className="flex flex-wrap justify-center gap-3 mt-8">
                {["Logos", "Mockups", "Artes de IA", "Capturas de tela", "Fotos antigas"].map((item) => (
                  <span key={item} className="bg-white/10 text-white/70 text-sm px-4 py-2 rounded-full border border-white/10">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* PARA QUEM É */}
          <section className="px-4 py-16 bg-black/20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-10">
                Para quem é o Upscaler Arcano?
              </h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                {targetAudience.map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <div 
                      key={index}
                      className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl p-6 text-center hover:border-fuchsia-500/50 transition-all duration-300"
                    >
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                        <IconComponent className="h-7 w-7 text-fuchsia-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                      <p className="text-white/60 text-sm">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* BENEFÍCIOS */}
          <section className="px-4 py-16">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-10">
                O que você ganha
              </h2>
              
              <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {features.map((feature, index) => {
                  const IconComponent = feature.icon;
                  return (
                    <div 
                      key={index}
                      className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4"
                    >
                      <div className="w-10 h-10 rounded-lg bg-fuchsia-500/20 flex items-center justify-center flex-shrink-0">
                        <IconComponent className="h-5 w-5 text-fuchsia-400" />
                      </div>
                      <span className="text-white/90">{feature.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* COMO FUNCIONA */}
          <section className="px-4 py-16 bg-black/20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-10">
                Como funciona
              </h2>
              
              <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
                {steps.map((step, index) => {
                  const IconComponent = step.icon;
                  return (
                    <div key={index} className="text-center relative">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-fuchsia-500/25">
                        <IconComponent className="h-8 w-8 text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 md:right-auto md:left-1/2 md:translate-x-8 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                      <p className="text-white/60 text-sm">{step.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* PROVA SOCIAL - Resultados de usuários */}
          <section className="px-4 py-16">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
                Veja o resultado de alguns usuários
              </h2>
              <p className="text-white/60 text-center mb-10">
                Pessoas reais usando o Upscaler Arcano
              </p>
              
              <div className="grid md:grid-cols-3 gap-6">
                {userResults.map((result, index) => (
                  <BeforeAfterSlider
                    key={index}
                    beforeImage={result.before}
                    afterImage={result.after}
                    label={result.label}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* SEÇÃO DE PREÇO E CTA - MELHORADA COM GATILHOS */}
          <section className="px-4 py-16 bg-gradient-to-t from-fuchsia-500/10 to-transparent">
            <div className="max-w-lg mx-auto">
              <Card className="relative bg-[#1a0f25]/90 border-2 border-fuchsia-500/50 ring-2 ring-fuchsia-500/20 overflow-hidden">
                {/* Banner de urgência pulsante */}
                <div className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-fuchsia-600 text-white text-center py-3 animate-pulse">
                  <span className="font-bold text-sm">🔥 PROMOÇÃO DE LANÇAMENTO 🔥</span>
                </div>

                <div className="absolute top-12 left-0 right-0 h-1 bg-gradient-to-r from-fuchsia-500 to-purple-600" />

                {isPremium && (
                  <div className="absolute top-16 right-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Crown className="h-3 w-3" />
                    Desconto de Membro
                  </div>
                )}

                <CardHeader className="text-center pt-8">
                  <div className="flex justify-center mb-4">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 flex items-center justify-center border border-fuchsia-500/30">
                      <Sparkles className="h-10 w-10 text-fuchsia-400" />
                    </div>
                  </div>
                  <CardTitle className="text-white text-2xl">Upscaler Arcano</CardTitle>
                  <p className="text-white/60 text-sm">
                    Melhore suas fotos para sempre
                  </p>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Preço com desconto visual */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <span className="text-white/40 text-xl line-through">{formatPrice(originalPrice)}</span>
                      <Badge className="bg-green-500 text-white border-0 text-sm font-bold">
                        69% OFF
                      </Badge>
                    </div>
                    <div className="text-5xl font-bold text-white mb-1">
                      {formatPrice(price)}
                    </div>
                    <p className="text-white/50 text-sm">pagamento único</p>
                  </div>

                  <div className="space-y-3">
                    {features.map((feature, index) => {
                      return (
                        <div key={index} className="flex items-center gap-3 text-white/80">
                          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                            <Check className="h-3.5 w-3.5 text-green-400" />
                          </div>
                          <span className="text-sm">{feature.text}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Alerta de urgência */}
                  <div className="bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center gap-2 text-fuchsia-300">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">Essa oferta pode acabar a qualquer momento</span>
                    </div>
                  </div>

                  <Button
                    onClick={handlePurchase}
                    className="w-full py-7 text-lg font-bold bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white shadow-lg shadow-fuchsia-500/25 transition-all duration-300 hover:scale-[1.02] animate-pulse"
                  >
                    QUERO MEU ACESSO AGORA
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>

                  <div className="flex items-center justify-center gap-4 text-white/50 text-xs">
                    <span className="flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5" />
                      Pagamento 100% seguro
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5" />
                      Acesso imediato
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* FOOTER */}
          <section className="px-4 py-8 text-center">
            <Button
              variant="ghost"
              className="text-white/50 hover:text-white"
              onClick={() => navigate("/biblioteca-artes")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Biblioteca
            </Button>
          </section>
        </>
      )}
    </div>
  );
};

export default PlanosUpscalerArcano;
