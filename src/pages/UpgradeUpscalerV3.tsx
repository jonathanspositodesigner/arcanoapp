import { useEffect, useState } from "react";
import { Zap, Layers, Check, X, Shield, Star, ChevronDown, Rocket, Sparkles, Clock, ArrowRight, Timer } from "lucide-react";
import { AnimatedSection, AnimatedElement, StaggeredAnimation, FadeIn } from "@/hooks/useScrollAnimation";

// Countdown to March 27, 2026 23:59:59 BRT (UTC-3)
const DEADLINE = new Date("2026-03-28T02:59:59Z").getTime();

const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState(() => {
    const diff = DEADLINE - Date.now();
    return diff > 0 ? diff : 0;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = DEADLINE - Date.now();
      setTimeLeft(diff > 0 ? diff : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  if (timeLeft <= 0) return null;

  const units = [
    { label: "dias", value: days },
    { label: "hrs", value: hours },
    { label: "min", value: minutes },
    { label: "seg", value: seconds },
  ];

  return (
    <div className="mb-8 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 md:p-5">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Timer className="h-4 w-4 text-red-400" />
        <p className="text-red-400 text-xs md:text-sm font-bold uppercase tracking-wider">
          Promoção válida até 27/03 às 23h59
        </p>
      </div>
      <div className="flex justify-center gap-3">
        {units.map((u, i) => (
          <div key={i} className="text-center">
            <div className="bg-white/10 rounded-lg px-3 py-2 min-w-[48px]">
              <span className="text-xl md:text-2xl font-black text-white tabular-nums">
                {String(u.value).padStart(2, "0")}
              </span>
            </div>
            <span className="text-[10px] text-white/40 mt-1 block">{u.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const UpgradeUpscalerV3 = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const scrollToPlanos = () => {
    document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a15] via-[#1a0f25] to-[#0a0510]">

      {/* BARRA STICKY */}
      <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-fuchsia-600 to-purple-700 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs sm:text-sm font-semibold text-white/90 text-center sm:text-left flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
            ARCANO V3 CHEGOU — Modo Turbo + Upscale em Lote
          </p>
          <button
            onClick={scrollToPlanos}
            className="w-full sm:w-auto px-5 py-2 rounded-full font-bold text-sm transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/30 cursor-pointer bg-gradient-to-r from-amber-400 to-amber-500 text-[#0f0a15]"
          >
            Fazer Upgrade Agora
            <ArrowRight className="inline h-4 w-4 ml-1" />
          </button>
        </div>
      </div>

      {/* HERO */}
      <section className="px-4 md:px-6 pt-16 md:pt-24 pb-12 md:pb-16 w-full">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          <FadeIn delay={0} duration={400}>
            <div className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-full px-4 py-1.5 mb-6 md:mb-8">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">
                Exclusivo para clientes Arcano
              </span>
            </div>
          </FadeIn>

          <h1 className="font-space-grotesk font-bold text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-white mb-5 leading-[1.15]">
            Você já sabe que funciona.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-500">
              Agora vai descobrir o que é 10x mais rápido.
            </span>
          </h1>

          <FadeIn delay={100} duration={400}>
            <p className="text-sm md:text-base text-white/50 mb-8 max-w-[580px] leading-relaxed mx-auto">
              O Arcano V2 transformou sua forma de trabalhar com imagens. O V3 transforma seu fluxo de trabalho inteiro. Dois recursos novos. Impacto real. Acesso imediato.
            </p>
          </FadeIn>

          {/* VSL VIDEO */}
          <FadeIn delay={150} duration={400}>
            <div className="w-full max-w-3xl mx-auto mb-10 rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-fuchsia-500/10 bg-black">
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <video
                  className="absolute inset-0 w-full h-full object-cover"
                  src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
                  autoPlay
                  muted
                  playsInline
                  controls
                  preload="auto"
                />
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={250} duration={400}>
            <div className="flex flex-wrap justify-center items-center gap-3 md:gap-0 md:divide-x md:divide-white/10 mb-10">
              {[
                { icon: Zap, text: "Resultado em < 1 min" },
                { icon: Layers, text: "10 imagens de uma vez" },
                { icon: Shield, text: "Acesso V2 mantido" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-white/60 text-xs px-3 py-1">
                  <item.icon className="h-3.5 w-3.5 text-fuchsia-400" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={300} duration={400}>
            <button
              onClick={scrollToPlanos}
              className="group px-8 py-4 rounded-full text-base md:text-lg font-bold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-amber-500/25 cursor-pointer bg-gradient-to-r from-amber-400 to-amber-500 text-[#0f0a15]"
            >
              🚀 Quero o Arcano V3 — Ver upgrade
              <ArrowRight className="inline h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="mt-4 text-xs text-white/40">
              Você mantém tudo que já tem. O upgrade é aditivo, não substitutivo.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* FEATURES */}
      <AnimatedSection className="px-4 py-16 md:py-20">
        <div className="max-w-5xl mx-auto text-center">
          <AnimatedSection as="div" delay={100}>
            <h2 className="font-bebas text-3xl md:text-4xl lg:text-5xl text-white mb-3 tracking-wide">
              O que mudou no <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-500">V3</span>
            </h2>
            <p className="text-white/50 text-sm md:text-base mb-12">
              Dois recursos. Impacto real no seu fluxo de trabalho.
            </p>
          </AnimatedSection>

          <StaggeredAnimation className="grid grid-cols-1 md:grid-cols-2 gap-6" staggerDelay={150}>
            {/* MODO TURBO */}
            <div className="text-left bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10 rounded-3xl p-7 md:p-8 hover:border-fuchsia-500/40 transition-all duration-300 hover:transform hover:scale-[1.01]">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500 text-[#0f0a15] mb-1">
                    NOVO
                  </span>
                  <h3 className="text-xl font-bold text-white">Modo Turbo</h3>
                </div>
              </div>

              <p className="text-fuchsia-400 font-semibold text-sm mb-4">Resultado em menos de 60 segundos.</p>

              <p className="text-white/50 text-sm leading-relaxed mb-2">
                Você lembra da última vez que um cliente estava esperando do outro lado enquanto você processava a imagem?
              </p>
              <p className="text-white/50 text-sm leading-relaxed mb-5">
                O Modo Turbo elimina essa espera. Mesma qualidade 4K. Mesmo motor de IA. Só que agora em menos de 1 minuto.
              </p>

              <ul className="space-y-2">
                {["Velocidade até 10x maior", "Qualidade 4K preservada", "Ideal para entregas urgentes"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span className="text-white/70">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* UPSCALE EM LOTE */}
            <div className="text-left bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10 rounded-3xl p-7 md:p-8 hover:border-fuchsia-500/40 transition-all duration-300 hover:transform hover:scale-[1.01]">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center">
                  <Layers className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500 text-[#0f0a15] mb-1">
                    NOVO
                  </span>
                  <h3 className="text-xl font-bold text-white">Upscale em Lote</h3>
                </div>
              </div>

              <p className="text-fuchsia-400 font-semibold text-sm mb-4">Até 10 imagens processadas de uma vez.</p>

              <p className="text-white/50 text-sm leading-relaxed mb-2">
                Chega de arrastar imagem por imagem. Selecione até 10 fotos, clique uma vez, e deixe a IA trabalhar enquanto você faz outra coisa.
              </p>
              <p className="text-white/50 text-sm leading-relaxed mb-5">
                Perfeito para catálogos, ensaios fotográficos ou qualquer projeto com múltiplas imagens.
              </p>

              <ul className="space-y-2">
                {["Até 10 imagens simultâneas", "Processamento paralelo", "Download individual ou em lote"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span className="text-white/70">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </StaggeredAnimation>
        </div>
      </AnimatedSection>

      {/* COMPARATIVO V2 vs V3 */}
      <AnimatedSection className="px-4 py-16 md:py-20 bg-black/30">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedSection as="div" delay={100}>
            <h2 className="font-bebas text-3xl md:text-4xl lg:text-5xl text-white mb-3 tracking-wide">
              V2 vs V3 — <span className="text-fuchsia-400">O que muda pra você</span>
            </h2>
            <p className="text-white/50 text-sm md:text-base mb-10">Tudo que você já tem, mais duas funcionalidades poderosas.</p>
          </AnimatedSection>

          <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-4 px-5 text-xs font-bold uppercase tracking-wider text-white/40">Recurso</th>
                  <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/40 text-center">V2</th>
                  <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-center">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-500 font-extrabold">V3</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Upscale 4K com IA", true, true],
                  ["Créditos vitalícios", true, true],
                  ["Suporte a múltiplos formatos", true, true],
                  ["Modo Turbo (< 60s)", false, true],
                  ["Upscale em Lote (10 imgs)", false, true],
                  ["Acesso à V2 incluso", "—", true],
                ].map(([feature, v2, v3], i) => (
                  <tr key={i} className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-5 text-sm font-medium text-white/80">{feature as string}</td>
                    <td className="py-3.5 px-4 text-center">
                      {v2 === true ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                          <Check className="h-3 w-3 text-emerald-400" />
                        </div>
                      ) : v2 === false ? (
                        <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
                          <X className="h-3 w-3 text-red-400" />
                        </div>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {v3 === true ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                          <Check className="h-3 w-3 text-emerald-400" />
                        </div>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AnimatedSection>

      {/* GARANTIA DE CONTINUIDADE */}
      <AnimatedSection className="px-4 py-16 md:py-20">
        <div className="max-w-3xl mx-auto">
          <AnimatedElement delay={100}>
            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-900/5 border border-emerald-500/30 rounded-3xl p-8 md:p-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
                <Shield className="h-8 w-8 text-emerald-400" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Seu acesso está protegido</h2>
              <p className="text-white/50 text-sm md:text-base leading-relaxed max-w-[520px] mx-auto">
                O upgrade para V3 é <strong className="text-white">aditivo</strong>. Você não perde nada do que já tem. Seu acesso ao V2 permanece ativo. O V3 adiciona dois novos recursos ao que você já possui.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs md:text-sm font-semibold">
                {["Acesso V2 mantido", "Acesso imediato ao V3", "Upgrade aditivo"].map((text, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-white/70">
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    {text}
                  </span>
                ))}
              </div>
            </div>
          </AnimatedElement>
        </div>
      </AnimatedSection>

      {/* SOCIAL PROOF */}
      <AnimatedSection className="px-4 py-16 md:py-20 bg-black/30">
        <div className="max-w-4xl mx-auto text-center">
          <AnimatedSection as="div" delay={100}>
            <div className="inline-flex items-center gap-2 bg-white/[0.07] border border-white/10 rounded-full px-4 py-2 mb-6">
              <div className="flex -space-x-2">
                <img src="/images/social-proof-1.webp" alt="" width="24" height="24" loading="lazy" className="w-6 h-6 rounded-full border-2 border-[#0f0a15] object-cover" />
                <img src="/images/social-proof-2.webp" alt="" width="24" height="24" loading="lazy" className="w-6 h-6 rounded-full border-2 border-[#0f0a15] object-cover" />
                <img src="/images/social-proof-3.webp" alt="" width="24" height="24" loading="lazy" className="w-6 h-6 rounded-full border-2 border-[#0f0a15] object-cover" />
              </div>
              <span className="text-white/70 text-xs font-medium">+3.200 profissionais já estão usando</span>
            </div>

            <h2 className="font-bebas text-3xl md:text-4xl lg:text-5xl text-white mb-3 tracking-wide">
              O que estão dizendo do <span className="text-fuchsia-400">V3</span>
            </h2>
            <p className="text-white/50 text-sm mb-10">Os primeiros a testar o V3 já estão falando.</p>
          </AnimatedSection>

          <StaggeredAnimation className="grid grid-cols-1 sm:grid-cols-3 gap-4" staggerDelay={150}>
            {[
              { text: "O Modo Turbo é absurdo. Antes esperava 5 minutos, agora em 40 segundos tá pronto.", name: "Lucas M.", role: "Designer Gráfico" },
              { text: "O lote mudou meu jogo. Processo 10 fotos de catálogo de uma vez. Economizo horas.", name: "Camila R.", role: "Fotógrafa de Produto" },
              { text: "Já usava o V2 todo dia. O V3 fez eu não querer voltar nunca mais.", name: "Rafael S.", role: "Social Media" },
            ].map((t, i) => (
              <div key={i} className="text-left bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10 rounded-3xl p-6 hover:border-fuchsia-500/30 transition-all duration-300">
                <div className="flex gap-0.5 mb-3">
                  {Array(5).fill(null).map((_, j) => <Star key={j} className="h-4 w-4 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-sm leading-relaxed mb-4 text-white/60">"{t.text}"</p>
                <p className="text-sm font-bold text-white">{t.name}</p>
                <p className="text-xs text-white/40">{t.role}</p>
              </div>
            ))}
          </StaggeredAnimation>
        </div>
      </AnimatedSection>

      {/* CTA + PREÇO */}
      <section id="planos" className="px-4 py-20 md:py-24">
        <div className="max-w-lg mx-auto text-center">
          <FadeIn delay={0} duration={400}>
            <div className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-full px-4 py-1.5 mb-6">
              <Rocket className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">
                Oferta exclusiva para clientes V2
              </span>
            </div>
          </FadeIn>

          <h2 className="font-bebas text-3xl md:text-4xl lg:text-5xl text-white mb-3 tracking-wide">
            Faça o <span className="text-fuchsia-400">upgrade</span> agora
          </h2>
          <p className="text-white/50 text-sm mb-10">
            Acesso imediato ao Modo Turbo + Upscale em Lote.
          </p>

          {/* Countdown urgency */}
          <CountdownTimer />

          <AnimatedElement delay={200}>
            <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.03] border-2 border-fuchsia-500/40 rounded-3xl p-8 md:p-10 text-center relative overflow-hidden">
              {/* Glow effect */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10">
                {/* 50% OFF badge */}
                <div className="inline-flex items-center gap-1.5 bg-red-500/20 border border-red-500/40 rounded-full px-3 py-1 mb-4">
                  <span className="text-red-400 text-xs font-bold uppercase">🔥 50% OFF</span>
                </div>

                <h3 className="text-xl font-bold text-white mb-1">Arcano V3 — Upgrade Vitalício</h3>
                <p className="text-xs text-white/40 mb-6">Pagamento único. Acesso para sempre.</p>

                <div className="mb-8">
                  <span className="text-sm line-through text-white/30">R$ 99,90</span>
                  <div className="text-5xl md:text-6xl font-black mt-1">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-500">
                      R$ 49<span className="text-2xl md:text-3xl">,90</span>
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-1">ou 12x de R$ 4,99</p>
                </div>

                <ul className="text-left max-w-xs mx-auto space-y-3 mb-8">
                  {[
                    "Modo Turbo (resultado em < 60s)",
                    "Upscale em Lote (até 10 imgs)",
                    "Acesso à V2 incluso",
                    "Acesso vitalício",
                    "Suporte prioritário",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3 text-emerald-400" />
                      </div>
                      <span className="text-white/80">{item}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className="w-full py-4 rounded-full text-base md:text-lg font-bold transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-amber-500/25 cursor-pointer bg-gradient-to-r from-amber-400 to-amber-500 text-[#0f0a15]"
                >
                  🚀 Fazer Upgrade para V3 Agora
                </button>

                <p className="mt-4 text-[11px] text-white/30">
                  Pagamento seguro via Mercado Pago · Acesso imediato após confirmação
                </p>
              </div>
            </div>
          </AnimatedElement>
        </div>
      </section>

      {/* FAQ */}
      <AnimatedSection className="px-4 py-16 md:py-20 bg-black/30">
        <div className="max-w-3xl mx-auto">
          <AnimatedSection as="div" delay={100}>
            <h2 className="font-bebas text-3xl md:text-4xl lg:text-5xl text-white text-center mb-10 tracking-wide">
              Perguntas <span className="text-fuchsia-400">frequentes</span>
            </h2>
          </AnimatedSection>

          <StaggeredAnimation className="space-y-3" staggerDelay={100}>
            {[
              { q: "Eu perco meus créditos do V2?", a: "Não. Seus créditos continuam exatamente como estão. O V3 é um upgrade aditivo." },
              { q: "Preciso pagar de novo pelo V2?", a: "Não. Quem compra o V3 recebe acesso ao V2 automaticamente. Você mantém tudo." },
              { q: "O Modo Turbo consome mais créditos?", a: "Não. O consumo de créditos é o mesmo. Só a velocidade muda." },
              { q: "Posso usar o V2 e o V3 ao mesmo tempo?", a: "Sim. Você terá acesso às duas versões e pode alternar entre elas a qualquer momento." },
              { q: "O acesso é vitalício mesmo?", a: "Sim. Pagamento único, acesso para sempre. Sem assinaturas ou taxas recorrentes." },
            ].map((item, i) => (
              <details
                key={i}
                className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-fuchsia-500/30 transition-all duration-300"
              >
                <summary className="font-semibold text-sm md:text-base text-white/90 list-none flex items-center justify-between cursor-pointer p-5 md:p-6">
                  {item.q}
                  <ChevronDown className="h-4 w-4 text-fuchsia-400 shrink-0 ml-3 transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <div className="px-5 md:px-6 pb-5 md:pb-6 -mt-1">
                  <p className="text-sm leading-relaxed text-white/50">{item.a}</p>
                </div>
              </details>
            ))}
          </StaggeredAnimation>
        </div>
      </AnimatedSection>

      {/* CTA FINAL */}
      <section className="px-4 py-20 md:py-24 text-center">
        <div className="max-w-2xl mx-auto">
          <FadeIn delay={0} duration={400}>
            <h2 className="font-space-grotesk font-bold text-3xl md:text-4xl lg:text-5xl text-white mb-5 leading-[1.15]">
              Você já sabe que funciona.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-500">
                Agora é hora de ir mais rápido.
              </span>
            </h2>
            <p className="text-white/50 text-sm mb-8">
              O V3 está disponível agora. Seus créditos estão esperando. Seu upgrade também.
            </p>
            <button
              onClick={scrollToPlanos}
              className="group px-8 py-4 rounded-full text-base md:text-lg font-bold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-amber-500/25 cursor-pointer bg-gradient-to-r from-amber-400 to-amber-500 text-[#0f0a15]"
            >
              🚀 Quero o Arcano V3 — Fazer Upgrade
              <ArrowRight className="inline h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </FadeIn>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-4 text-center text-xs text-white/30 border-t border-white/5">
        <p>© {new Date().getFullYear()} Arcano · Todos os direitos reservados</p>
      </footer>
    </div>
  );
};

export default UpgradeUpscalerV3;
