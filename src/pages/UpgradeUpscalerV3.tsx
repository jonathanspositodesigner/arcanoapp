import { useEffect } from "react";

const UpgradeUpscalerV3 = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const scrollToPlanos = () => {
    document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <Helmet>
        <title>Arcano V3 Upgrade — Modo Turbo + Upscale em Lote</title>
        <meta name="description" content="Faça upgrade do seu Upscaler Arcano V2 para V3. Modo Turbo com resultado em menos de 1 minuto e processamento de até 10 imagens de uma vez." />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Helmet>

      <div className="min-h-screen font-['Inter',sans-serif]" style={{ background: "#0D0B14", color: "#F8F8F8" }}>

        {/* SEÇÃO 0 — BARRA STICKY */}
        <div className="sticky top-0 z-50 w-full" style={{ background: "#7C3AED" }}>
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-sm sm:text-base font-bold text-white text-center sm:text-left">
              🔥 ARCANO V3 CHEGOU — Modo Turbo + Upscale em Lote
            </p>
            <button
              onClick={scrollToPlanos}
              className="w-full sm:w-auto px-5 py-2 rounded-lg font-bold text-sm transition-all hover:scale-105 hover:brightness-110 cursor-pointer"
              style={{ background: "#F59E0B", color: "#0D0B14" }}
            >
              Fazer Upgrade Agora →
            </button>
          </div>
        </div>

        {/* SEÇÃO 1 — HERO */}
        <section className="pt-20 pb-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <span
              className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-8"
              style={{ background: "#F59E0B", color: "#0D0B14" }}
            >
              🔥 EXCLUSIVO PARA CLIENTES ARCANO — ARCANO V3 CHEGOU
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6">
              Você já sabe que funciona.
              <br />
              <span style={{ color: "#A855F7" }}>Agora vai descobrir o que é 10x mais rápido.</span>
            </h1>

            <p className="text-base sm:text-lg max-w-[600px] mx-auto mb-8 leading-relaxed" style={{ color: "#A1A1AA" }}>
              O Arcano V2 transformou sua forma de trabalhar com imagens. O V3 transforma seu fluxo de trabalho inteiro. Dois recursos novos. Impacto real. Acesso imediato.
            </p>

            <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 mb-10 text-sm sm:text-base font-bold" style={{ color: "#A855F7" }}>
              <span>⚡ Resultado em menos de 1 minuto</span>
              <span className="hidden sm:inline">·</span>
              <span>📦 10 imagens de uma vez</span>
              <span className="hidden sm:inline">·</span>
              <span>🔄 Seus créditos continuam intactos</span>
            </div>

            <button
              onClick={scrollToPlanos}
              className="px-8 py-4 rounded-xl text-lg font-bold transition-all hover:scale-105 hover:brightness-110 cursor-pointer"
              style={{ background: "#F59E0B", color: "#0D0B14" }}
            >
              🚀 Quero o Arcano V3 — Ver upgrade
            </button>

            <p className="mt-4 text-sm" style={{ color: "#A1A1AA" }}>
              Você mantém tudo que já tem. O upgrade é aditivo, não substitutivo.
            </p>
          </div>
        </section>

        {/* SEÇÃO 2 — RECONHECIMENTO DA JORNADA */}
        <section className="py-16 px-4" style={{ background: "#13101F" }}>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-8">
              Desde que você entrou no Arcano, algumas coisas mudaram.
            </h2>

            <div className="max-w-[680px] mx-auto text-base sm:text-lg leading-relaxed mb-10 space-y-4" style={{ color: "#A1A1AA" }}>
              <p>
                Você já processou imagens que antes iriam pro lixo. Já impressionou clientes com resultados que antes levavam horas. Já entregou trabalhos que o V2 ajudou a salvar.
              </p>
              <p>
                A gente sabe disso porque <strong className="text-white">+3.200 profissionais</strong> como você usam o Arcano todo dia.
              </p>
              <p>
                E foi exatamente ouvindo esses profissionais — ouvindo <strong className="text-white">você</strong> — que construímos o V3.
              </p>
              <p className="text-white font-semibold">
                Dois pedidos apareceram repetidamente:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[680px] mx-auto mb-10">
              <div className="text-left p-5 rounded-xl" style={{ background: "#1E1B2E", borderLeft: "3px solid #A855F7" }}>
                <p className="italic" style={{ color: "#A1A1AA" }}>
                  <span className="text-2xl mr-2">💬</span>
                  "Preciso que seja mais rápido."
                </p>
              </div>
              <div className="text-left p-5 rounded-xl" style={{ background: "#1E1B2E", borderLeft: "3px solid #A855F7" }}>
                <p className="italic" style={{ color: "#A1A1AA" }}>
                  <span className="text-2xl mr-2">💬</span>
                  "Preciso processar várias fotos de uma vez."
                </p>
              </div>
            </div>

            <p className="text-xl font-bold">
              Arcano V3. Feito a pedido dos clientes.
            </p>
          </div>
        </section>

        {/* SEÇÃO 3 — FEATURES */}
        <section className="py-16 px-4" style={{ background: "#0D0B14" }}>
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">O que mudou no V3</h2>
            <p className="mb-12" style={{ color: "#A1A1AA" }}>
              Dois recursos. Impacto real no seu fluxo de trabalho.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CARD — MODO TURBO */}
              <div
                className="text-left p-8 rounded-2xl"
                style={{ background: "#13101F", border: "1px solid #2D2B3D", boxShadow: "0 8px 32px rgba(124, 58, 237, 0.1)" }}
              >
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase mb-4" style={{ background: "#F59E0B", color: "#0D0B14" }}>
                  NOVO
                </span>
                <div className="text-5xl mb-4">⚡</div>
                <h3 className="text-2xl font-bold mb-2">Modo Turbo</h3>
                <p className="font-bold mb-4" style={{ color: "#A855F7" }}>Resultado em menos de 60 segundos.</p>
                <p className="leading-relaxed" style={{ color: "#A1A1AA" }}>
                  Você lembra da última vez que um cliente estava esperando do outro lado enquanto você processava a imagem? Ou quando tinha prazo para entregar e a imagem ainda estava sendo processada?
                </p>
                <p className="mt-4 leading-relaxed" style={{ color: "#A1A1AA" }}>
                  O Modo Turbo elimina essa espera. Mesma qualidade 4K que você já conhece. Mesmo motor de IA. Só que agora em menos de 1 minuto.
                </p>
                <ul className="mt-6 space-y-2">
                  {["Velocidade até 10x maior", "Qualidade 4K preservada", "Ideal para entregas urgentes"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span style={{ color: "#22C55E" }}>✓</span>
                      <span style={{ color: "#A1A1AA" }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CARD — UPSCALE EM LOTE */}
              <div
                className="text-left p-8 rounded-2xl"
                style={{ background: "#13101F", border: "1px solid #2D2B3D", boxShadow: "0 8px 32px rgba(124, 58, 237, 0.1)" }}
              >
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase mb-4" style={{ background: "#F59E0B", color: "#0D0B14" }}>
                  NOVO
                </span>
                <div className="text-5xl mb-4">📦</div>
                <h3 className="text-2xl font-bold mb-2">Upscale em Lote</h3>
                <p className="font-bold mb-4" style={{ color: "#A855F7" }}>Até 10 imagens processadas de uma vez.</p>
                <p className="leading-relaxed" style={{ color: "#A1A1AA" }}>
                  Chega de arrastar imagem por imagem. Selecione até 10 fotos, clique uma vez, e deixe a IA trabalhar enquanto você faz outra coisa.
                </p>
                <p className="mt-4 leading-relaxed" style={{ color: "#A1A1AA" }}>
                  Perfeito para quem trabalha com catálogos, ensaios fotográficos ou qualquer projeto que envolva múltiplas imagens.
                </p>
                <ul className="mt-6 space-y-2">
                  {["Até 10 imagens simultâneas", "Processamento paralelo", "Download individual ou em lote"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span style={{ color: "#22C55E" }}>✓</span>
                      <span style={{ color: "#A1A1AA" }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* SEÇÃO 4 — COMPARATIVO V2 vs V3 */}
        <section className="py-16 px-4" style={{ background: "#13101F" }}>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">V2 vs V3 — O que muda pra você</h2>
            <p className="mb-10" style={{ color: "#A1A1AA" }}>Tudo que você já tem, mais duas funcionalidades poderosas.</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ borderBottom: "1px solid #2D2B3D" }}>
                    <th className="py-4 px-4 text-sm font-bold uppercase tracking-wider" style={{ color: "#A1A1AA" }}>Recurso</th>
                    <th className="py-4 px-4 text-sm font-bold uppercase tracking-wider text-center" style={{ color: "#A1A1AA" }}>V2</th>
                    <th className="py-4 px-4 text-sm font-bold uppercase tracking-wider text-center" style={{ color: "#A855F7" }}>V3</th>
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
                    <tr key={i} style={{ borderBottom: "1px solid #1E1B2E" }}>
                      <td className="py-3.5 px-4 text-sm font-medium">{feature as string}</td>
                      <td className="py-3.5 px-4 text-center text-lg">
                        {v2 === true ? <span style={{ color: "#22C55E" }}>✓</span> : v2 === false ? <span style={{ color: "#EF4444" }}>✗</span> : <span style={{ color: "#A1A1AA" }}>—</span>}
                      </td>
                      <td className="py-3.5 px-4 text-center text-lg">
                        {v3 === true ? <span style={{ color: "#22C55E" }}>✓</span> : <span style={{ color: "#A1A1AA" }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SEÇÃO 5 — GARANTIA DE CONTINUIDADE */}
        <section className="py-16 px-4" style={{ background: "#0D0B14" }}>
          <div className="max-w-3xl mx-auto">
            <div
              className="p-8 rounded-2xl text-center"
              style={{ background: "rgba(5, 46, 22, 0.5)", border: "1px solid #22C55E" }}
            >
              <div className="text-4xl mb-4">🔒</div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">Seus créditos e acessos estão protegidos</h2>
              <p className="leading-relaxed max-w-[560px] mx-auto" style={{ color: "#A1A1AA" }}>
                O upgrade para V3 é <strong className="text-white">aditivo</strong>. Você não perde nada do que já tem. Seus créditos do V2 continuam intactos. Seu acesso ao V2 permanece ativo. O V3 adiciona dois novos recursos ao que você já possui.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm font-semibold">
                <span className="flex items-center gap-1.5"><span style={{ color: "#22C55E" }}>✓</span> Créditos preservados</span>
                <span className="flex items-center gap-1.5"><span style={{ color: "#22C55E" }}>✓</span> Acesso V2 mantido</span>
                <span className="flex items-center gap-1.5"><span style={{ color: "#22C55E" }}>✓</span> Acesso imediato ao V3</span>
              </div>
            </div>
          </div>
        </section>

        {/* SEÇÃO 6 — SOCIAL PROOF */}
        <section className="py-16 px-4" style={{ background: "#13101F" }}>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">+3.200 profissionais já confiam no Arcano</h2>
            <p className="mb-10" style={{ color: "#A1A1AA" }}>E os primeiros a testar o V3 já estão falando.</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { text: "O Modo Turbo é absurdo. Antes esperava 5 minutos, agora em 40 segundos tá pronto.", name: "Lucas M.", role: "Designer Gráfico" },
                { text: "O lote mudou meu jogo. Processo 10 fotos de catálogo de uma vez. Economizo horas.", name: "Camila R.", role: "Fotógrafa de Produto" },
                { text: "Já usava o V2 todo dia. O V3 fez eu não querer voltar nunca mais.", name: "Rafael S.", role: "Social Media" },
              ].map((t, i) => (
                <div key={i} className="text-left p-6 rounded-2xl" style={{ background: "#1E1B2E", border: "1px solid #2D2B3D" }}>
                  <div className="flex gap-0.5 mb-3">
                    {Array(5).fill(null).map((_, j) => <span key={j} style={{ color: "#F59E0B" }}>★</span>)}
                  </div>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: "#A1A1AA" }}>"{t.text}"</p>
                  <p className="text-sm font-bold">{t.name}</p>
                  <p className="text-xs" style={{ color: "#A1A1AA" }}>{t.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SEÇÃO 7 — CTA + PREÇO */}
        <section id="planos" className="py-20 px-4" style={{ background: "#0D0B14" }}>
          <div className="max-w-2xl mx-auto text-center">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6" style={{ background: "#F59E0B", color: "#0D0B14" }}>
              OFERTA EXCLUSIVA PARA CLIENTES V2
            </span>

            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Faça o upgrade agora</h2>
            <p className="mb-10" style={{ color: "#A1A1AA" }}>
              Acesso imediato ao Modo Turbo + Upscale em Lote. Seus créditos continuam intactos.
            </p>

            <div
              className="p-8 rounded-2xl text-center"
              style={{ background: "#13101F", border: "2px solid #7C3AED", boxShadow: "0 0 40px rgba(124, 58, 237, 0.15)" }}
            >
              <h3 className="text-xl font-bold mb-2">Arcano V3 — Upgrade Vitalício</h3>
              <p className="text-sm mb-6" style={{ color: "#A1A1AA" }}>Pagamento único. Acesso para sempre.</p>

              <div className="mb-6">
                <span className="text-sm line-through" style={{ color: "#A1A1AA" }}>R$ 97,00</span>
                <div className="text-5xl font-black mt-1" style={{ color: "#F59E0B" }}>
                  R$ 67<span className="text-2xl">,00</span>
                </div>
                <p className="text-sm mt-1" style={{ color: "#A1A1AA" }}>ou 12x de R$ 6,73</p>
              </div>

              <ul className="text-left max-w-xs mx-auto space-y-2.5 mb-8">
                {[
                  "Modo Turbo (resultado em < 60s)",
                  "Upscale em Lote (até 10 imgs)",
                  "Acesso à V2 incluso",
                  "Créditos preservados",
                  "Acesso vitalício",
                  "Suporte prioritário",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span style={{ color: "#22C55E" }}>✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <button
                className="w-full py-4 rounded-xl text-lg font-bold transition-all hover:scale-105 hover:brightness-110 cursor-pointer"
                style={{ background: "#F59E0B", color: "#0D0B14" }}
              >
                🚀 Fazer Upgrade para V3 Agora
              </button>

              <p className="mt-4 text-xs" style={{ color: "#A1A1AA" }}>
                Pagamento seguro via Mercado Pago · Acesso imediato após confirmação
              </p>
            </div>
          </div>
        </section>

        {/* SEÇÃO 8 — FAQ */}
        <section className="py-16 px-4" style={{ background: "#13101F" }}>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-10">Perguntas frequentes</h2>

            <div className="space-y-4">
              {[
                { q: "Eu perco meus créditos do V2?", a: "Não. Seus créditos continuam exatamente como estão. O V3 é um upgrade aditivo." },
                { q: "Preciso pagar de novo pelo V2?", a: "Não. Quem compra o V3 recebe acesso ao V2 automaticamente. Você mantém tudo." },
                { q: "O Modo Turbo consome mais créditos?", a: "Não. O consumo de créditos é o mesmo. Só a velocidade muda." },
                { q: "Posso usar o V2 e o V3 ao mesmo tempo?", a: "Sim. Você terá acesso às duas versões e pode alternar entre elas a qualquer momento." },
                { q: "O acesso é vitalício mesmo?", a: "Sim. Pagamento único, acesso para sempre. Sem assinaturas ou taxas recorrentes." },
              ].map((item, i) => (
                <details
                  key={i}
                  className="group p-5 rounded-xl cursor-pointer"
                  style={{ background: "#1E1B2E", border: "1px solid #2D2B3D" }}
                >
                  <summary className="font-bold text-sm sm:text-base list-none flex items-center justify-between">
                    {item.q}
                    <span className="ml-2 transition-transform group-open:rotate-45 text-xl" style={{ color: "#A855F7" }}>+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: "#A1A1AA" }}>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* SEÇÃO 9 — CTA FINAL */}
        <section className="py-20 px-4 text-center" style={{ background: "#0D0B14" }}>
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Você já sabe que funciona.
              <br />
              <span style={{ color: "#A855F7" }}>Agora é hora de ir mais rápido.</span>
            </h2>
            <p className="mb-8" style={{ color: "#A1A1AA" }}>
              O V3 está disponível agora. Seus créditos estão esperando. Seu upgrade também.
            </p>
            <button
              onClick={scrollToPlanos}
              className="px-8 py-4 rounded-xl text-lg font-bold transition-all hover:scale-105 hover:brightness-110 cursor-pointer"
              style={{ background: "#F59E0B", color: "#0D0B14" }}
            >
              🚀 Quero o Arcano V3 — Fazer Upgrade
            </button>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="py-8 px-4 text-center text-xs" style={{ color: "#A1A1AA", borderTop: "1px solid #1E1B2E" }}>
          <p>© {new Date().getFullYear()} Arcano · Todos os direitos reservados</p>
        </footer>
      </div>
    </>
  );
};

export default UpgradeUpscalerV3;
