import { useState, useRef, useCallback } from "react";

const PLACE_OPTIONS = [
  { label: "McDonald's", value: "McDonald's com arcos dourados icônicos, letreiro iluminado e fachada reconhecível" },
  { label: "Lanchonete / fast food", value: "lanchonete fast food com fachada colorida e letreiro luminoso" },
  { label: "Bar / boteco", value: "bar ou boteco com mesas na calçada e placa de néon" },
  { label: "Shopping / loja", value: "shopping com fachada de vidro e lojas com vitrines iluminadas" },
  { label: "Posto de gasolina", value: "posto de gasolina com toldos e bombas de combustível" },
  { label: "Academia", value: "academia gym com logo e janelas de vidro" },
  { label: "Restaurante", value: "restaurante com fachada rústica e placa iluminada" },
  { label: "Hotel", value: "hotel com entrada principal e marquise iluminada" },
];

const EXPRESSION_OPTIONS = [
  { label: "Grito épico", value: "mouth wide open in a raw primal scream of excitement, eyes wild and bulging" },
  { label: "Gargalhada", value: "huge genuine laughing expression, eyes squinting, mouth wide open, teeth fully showing" },
  { label: "Sorriso amplo", value: "massive natural smile, eyes bright and joyful, radiating happiness" },
  { label: "Surpresa", value: "shocked expression, eyebrows raised high, mouth slightly open, eyes wide in disbelief" },
  { label: "Raiva épica", value: "intense angry expression, brow deeply furrowed, gritting teeth, fierce stare" },
  { label: "Sedutor", value: "confident smirk, one eyebrow subtly raised, mysterious and cool" },
  { label: "Expressão séria", value: "calm stoic neutral expression, composed, serious, looking directly into the lens" },
  { label: "Piscadela", value: "playful winking, one eye closed, slight mischievous smile" },
  { label: "Terror total", value: "terrified expression, wide eyes, mouth agape, pure panic on face" },
  { label: "Choro dramático", value: "dramatic crying, tears streaming down face, over-the-top emotional" },
];

const STYLE_OPTIONS = [
  { label: "Realista", value: "hyperrealistic photojournalism, 8K, cold blue-grey shadows, warm golden highlights on face, ISO 800 grain, no oversaturation" },
  { label: "Épico", value: "cinematic epic, high contrast, dramatic shadows, teal and orange color grade, blockbuster atmosphere" },
  { label: "NASA", value: "NASA documentary style, desaturated, authentic space photography, archival quality" },
];

const INPAINT_STEPS: [string, string][] = [
  ["Rosto", "Selecione a região do rosto dentro do capacete e use inpainting com a foto de referência. Preserve o reflexo do visor e as luzes do capacete."],
  ["Local", "Selecione a estrutura ao fundo e substitua pela fachada do local enviado. Mantenha iluminação fria e sombras na mesma direção do sol."],
  ["Sombras", "Astronauta e local devem ter sombras na mesma direção — luz vem do canto superior esquerdo."],
  ["Color grading", "Sombras frias (azul/cinza), highlights dourados no rosto. Grain ISO 800 sutil. Sem HDR ou oversaturation."],
  ["Detalhe final", "Partículas de poeira lunar flutuando ao redor da mão em movimento. Detalhe que diferencia o resultado."],
];

const CONFIG_STEPS = [
  { n: 1, text: <><strong>Image 1 · Character Reference</strong> — sua foto do rosto. Define quem é o astronauta.</> },
  { n: 2, text: <><strong>Image 2 · Scene Reference</strong> — foto do local. Define o que aparece ao fundo na lua.</> },
  { n: 3, text: <><strong>Image 3 · Composition Reference</strong> — imagem do astronauta. Define enquadramento e ângulo.</> },
  { n: 4, text: <>Cole o prompt e selecione o modo <strong>Image-to-Image + Inpainting</strong>.</> },
];

interface UploadState {
  done: boolean;
  thumb: string;
}

