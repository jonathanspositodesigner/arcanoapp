import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, ArrowLeft, Sparkles, Crown, Zap, ImagePlus, Infinity, Camera, Palette, Music, Upload, Download, Wand2, ArrowRight, Shield, Clock, Star, CreditCard, MessageCircle } from "lucide-react";
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
  label,
  size = "default"
}: { 
  beforeImage: string; 
  afterImage: string; 
  label?: string;
  size?: "default" | "large";
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
        className={`relative w-full ${size === "large" ? "aspect-[4/3]" : "aspect-square"} rounded-3xl overflow-hidden cursor-ew-resize select-none border-2 border-white/10 shadow-2xl shadow-fuchsia-500/10`}
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
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-5 bg-gray-400 rounded-full" />
              <div className="w-0.5 h-5 bg-gray-400 rounded-full" />
            </div>
          </div>
        </div>

        {/* Labels maiores */}
        <div className="absolute top-4 left-4 bg-black/80 text-white text-sm font-semibold px-4 py-2 rounded-full">
          ANTES
        </div>
        <div className="absolute top-4 right-4 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-sm font-semibold px-4 py-2 rounded-full">
          DEPOIS
        </div>
      </div>
      {label && <p className="text-center text-white/60 text-sm">{label}</p>}
    </div>
  );
};

// CTA Button Component - estilo pill
const CTAButton = ({ onClick, isPremium }: { onClick: () => void; isPremium: boolean }) => (
  <Button
    onClick={onClick}
    className="w-full max-w-md py-6 text-lg font-bold rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white shadow-2xl shadow-fuchsia-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-fuchsia-500/40"
  >
    QUERO MEU ACESSO AGORA
    <ArrowRight className="h-5 w-5 ml-2" />
  </Button>
);

