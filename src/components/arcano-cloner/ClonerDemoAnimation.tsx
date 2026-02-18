import React, { useState, useEffect, useRef } from 'react';
import { Upload, Image, Square, Smartphone, RectangleVertical, RectangleHorizontal, Sparkles, Wand2, Zap, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Step durations in ms
const STEP_DURATIONS = [2200, 2200, 1800, 3200];
const TOTAL_DURATION = STEP_DURATIONS.reduce((a, b) => a + b, 0); // ~9.4s

const stepLabels = [
  { emoji: '📸', text: 'Faça o upload da sua foto' },
  { emoji: '🖼️', text: 'Escolha uma referência profissional da biblioteca' },
  { emoji: '📐', text: 'Selecione o tamanho da imagem' },
  { emoji: '✨', text: 'Clique em Gerar e receba o resultado em segundos' },
];

const ClonerDemoAnimation: React.FC = () => {
  const [step, setStep] = useState(0);
  const [faceVisible, setFaceVisible] = useState(false);
  const [refVisible, setRefVisible] = useState(false);
  const [selectedRatio, setSelectedRatio] = useState<string | null>(null);
  const [buttonClicked, setButtonClicked] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 30, y: 40 });
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorClicking, setCursorClicking] = useState(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAll = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const resetAnimation = () => {
    clearAll();
    setFaceVisible(false);
    setRefVisible(false);
    setSelectedRatio(null);
    setButtonClicked(false);
    setLoadingProgress(0);
    setShowResult(false);
    setCursorVisible(false);
    setCursorClicking(false);
    setCursorPos({ x: 30, y: 40 });
  };

  const animateCursor = (toX: number, toY: number, delay: number, onArrived?: () => void) => {
    timeoutRef.current = setTimeout(() => {
      setCursorVisible(true);
      setCursorPos({ x: toX, y: toY });
      timeoutRef.current = setTimeout(() => {
        setCursorClicking(true);
        timeoutRef.current = setTimeout(() => {
          setCursorClicking(false);
          onArrived?.();
        }, 250);
      }, 600);
    }, delay);
  };

  useEffect(() => {
    resetAnimation();

    if (step === 0) {
      // Move cursor to face card, click, show face
      animateCursor(22, 45, 300, () => {
        timeoutRef.current = setTimeout(() => setFaceVisible(true), 200);
      });
    } else if (step === 1) {
      // Move cursor to ref card, click, show ref
      setCursorVisible(true);
      setCursorPos({ x: 22, y: 45 });
      animateCursor(57, 45, 400, () => {
        timeoutRef.current = setTimeout(() => setRefVisible(true), 200);
      });
    } else if (step === 2) {
      // Keep images, move cursor to ratio selector
      setFaceVisible(true);
      setRefVisible(true);
      animateCursor(38, 72, 300, () => {
        timeoutRef.current = setTimeout(() => setSelectedRatio('1:1'), 150);
      });
    } else if (step === 3) {
      // Keep images + ratio, click generate button
      setFaceVisible(true);
      setRefVisible(true);
      setSelectedRatio('1:1');
      animateCursor(50, 88, 200, () => {
        timeoutRef.current = setTimeout(() => {
          setButtonClicked(true);
          // Start loading bar
          setLoadingProgress(0);
          let prog = 0;
          progressIntervalRef.current = setInterval(() => {
            prog += 2.5;
            setLoadingProgress(Math.min(prog, 100));
            if (prog >= 100) {
              if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
              timeoutRef.current = setTimeout(() => {
                setShowResult(true);
                setCursorVisible(false);
              }, 200);
            }
          }, 40);
        }, 300);
      });
    }
  }, [step]);

  // Step advancement loop
  useEffect(() => {
    const t = setTimeout(() => {
      setStep(prev => {
        const next = (prev + 1) % 4;
        return next;
      });
    }, STEP_DURATIONS[step]);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="max-w-5xl mx-auto px-4">
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-3 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={cn(
              'relative w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500',
              step === i
                ? 'bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/40 scale-110'
                : step > i
                ? 'bg-fuchsia-500/30 text-fuchsia-300 border border-fuchsia-500/40'
                : 'bg-white/5 text-white/30 border border-white/10'
            )}>
              {step > i ? <Check className="w-4 h-4" /> : i + 1}
              {step === i && (
                <span className="absolute inset-0 rounded-full bg-fuchsia-500/30 animate-ping" />
              )}
            </div>
            {i < 3 && (
              <div className={cn(
                'h-0.5 w-8 md:w-16 rounded-full transition-all duration-700',
                step > i ? 'bg-fuchsia-500/60' : 'bg-white/10'
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Main mockup */}
      <div className="relative bg-[#1A0A2E]/90 border border-purple-500/30 rounded-2xl overflow-hidden shadow-2xl shadow-purple-900/40">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-purple-500/20 bg-black/30">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/70" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <span className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <span className="text-white/30 text-xs font-mono">arcano.app / cloner</span>
          </div>
        </div>

        {/* Content area */}
        <div className="p-4 md:p-6 relative" style={{ minHeight: 320 }}>
          {/* Animated cursor */}
          <div
            className={cn(
              'absolute z-30 pointer-events-none transition-all duration-500 ease-in-out',
              cursorVisible ? 'opacity-100' : 'opacity-0'
            )}
            style={{ left: `${cursorPos.x}%`, top: `${cursorPos.y}%` }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              className={cn(
                'transition-transform duration-150',
                cursorClicking ? 'scale-75' : 'scale-100'
              )}
            >
              <path d="M4 2L4 16L8 12L11 19L13.5 18L10.5 11L16 11L4 2Z" fill="white" stroke="#1A0A2E" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            {cursorClicking && (
              <span className="absolute -inset-2 rounded-full bg-fuchsia-400/30 animate-ping" />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
            {/* Left panel - inputs */}
            <div className="md:col-span-3 space-y-3">
              {/* Face + Ref cards row */}
              <div className="grid grid-cols-2 gap-3">
                 {/* Face card */}
                 <div className={cn(
                   'relative border-2 border-dashed rounded-xl overflow-hidden transition-all duration-300',
                   step === 0
                     ? 'border-fuchsia-500/70 shadow-lg shadow-fuchsia-500/20'
                     : 'border-purple-500/30',
                 )}>
                   <div className="aspect-square bg-purple-900/20 relative">
                     {/* Skeleton representation when empty */}
                     {!faceVisible && (
                       <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                         <Upload className="w-7 h-7 text-purple-400/60" />
                         <span className="text-[10px] text-purple-300/50 font-medium">Sua Foto</span>
                       </div>
                     )}
                     {/* Skeleton filled state */}
                     {faceVisible && (
                       <div className={cn(
                         'absolute inset-0 flex flex-col transition-all duration-700',
                         faceVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                       )}>
                         {/* Face silhouette skeleton */}
                         <div className="flex-1 flex items-center justify-center bg-purple-800/30">
                           <div className="relative flex flex-col items-center gap-1.5">
                             {/* Head circle */}
                             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/50 to-fuchsia-500/40 border border-fuchsia-400/30 flex items-center justify-center">
                               <svg viewBox="0 0 24 24" className="w-6 h-6 fill-fuchsia-300/60">
                                 <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                               </svg>
                             </div>
                             {/* Skeleton lines */}
                             <div className="space-y-1">
                               <div className="h-1.5 w-16 rounded-full bg-purple-500/30 animate-pulse" />
                               <div className="h-1 w-10 mx-auto rounded-full bg-purple-500/20 animate-pulse" style={{ animationDelay: '150ms' }} />
                             </div>
                           </div>
                         </div>
                         <div className="bg-fuchsia-600/20 px-2 py-1 flex items-center gap-1">
                           <Check className="w-3 h-3 text-fuchsia-400" />
                           <span className="text-[9px] text-fuchsia-300 font-medium">Sua Foto</span>
                         </div>
                       </div>
                     )}
                   </div>
                 </div>

                 {/* Ref card */}
                 <div className={cn(
                   'relative border-2 border-dashed rounded-xl overflow-hidden transition-all duration-300',
                   step === 1
                     ? 'border-fuchsia-500/70 shadow-lg shadow-fuchsia-500/20'
                     : 'border-purple-500/30',
                 )}>
                   <div className="aspect-square bg-purple-900/20 relative">
                     {!refVisible && step !== 1 && (
                       <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                         <Image className="w-7 h-7 text-purple-400/60" />
                         <span className="text-[10px] text-purple-300/50 font-medium">Referência</span>
                       </div>
                     )}
                     {/* Library grid skeleton simulation on step 1 */}
                     {step === 1 && !refVisible && (
                       <div className="absolute inset-0 p-1.5 animate-fade-in">
                         <div className="grid grid-cols-3 gap-1 h-full">
                           {[0,1,2,3,4,5].map(n => (
                             <div key={n} className={cn(
                               'rounded bg-purple-700/40 border border-purple-500/20 flex items-center justify-center transition-all duration-300',
                               n === 4 ? 'border-fuchsia-500/60 bg-fuchsia-700/30 scale-105' : ''
                             )}>
                               <svg viewBox="0 0 24 24" className="w-4 h-4 fill-purple-400/40">
                                 <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                               </svg>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}
                     {/* Skeleton filled state */}
                     {refVisible && (
                       <div className={cn(
                         'absolute inset-0 flex flex-col transition-all duration-700',
                         refVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                       )}>
                         <div className="flex-1 flex items-center justify-center bg-purple-800/30">
                           <div className="relative flex flex-col items-center gap-1.5">
                             {/* Landscape/photo icon skeleton */}
                             <div className="w-12 h-9 rounded-lg bg-gradient-to-br from-purple-500/40 to-fuchsia-500/30 border border-fuchsia-400/30 flex items-center justify-center overflow-hidden">
                               {/* Simulated sky/ground */}
                               <div className="w-full h-1/2 bg-purple-600/30" />
                               <div className="absolute bottom-0 w-full h-1/2 bg-purple-800/30" />
                               <svg viewBox="0 0 24 24" className="absolute w-6 h-6 fill-fuchsia-300/50">
                                 <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                               </svg>
                             </div>
                             <div className="space-y-1">
                               <div className="h-1.5 w-14 rounded-full bg-purple-500/30 animate-pulse" />
                               <div className="h-1 w-8 mx-auto rounded-full bg-purple-500/20 animate-pulse" style={{ animationDelay: '200ms' }} />
                             </div>
                           </div>
                         </div>
                         <div className="bg-fuchsia-600/20 px-2 py-1 flex items-center gap-1">
                           <Check className="w-3 h-3 text-fuchsia-400" />
                           <span className="text-[9px] text-fuchsia-300 font-medium">Referência</span>
                         </div>
                       </div>
                     )}
                   </div>
                 </div>
              </div>

              {/* Aspect ratio selector */}
              <div className={cn(
                'bg-purple-900/20 border rounded-lg p-2.5 transition-all duration-300',
                step === 2
                  ? 'border-fuchsia-500/50 shadow-md shadow-fuchsia-500/10'
                  : 'border-purple-500/30',
              )}>
                <p className="text-[10px] font-semibold text-white/70 mb-2 flex items-center gap-1.5">
                  <RectangleVertical className="w-3 h-3 text-purple-400" />
                  Proporção
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { value: '9:16', label: 'Stories', icon: <Smartphone className="w-3 h-3" /> },
                    { value: '1:1', label: 'Quadrado', icon: <Square className="w-3 h-3" /> },
                    { value: '3:4', label: 'Feed Vert.', icon: <RectangleVertical className="w-3 h-3" /> },
                    { value: '16:9', label: 'Retangular', icon: <RectangleHorizontal className="w-3 h-3" /> },
                  ].map((opt) => (
                    <div
                      key={opt.value}
                      className={cn(
                        'flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-lg border text-center transition-all duration-300',
                        selectedRatio === opt.value
                          ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 border-fuchsia-500 text-white scale-105'
                          : 'bg-purple-900/30 border-purple-500/30 text-purple-300'
                      )}
                    >
                      <span className={selectedRatio === opt.value ? 'text-white' : 'text-purple-400'}>
                        {opt.icon}
                      </span>
                      <span className="text-[8px] font-medium leading-tight">{opt.label}</span>
                      <span className="text-[7px] opacity-70">{opt.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Creativity slider placeholder */}
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-semibold text-white/70 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-purple-400" />
                    Criatividade
                  </p>
                  <span className="text-[9px] text-fuchsia-400 font-bold">50%</span>
                </div>
                <div className="h-1.5 bg-purple-900/60 rounded-full overflow-hidden">
                  <div className="h-full w-1/2 bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full" />
                </div>
              </div>

              {/* Generate button */}
              <button
                className={cn(
                  'w-full py-3 rounded-xl font-bold text-sm text-white transition-all duration-200',
                  'bg-gradient-to-r from-fuchsia-600 to-purple-600 shadow-lg shadow-fuchsia-500/30',
                  step === 3 && buttonClicked ? 'scale-95 brightness-110' : 'scale-100',
                )}
              >
                <span className="flex items-center justify-center gap-2">
                  <Wand2 className="w-4 h-4" />
                  Gerar Imagem
                </span>
              </button>

              {/* Loading bar */}
              <div className={cn(
                'transition-all duration-500',
                step === 3 && buttonClicked ? 'opacity-100' : 'opacity-0'
              )}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-purple-300/70">Gerando sua imagem...</span>
                  <span className="text-[10px] text-fuchsia-400 font-bold">{Math.round(loadingProgress)}%</span>
                </div>
                <div className="h-1.5 bg-purple-900/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-fuchsia-500 to-purple-500 rounded-full transition-all duration-100 ease-linear"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Right panel - result */}
            <div className={cn(
              'transition-all duration-700 ease-in-out',
              showResult ? 'md:col-span-3' : 'md:col-span-2'
            )}>
              <div className={cn(
                'relative rounded-xl overflow-hidden border-2 transition-all duration-700',
                showResult
                  ? 'border-fuchsia-400/80 shadow-2xl opacity-100'
                  : 'border-purple-500/20 opacity-30'
              )}
                style={{
                  transform: showResult ? 'translateX(0) scale(1)' : 'translateX(12px) scale(0.97)',
                  transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  boxShadow: showResult
                    ? '0 0 40px 8px rgba(217,70,239,0.35), 0 0 80px 16px rgba(168,85,247,0.18)'
                    : undefined,
                }}
              >
                 <div className={cn(
                   'relative overflow-hidden bg-purple-900/30 transition-all duration-700',
                   showResult ? 'aspect-[4/3]' : 'aspect-square'
                 )}>
                   {/* Empty state */}
                   {!showResult && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                       <Sparkles className="w-8 h-8 text-purple-400/30" />
                       <span className="text-[10px] text-purple-300/30">Resultado</span>
                     </div>
                   )}
                   {/* Result skeleton — expanded highlight */}
                   {showResult && (
                     <div className="absolute inset-0 flex flex-col bg-gradient-to-br from-[#2a0a4a] via-[#1e0a3a] to-[#2a0a4a]">
                       {/* Animated glow bg */}
                       <div className="absolute inset-0 opacity-40">
                         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-fuchsia-500/30 blur-3xl animate-pulse" />
                         <div className="absolute top-1/4 left-1/4 w-24 h-24 rounded-full bg-purple-600/20 blur-2xl animate-pulse" style={{ animationDelay: '400ms' }} />
                       </div>
                       {/* Main content */}
                       <div className="flex-1 flex items-center justify-center relative z-10 p-4">
                         <div className="flex flex-col items-center gap-4 w-full">
                           {/* Large avatar skeleton */}
                           <div className="relative">
                             <div className="absolute -inset-3 rounded-full bg-fuchsia-500/20 blur-md animate-pulse" />
                             <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-fuchsia-400/70 to-purple-600/60 border-2 border-fuchsia-400/70 flex items-center justify-center shadow-2xl shadow-fuchsia-500/50">
                               <svg viewBox="0 0 24 24" className="w-11 h-11 fill-fuchsia-100/90">
                                 <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                               </svg>
                             </div>
                             <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-fuchsia-500 border-2 border-[#1e0a3a] flex items-center justify-center">
                               <Check className="w-3 h-3 text-white" />
                             </div>
                           </div>
                           {/* Skeleton body lines */}
                           <div className="space-y-2 flex flex-col items-center w-full max-w-[160px]">
                             <div className="h-2.5 w-full rounded-full bg-fuchsia-400/35 animate-pulse" />
                             <div className="h-2 w-4/5 rounded-full bg-purple-400/25 animate-pulse" style={{ animationDelay: '120ms' }} />
                             <div className="h-2 w-3/5 rounded-full bg-purple-400/20 animate-pulse" style={{ animationDelay: '240ms' }} />
                           </div>
                           {/* Stats row */}
                           <div className="flex gap-3 mt-1">
                             {[
                               { label: 'HD', icon: '🎨' },
                               { label: '1:1', icon: '⬛' },
                               { label: '~15s', icon: '⚡' },
                             ].map((stat) => (
                               <div key={stat.label} className="flex flex-col items-center gap-0.5 bg-white/5 border border-fuchsia-500/20 rounded-lg px-3 py-1.5">
                                 <span className="text-xs">{stat.icon}</span>
                                 <span className="text-[9px] text-fuchsia-300 font-bold">{stat.label}</span>
                               </div>
                             ))}
                           </div>
                         </div>
                       </div>
                       {/* Bottom bar */}
                       <div className="bg-black/40 backdrop-blur-sm px-3 py-2 flex items-center justify-between border-t border-fuchsia-500/20">
                         <div className="flex items-center gap-1.5">
                           <Sparkles className="w-3.5 h-3.5 text-fuchsia-400 animate-pulse" />
                           <span className="text-[10px] text-fuchsia-300 font-semibold">Imagem pronta!</span>
                         </div>
                         <div className="bg-fuchsia-500/80 rounded-lg px-2.5 py-1 flex items-center gap-1">
                           <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white"><path d="M5 20h14v-2H5v2zm7-18L5.33 9h3.84v4h5.66V9h3.84L12 2z"/></svg>
                           <span className="text-[9px] text-white font-bold">Baixar</span>
                         </div>
                       </div>
                       {/* Top badge */}
                       <div className="absolute top-2.5 right-2.5">
                         <div className="bg-fuchsia-500 rounded-full px-2.5 py-1 flex items-center gap-1 shadow-lg shadow-fuchsia-500/50 animate-pulse">
                           <Sparkles className="w-3 h-3 text-white" />
                           <span className="text-[10px] text-white font-bold">Pronto! ✓</span>
                         </div>
                       </div>
                       {/* Floating sparkles */}
                       {['✦','✦','✦','✦'].map((s, i) => (
                         <span
                           key={i}
                           className="absolute text-fuchsia-400 animate-pulse pointer-events-none"
                           style={{
                             fontSize: `${8 + i * 2}px`,
                             top: `${[15, 70, 25, 80][i]}%`,
                             left: `${[10, 85, 80, 12][i]}%`,
                             animationDelay: `${i * 200}ms`,
                           }}
                         >{s}</span>
                       ))}
                     </div>
                   )}
                 </div>
              </div>
              {/* Result label */}
              <div className={cn(
                'mt-2 text-center transition-all duration-500',
                showResult ? 'opacity-100' : 'opacity-0'
              )}>
                <span className="text-xs text-fuchsia-300/90 font-semibold">
                  ⚡ Gerado em ~15 segundos — sem prompt, sem complicação
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step caption */}
      <div className="mt-6 text-center min-h-[32px]">
        <p className={cn(
          'text-sm md:text-base font-medium transition-all duration-500',
          'text-white/70'
        )}>
          <span className="text-fuchsia-400 font-bold">Passo {step + 1} de 4</span>
          {' — '}
          <span>{stepLabels[step].emoji} {stepLabels[step].text}</span>
        </p>
        <div className="flex justify-center gap-1.5 mt-3">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={cn(
                'h-1 rounded-full transition-all duration-500',
                step === i ? 'w-8 bg-fuchsia-500' : 'w-4 bg-white/20'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClonerDemoAnimation;