export default function SelfieNaLua() {
  const [uploads, setUploads] = useState<Record<string, UploadState>>({
    face: { done: false, thumb: "" },
    place: { done: false, thumb: "" },
    ref: { done: false, thumb: "" },
  });
  const [placeType, setPlaceType] = useState(PLACE_OPTIONS[0].value);
  const [expression, setExpression] = useState(EXPRESSION_OPTIONS[0].value);
  const [activeStyle, setActiveStyle] = useState(0);
  const [generated, setGenerated] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [inpaintPlain, setInpaintPlain] = useState("");
  const [copyStates, setCopyStates] = useState<Record<string, string>>({});

  const faceRef = useRef<HTMLInputElement>(null);
  const placeRef = useRef<HTMLInputElement>(null);
  const refRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const fileRefs: Record<string, React.RefObject<HTMLInputElement>> = {
    face: faceRef, place: placeRef, ref: refRef,
  };

  const handleUpload = useCallback((key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploads((prev) => ({ ...prev, [key]: { done: true, thumb: ev.target?.result as string } }));
    };
    reader.readAsDataURL(file);
  }, []);

  const generate = useCallback(() => {
    const style = STYLE_OPTIONS[activeStyle].value;
    const prompt = `POV extreme close-up selfie shot of an astronaut on the lunar surface. The astronaut's face must match the reference face exactly — same facial structure, skin texture, beard stubble and eye color. Expression: ${expression}. Face fills the lower-center frame pressed close to the camera lens, fisheye wide-angle perspective.

Spacesuit: heavily weathered NASA-style EVA suit, grey-white with dust and grime, mission patches on shoulders, chest control unit with toggle switches. One gloved hand reaching toward the camera in the foreground, slightly motion-blurred.

Background: a fully built ${placeType} constructed directly on the lunar surface — same architecture, signage and proportions as in the reference image, adapted to the lunar environment with no atmosphere, hard single-source solar shadows and vacuum blackness above. The structure sits naturally on grey cratered regolith.

Sky: deep absolute black, zero atmosphere. Milky Way galaxy core visible as a luminous streak in the upper frame. Earth in the upper-left corner — vivid blue oceans and white cloud systems against the void.

Lighting: single harsh directional sunlight from upper-left, sharp hard-edged shadows with no diffusion. Strong rim light on the right side of the spacesuit. Helmet visor partially reflects the lunar landscape. Face lit by two small interior helmet LED lights. No ambient light, extreme contrast.

Camera: Canon EOS R5, 14mm f/2.8 ultra-wide, 1/2000s, ISO 800. Focus on face, background sharp with slight depth-of-field fall-off. ${style}.`;

    setPromptText(prompt);
    setInpaintPlain(INPAINT_STEPS.map(([t, d], i) => `${i + 1}. ${t}: ${d}`).join("\n"));
    setGenerated(true);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, [placeType, expression, activeStyle]);

  const copyBlock = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyStates((prev) => ({ ...prev, [key]: "✓ Copiado" }));
      setTimeout(() => setCopyStates((prev) => ({ ...prev, [key]: "" })), 1800);
    });
  }, []);

  const uploadItems: { key: string; emoji: string; name: string; sub: string }[] = [
    { key: "face", emoji: "👤", name: "Seu rosto", sub: "Substitui o astronauta" },
    { key: "place", emoji: "🏢", name: "Local / estabelecimento", sub: "Aparece ao fundo na lua" },
    { key: "ref", emoji: "🌙", name: "Referência de cena", sub: "Composição e ângulo" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
        .snl-app *,.snl-app *::before,.snl-app *::after{box-sizing:border-box;margin:0;padding:0}
        .snl-app{
          --bg:#0c0d1a;--panel:#101220;--card:#161829;--input-bg:#0e0f1e;
          --border:rgba(255,255,255,0.06);--border-hl:rgba(124,58,237,0.45);
          --purple:#7c3aed;--purple-lt:#a78bfa;
          --text-1:#eeeef5;--text-2:#7b7fa8;--text-3:#3d4060;
          --green:#34d399;--radius:12px;
          display:grid;grid-template-columns:320px 1fr;min-height:100vh;
          font-family:'DM Sans',sans-serif;font-size:14px;color:var(--text-1);background:var(--bg);
          position:fixed;inset:0;z-index:9999;overflow:hidden;
        }
        .snl-sidebar{
          background:var(--panel);border-right:1px solid var(--border);
          display:flex;flex-direction:column;padding:32px 24px 28px;gap:26px;overflow-y:auto;
        }
        .snl-brand{display:flex;flex-direction:column;gap:4px}
        .snl-brand-tag{font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--purple-lt);opacity:0.65}
        .snl-brand h1{font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:var(--text-1);letter-spacing:-0.4px}
        .snl-sep{height:1px;background:var(--border)}
        .snl-field{display:flex;flex-direction:column;gap:8px}
        .snl-label{font-size:10.5px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text-2)}
        .snl-upload-item{
          display:flex;align-items:center;gap:12px;padding:10px 13px;
          background:var(--input-bg);border:1px solid var(--border);border-radius:var(--radius);
          cursor:pointer;transition:border-color 0.18s;position:relative;overflow:hidden;
        }
        .snl-upload-item:hover{border-color:rgba(124,58,237,0.3)}
        .snl-upload-item.done{border-color:rgba(52,211,153,0.3)}
        .snl-upload-item input{position:absolute;inset:0;opacity:0;cursor:pointer}
        .snl-upload-thumb{
          width:32px;height:32px;border-radius:7px;object-fit:cover;flex-shrink:0;
          border:1px solid var(--border);
        }
        .snl-upload-placeholder{
          width:32px;height:32px;border-radius:7px;background:var(--card);
          border:1px dashed rgba(124,58,237,0.3);
          display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;
        }
        .snl-upload-info{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}
        .snl-upload-name{font-size:12.5px;font-weight:500;color:var(--text-1)}
        .snl-upload-sub{font-size:11px;color:var(--text-3)}
        .snl-upload-item.done .snl-upload-sub{color:var(--green)}
        .snl-upload-arrow{font-size:12px;color:var(--text-3);transition:color 0.18s}
        .snl-upload-item.done .snl-upload-arrow{color:var(--green)}
        .snl-sel-wrap{position:relative}
        .snl-sel-wrap select{
          width:100%;padding:10px 34px 10px 12px;background:var(--input-bg);
          border:1px solid var(--border);border-radius:var(--radius);color:var(--text-1);
          font-family:'DM Sans',sans-serif;font-size:13px;appearance:none;cursor:pointer;
          transition:border-color 0.18s;
        }
        .snl-sel-wrap select:focus{outline:none;border-color:var(--border-hl)}
        .snl-sel-wrap select option{background:#181a2e}
        .snl-sel-wrap::after{
          content:'';position:absolute;right:12px;top:50%;transform:translateY(-50%);
          border-left:4px solid transparent;border-right:4px solid transparent;
          border-top:5px solid var(--text-2);pointer-events:none;
        }
        .snl-style-pills{display:flex;gap:6px}
        .snl-style-pill{
          flex:1;padding:8px 0;border-radius:9px;border:1px solid var(--border);
          background:var(--input-bg);color:var(--text-2);font-family:'Syne',sans-serif;
          font-size:11px;font-weight:700;cursor:pointer;text-align:center;
          transition:all 0.15s;letter-spacing:0.2px;
        }
        .snl-style-pill:hover{border-color:rgba(124,58,237,0.3);color:var(--text-1)}
        .snl-style-pill.on{background:rgba(124,58,237,0.14);border-color:var(--border-hl);color:var(--purple-lt)}
        .snl-cta{
          margin-top:auto;width:100%;padding:13px 0;border:none;border-radius:var(--radius);
          background:var(--purple);color:#fff;font-family:'Syne',sans-serif;
          font-size:13.5px;font-weight:700;letter-spacing:0.3px;cursor:pointer;
          display:flex;align-items:center;justify-content:center;gap:8px;
          transition:opacity 0.18s,transform 0.12s;box-shadow:0 4px 24px rgba(124,58,237,0.28);
        }
        .snl-cta:hover{opacity:0.87}
        .snl-cta:active{transform:scale(0.98)}
        .snl-main{display:flex;flex-direction:column;background:var(--bg);min-height:100vh;overflow-y:auto}
        .snl-topbar{
          display:flex;align-items:center;padding:20px 36px;
          border-bottom:1px solid var(--border);gap:7px;
        }
        .snl-dot{width:9px;height:9px;border-radius:50%}
        .snl-d-r{background:#ef4444}.snl-d-y{background:#f59e0b}.snl-d-g{background:#22c55e}
        .snl-content{
          flex:1;display:flex;align-items:flex-start;justify-content:center;
          padding:44px 36px 60px;
        }
        .snl-empty{
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          gap:14px;min-height:380px;text-align:center;
        }
        .snl-empty-icon{
          width:58px;height:58px;border-radius:18px;background:var(--panel);
          border:1px solid var(--border);display:flex;align-items:center;justify-content:center;
          font-size:26px;
        }
        .snl-empty h2{font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:var(--text-1)}
        .snl-empty p{font-size:13px;color:var(--text-2);max-width:260px;line-height:1.7}
        .snl-result{display:flex;flex-direction:column;gap:14px;width:100%;max-width:720px}
        .snl-r-block{background:var(--panel);border:1px solid var(--border);border-radius:16px;overflow:hidden}
        .snl-r-head{
          display:flex;align-items:center;justify-content:space-between;
          padding:13px 18px;border-bottom:1px solid var(--border);
        }
        .snl-r-title{font-family:'Syne',sans-serif;font-size:10.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-2)}
        .snl-copy-btn{
          padding:4px 12px;border-radius:7px;border:1px solid var(--border-hl);
          background:rgba(124,58,237,0.1);color:var(--purple-lt);font-size:11.5px;
          font-weight:600;cursor:pointer;transition:background 0.15s;
        }
        .snl-copy-btn:hover{background:rgba(124,58,237,0.22)}
        .snl-r-body{
          padding:20px;font-size:13px;line-height:1.85;color:var(--text-1);
          white-space:pre-wrap;font-weight:300;
        }
        .snl-steps{padding:18px 20px;display:flex;flex-direction:column;gap:13px}
        .snl-step{display:flex;gap:13px;align-items:flex-start}
        .snl-step-n{
          width:20px;height:20px;border-radius:50%;
          background:rgba(124,58,237,0.15);border:1px solid var(--border-hl);
          display:flex;align-items:center;justify-content:center;
          font-family:'Syne',sans-serif;font-size:10px;font-weight:700;
          color:var(--purple-lt);flex-shrink:0;margin-top:2px;
        }
        .snl-step-t{font-size:13px;color:var(--text-1);line-height:1.75;font-weight:300}
        .snl-step-t strong{color:var(--purple-lt);font-weight:500}
      `}</style>

      <div className="snl-app">
        <aside className="snl-sidebar">
          <div className="snl-brand">
            <span className="snl-brand-tag">Arcano · VoxVisual</span>
            <h1>Moon Selfie</h1>
          </div>

          <div className="snl-sep" />

          <div className="snl-field">
            <span className="snl-label">Referências</span>
            {uploadItems.map((item) => {
              const u = uploads[item.key];
              return (
                <div
                  key={item.key}
                  className={`snl-upload-item${u.done ? " done" : ""}`}
                  onClick={() => fileRefs[item.key].current?.click()}
                >
                  <input
                    type="file"
                    ref={fileRefs[item.key] as any}
                    accept="image/*"
                    onChange={(e) => handleUpload(item.key, e)}
                  />
                  {u.done ? (
                    <img className="snl-upload-thumb" src={u.thumb} alt="" />
                  ) : (
                    <div className="snl-upload-placeholder">{item.emoji}</div>
                  )}
                  <div className="snl-upload-info">
                    <span className="snl-upload-name">{item.name}</span>
                    <span className="snl-upload-sub">{u.done ? "✓ Carregado" : item.sub}</span>
                  </div>
                  <span className="snl-upload-arrow">{u.done ? "✓" : "↑"}</span>
                </div>
              );
            })}
          </div>

          <div className="snl-sep" />

          <div className="snl-field">
            <span className="snl-label">Tipo de local</span>
            <div className="snl-sel-wrap">
              <select value={placeType} onChange={(e) => setPlaceType(e.target.value)}>
                {PLACE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="snl-field">
            <span className="snl-label">Expressão</span>
            <div className="snl-sel-wrap">
              <select value={expression} onChange={(e) => setExpression(e.target.value)}>
                {EXPRESSION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="snl-field">
            <span className="snl-label">Estilo visual</span>
            <div className="snl-style-pills">
              {STYLE_OPTIONS.map((s, i) => (
                <button
                  key={s.label}
                  className={`snl-style-pill${activeStyle === i ? " on" : ""}`}
                  onClick={() => setActiveStyle(i)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <button className="snl-cta" onClick={generate}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Gerar Prompt
          </button>
        </aside>

        <main className="snl-main">
          <div className="snl-topbar">
            <span className="snl-dot snl-d-r" />
            <span className="snl-dot snl-d-y" />
            <span className="snl-dot snl-d-g" />
          </div>

          <div className="snl-content">
            {!generated ? (
              <div className="snl-empty">
                <div className="snl-empty-icon">🌙</div>
                <h2>Prompt aparece aqui</h2>
                <p>Configure as opções ao lado e clique em Gerar Prompt.</p>
              </div>
            ) : (
              <div className="snl-result" ref={resultRef}>
                <div className="snl-r-block">
                  <div className="snl-r-head">
                    <span className="snl-r-title">Prompt principal — Nano Banana</span>
                    <button className="snl-copy-btn" onClick={() => copyBlock(promptText, "prompt")}>
                      {copyStates["prompt"] || "Copiar"}
                    </button>
                  </div>
                  <div className="snl-r-body">{promptText}</div>
                </div>

                <div className="snl-r-block">
                  <div className="snl-r-head">
                    <span className="snl-r-title">Inpainting — passo a passo</span>
                    <button className="snl-copy-btn" onClick={() => copyBlock(inpaintPlain, "inpaint")}>
                      {copyStates["inpaint"] || "Copiar"}
                    </button>
                  </div>
                  <div className="snl-steps">
                    {INPAINT_STEPS.map(([t, d], i) => (
                      <div className="snl-step" key={i}>
                        <span className="snl-step-n">{i + 1}</span>
                        <span className="snl-step-t"><strong>{t}:</strong> {d}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="snl-r-block">
                  <div className="snl-r-head">
                    <span className="snl-r-title">Como configurar no Nano Banana</span>
                  </div>
                  <div className="snl-steps">
                    {CONFIG_STEPS.map((s) => (
                      <div className="snl-step" key={s.n}>
                        <span className="snl-step-n">{s.n}</span>
                        <span className="snl-step-t">{s.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}