// Trust Badges Component
const TrustBadges = () => (
  <div className="flex flex-wrap justify-center gap-3 mt-6">
    <span className="flex items-center gap-2 bg-white/5 text-white/70 text-sm px-4 py-2 rounded-full border border-white/10">
      <Shield className="h-4 w-4 text-green-400" />
      Pagamento Seguro
    </span>
    <span className="flex items-center gap-2 bg-white/5 text-white/70 text-sm px-4 py-2 rounded-full border border-white/10">
      <Zap className="h-4 w-4 text-yellow-400" />
      Acesso Imediato
    </span>
    <span className="flex items-center gap-2 bg-white/5 text-white/70 text-sm px-4 py-2 rounded-full border border-white/10">
      <Infinity className="h-4 w-4 text-fuchsia-400" />
      Acesso Vitalício
    </span>
  </div>
);

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
  const originalPrice = 9700;
  const installmentPrice = Math.ceil(price / 3);

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

  const faqItems = [
    {
      question: "Preciso pagar mensalidade?",
      answer: "Não! O pagamento é único e o acesso é vitalício. Você paga uma vez e usa para sempre, sem taxas extras ou assinaturas."
    },
    {
      question: "Funciona com qualquer imagem?",
      answer: "Sim! Funciona com fotos, artes de IA, logos, mockups, capturas de tela, fotos antigas e muito mais. Qualquer tipo de imagem pode ser melhorada."
    },
    {
      question: "Quanto tempo leva para melhorar uma imagem?",
      answer: "Segundos! Basta fazer o upload e em poucos segundos sua imagem estará pronta para download em alta qualidade."
    },
    {
      question: "Tem suporte se eu tiver dúvidas?",
      answer: "Sim! Você terá acesso ao nosso suporte via WhatsApp para tirar qualquer dúvida sobre a ferramenta."
    },
    {
      question: "Posso usar em quantas imagens eu quiser?",
      answer: "Sim! Não há limite de imagens. Use quantas vezes precisar, para sempre."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a15] via-[#1a0f25] to-[#0a0510]">
      {/* Header */}
      <div className="p-4">
        <Button
          variant="ghost"
          className="text-white/70 hover:text-white rounded-full"
          onClick={() => navigate("/biblioteca-artes")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      {/* Se já tem acesso */}
      {hasAccess ? (
        <div className="max-w-lg mx-auto px-4 py-12">
          <Card className="bg-[#1a0f25]/80 border-green-500/50 rounded-3xl">
            <CardContent className="p-8 text-center">
              <Badge className="bg-green-500 text-white text-lg px-6 py-3 rounded-full mb-6">
                <Check className="h-5 w-5 mr-2" />
                Você já tem acesso!
              </Badge>
              <p className="text-white/70 mb-6 text-lg">
                Você já possui acesso ao Upscaler Arcano.
              </p>
              <Button
                onClick={() => navigate("/biblioteca-artes")}
                className="bg-gradient-to-r from-fuchsia-600 to-purple-600 rounded-full px-8 py-6"
              >
                Ir para Biblioteca
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* HERO SECTION - Assimétrico */}
          <section className="px-4 py-12 md:py-20 max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              {/* Texto à esquerda */}
              <div className="text-center md:text-left order-2 md:order-1">
                <Badge className="bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30 mb-6 rounded-full px-4 py-2">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Ferramenta de IA
                </Badge>
                
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                  Melhore suas <span className="text-fuchsia-400">fotos</span> com{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-500">
                    Inteligência Artificial
                  </span>
                </h1>
                
                <p className="text-lg md:text-xl text-white/70 mb-8">
                  Transforme fotos de celular, imagens de clientes ou artes geradas por IA em imagens <span className="text-fuchsia-400 font-semibold">nítidas e profissionais</span>
                </p>

                <div className="flex flex-col items-center md:items-start">
                  <CTAButton onClick={handlePurchase} isPremium={isPremium} />
                  <TrustBadges />
                </div>
              </div>

              {/* Imagem à direita */}
              <div className="order-1 md:order-2">
                <BeforeAfterSlider
                  beforeImage={beforeAfterExamples[0].before}
                  afterImage={beforeAfterExamples[0].after}
                  label="Arraste para ver a diferença"
                  size="large"
                />
              </div>
            </div>
          </section>

          {/* SEÇÃO DA DOR */}
          <section className="px-4 py-20 bg-black/30">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
                Você já passou por isso?
              </h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center hover:border-fuchsia-500/30 transition-all duration-300">
                  <div className="text-5xl mb-6">📱</div>
                  <p className="text-white/80 text-lg">
                    Tirou foto com celular e ficou <span className="text-fuchsia-400 font-semibold">ruim</span>?
                  </p>
                </div>
                
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center hover:border-fuchsia-500/30 transition-all duration-300">
                  <div className="text-5xl mb-6">😤</div>
                  <p className="text-white/80 text-lg">
                    Recebeu foto de cliente em <span className="text-fuchsia-400 font-semibold">baixa qualidade</span>?
                  </p>
                </div>
                
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center hover:border-fuchsia-500/30 transition-all duration-300">
                  <div className="text-5xl mb-6">🤖</div>
                  <p className="text-white/80 text-lg">
                    Gerou imagem com IA mas <span className="text-fuchsia-400 font-semibold">não ficou boa</span>?
                  </p>
                </div>
              </div>
              
              <p className="text-center text-2xl text-white mt-12">
                O <span className="text-fuchsia-400 font-bold">Upscaler Arcano</span> resolve isso em segundos.
              </p>

              {/* CTA intermediário */}
              <div className="flex justify-center mt-10">
                <CTAButton onClick={handlePurchase} isPremium={isPremium} />
              </div>
            </div>
          </section>

          {/* SEÇÃO ANTES/DEPOIS */}
          <section className="px-4 py-20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
                Melhore <span className="text-fuchsia-400">Fotos</span> e <span className="text-fuchsia-400">Selos 3D</span>
              </h2>
              <p className="text-white/60 text-center text-lg mb-12">
                Funciona também para logos, mockups, artes de IA e muito mais
              </p>
              
              <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                {beforeAfterExamples.map((example, index) => (
                  <div key={index} className="relative">
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white border-0 rounded-full px-4 py-1">
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
              <div className="flex flex-wrap justify-center gap-3 mt-10">
                {["Logos", "Mockups", "Artes de IA", "Capturas de tela", "Fotos antigas"].map((item) => (
                  <span key={item} className="bg-fuchsia-500/10 text-fuchsia-300 text-sm px-5 py-2.5 rounded-full border border-fuchsia-500/20">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* PARA QUEM É */}
          <section className="px-4 py-20 bg-black/30">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
                Para quem é o <span className="text-fuchsia-400">Upscaler Arcano</span>?
              </h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                {targetAudience.map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <div 
                      key={index}
                      className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-3xl p-8 text-center hover:border-fuchsia-500/50 transition-all duration-300 hover:transform hover:scale-[1.02]"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6">
                        <IconComponent className="h-8 w-8 text-fuchsia-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                      <p className="text-white/60">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* BENEFÍCIOS */}
          <section className="px-4 py-20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
                O que você <span className="text-fuchsia-400">ganha</span>
              </h2>
              
              <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                {features.map((feature, index) => {
                  const IconComponent = feature.icon;
                  return (
                    <div 
                      key={index}
                      className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-fuchsia-500/30 transition-all duration-300"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <IconComponent className="h-6 w-6 text-fuchsia-400" />
                      </div>
                      <span className="text-white/90 text-lg">{feature.text}</span>
                    </div>
                  );
                })}
              </div>

              {/* CTA intermediário */}
              <div className="flex justify-center mt-12">
                <CTAButton onClick={handlePurchase} isPremium={isPremium} />
              </div>
            </div>
          </section>

          {/* COMO FUNCIONA */}
          <section className="px-4 py-20 bg-black/30">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
                Como <span className="text-fuchsia-400">funciona</span>
              </h2>
              
              <div className="flex flex-col md:flex-row md:justify-center gap-8 md:gap-12 max-w-3xl mx-auto">
                {steps.map((step, index) => {
                  const IconComponent = step.icon;
                  return (
                    <div key={index} className="text-center flex flex-col items-center relative">
                      {/* Linha conectora para desktop */}
                      {index < steps.length - 1 && (
                        <div className="hidden md:block absolute top-10 left-[60%] w-full h-0.5 bg-gradient-to-r from-fuchsia-500/50 to-transparent" />
                      )}
                      
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg mb-4 shadow-lg shadow-fuchsia-500/30">
                        {index + 1}
                      </div>
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 border border-fuchsia-500/30 flex items-center justify-center mb-5">
                        <IconComponent className="h-10 w-10 text-fuchsia-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                      <p className="text-white/60 max-w-[180px]">{step.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* PROVA SOCIAL - Resultados de usuários */}
          <section className="px-4 py-20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
                Veja o <span className="text-fuchsia-400">resultado</span> de alguns usuários
              </h2>
              <p className="text-white/60 text-center text-lg mb-12">
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

          {/* FAQ SECTION */}
          <section className="px-4 py-20 bg-black/30">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
                Perguntas <span className="text-fuchsia-400">Frequentes</span>
              </h2>
              
              <Accordion type="single" collapsible className="space-y-4">
                {faqItems.map((item, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`item-${index}`}
                    className="bg-white/5 border border-white/10 rounded-2xl px-6 data-[state=open]:border-fuchsia-500/30"
                  >
                    <AccordionTrigger className="text-white text-left text-lg font-medium py-5 hover:no-underline">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-white/70 pb-5">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>

          {/* SEÇÃO DE PREÇO E CTA - Layout aberto */}
          <section className="px-4 py-20">
            <div className="max-w-lg mx-auto text-center">
              {/* Badge de desconto */}
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 rounded-full px-6 py-2 text-lg font-bold mb-6">
                🔥 69% OFF - PROMOÇÃO DE LANÇAMENTO
              </Badge>

              {isPremium && (
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm px-4 py-2 rounded-full mb-6">
                  <Crown className="h-4 w-4" />
                  Desconto Exclusivo de Membro
                </div>
              )}

              <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
                Garanta seu acesso <span className="text-fuchsia-400">vitalício</span>
              </h2>

              {/* Preços */}
              <div className="mb-8">
                <span className="text-white/40 text-2xl line-through block mb-2">{formatPrice(originalPrice)}</span>
                <div className="text-6xl md:text-7xl font-bold text-white mb-2">
                  {formatPrice(price)}
                </div>
                <p className="text-white/60 text-lg">
                  ou <span className="text-fuchsia-400 font-semibold">3x de {formatPrice(installmentPrice)}</span>
                </p>
                <p className="text-white/40 text-sm mt-2">pagamento único • acesso vitalício</p>
              </div>

              {/* Features checklist */}
              <div className="grid gap-3 mb-8 text-left max-w-sm mx-auto">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 text-white/80">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="h-4 w-4 text-green-400" />
                    </div>
                    <span>{feature.text}</span>
                  </div>
                ))}
              </div>

              {/* Alerta de urgência */}
              <div className="bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-2xl p-4 mb-8">
                <div className="flex items-center justify-center gap-2 text-fuchsia-300">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">Essa oferta pode acabar a qualquer momento</span>
                </div>
              </div>

              <CTAButton onClick={handlePurchase} isPremium={isPremium} />

              {/* Badges de pagamento */}
              <div className="flex flex-wrap justify-center gap-4 mt-8 text-white/50 text-sm">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Cartão de Crédito
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-lg">💵</span>
                  PIX
                </span>
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Compra Segura
                </span>
              </div>
            </div>
          </section>

          {/* FOOTER */}
          <section className="px-4 py-10 text-center border-t border-white/5">
            <Button
              variant="ghost"
              className="text-white/50 hover:text-white rounded-full"
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
