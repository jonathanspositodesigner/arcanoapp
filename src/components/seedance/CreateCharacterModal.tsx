import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Loader2, CheckCircle, X, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { optimizeForAI } from '@/hooks/useImageOptimizer';
import { uploadToStorage, createJob, startJob } from '@/ai/JobManager';
import { useJobStatusSync } from '@/hooks/useJobStatusSync';
import { useCredits } from '@/contexts/CreditsContext';
import { useAIToolSettings } from '@/hooks/useAIToolSettings';

import charGood from '@/assets/char-example-good.jpg';
import charBadSide from '@/assets/char-bad-side.jpg';
import charBadDark from '@/assets/char-bad-dark.jpg';
import charBadFar from '@/assets/char-bad-far.jpg';
import charBadBlurry from '@/assets/char-bad-blurry.jpg';
import charBadSunglasses from '@/assets/char-bad-sunglasses.jpg';
import charBadCropped from '@/assets/char-bad-cropped.jpg';

const CHARACTER_PROMPT = `Take @material[image1] and ONLY cut it into exactly 4 sharp rectangular fragments of different sizes. DO NOT alter, modify, regenerate, redraw or change ANY physical characteristic of the person in the photo — same skin tone, same face shape, same hair, same lighting, same expression, same exact pixels from the original image. This is a CROP AND REARRANGE operation only. No AI face generation. No enhancement. No style transfer. Preserve original photo exactly.

THE 4 FRAGMENTS MUST BE:
1. Top of head and hair only — no face visible
2. Eyes zone — both eyes area cropped horizontally
3. Nose and cheeks zone — mid face horizontal strip
4. Mouth and chin zone — lower face horizontal strip

Place all 4 fragments on pure black #000000 background, deliberately misaligned and out of anatomical order:
- Fragment 1 placed at bottom of frame
- Fragment 2 placed at top right, rotated +6 degrees
- Fragment 3 placed at left center, rotated -5 degrees
- Fragment 4 placed at top left, rotated +3 degrees
- No fragment near its anatomically correct position
- Sharp clean edges on every fragment, no blending, no feathering
- Random gaps between all fragments

CENSORSHIP: On the eyes fragment, place a solid white horizontal rectangle bar covering ONLY the iris and pupil of each eye. Bar is sharp, 100% opaque white. Does NOT cover eyebrows or eyelids.

STRICT RULE: Every fragment must look exactly like a piece cut from the original photo. No repainting. No redrawing. No face swap. No style change. Cut only. Rearrange only.

Pure black background only. Editorial dark portrait collage.
Negative prompt:
generated face, new face, different person, altered skin, redrawn features, AI face, smooth skin filter, beauty filter, different lighting, changed hair, modified features, illustrated, painting, drawing, colorful background, blur, soft edges, more than 4 fragments, 5 fragments, 6 fragments`;

const BAD_EXAMPLES = [
  { img: charBadSide, label: 'De lado' },
  { img: charBadDark, label: 'Mal iluminada' },
  { img: charBadFar, label: 'De longe' },
  { img: charBadBlurry, label: 'Desfocada' },
  { img: charBadSunglasses, label: 'Com óculos' },
  { img: charBadCropped, label: 'Rosto cortado' },
];

type Step = 'upload' | 'generating' | 'done';

interface CreateCharacterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onCharacterCreated: () => void;
  currentCount: number;
}

const CreateCharacterModal: React.FC<CreateCharacterModalProps> = ({
  open,
  onOpenChange,
  userId,
  onCharacterCreated,
  currentCount,
}) => {
  const [step, setStep] = useState<Step>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [characterName, setCharacterName] = useState('');
  const [saving, setSaving] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [thumbnailStorageUrl, setThumbnailStorageUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef(crypto.randomUUID());
  
  const { checkBalance, refetch: refetchCredits } = useCredits();
  const { getCreditCost } = useAIToolSettings();
  const creditCost = getCreditCost('gerar_imagem', 100);

  // Poll job status
  useJobStatusSync({
    jobId,
    toolType: 'image_generator',
    enabled: step === 'generating' && !!jobId,
    onStatusChange: (update) => {
      if (update.currentStep) {
        const stepProgress: Record<string, number> = {
          'validating': 20, 'downloading_ref_image_1': 30, 'uploading_ref_image_1': 40,
          'consuming_credits': 50, 'delegating_to_queue': 60, 'starting': 70, 'running': 80,
        };
        setProgress(stepProgress[update.currentStep] || progress);
      }
      if (update.status === 'completed' && update.outputUrl) {
        setGeneratedImageUrl(update.outputUrl);
        setProgress(100);
        setStep('done');
        refetchCredits();
      } else if (update.status === 'failed') {
        setErrorMsg(update.errorMessage || 'Erro ao gerar personagem');
        setStep('upload');
        setJobId(null);
        refetchCredits();
        toast.error('Falha ao gerar personagem. Tente novamente.');
      }
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Envie apenas imagens');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx 10MB)');
      return;
    }
    if (uploadedPreview) URL.revokeObjectURL(uploadedPreview);
    setUploadedFile(file);
    setUploadedPreview(URL.createObjectURL(file));
    setErrorMsg(null);
  };

  const handleGenerate = async () => {
    if (!uploadedFile || !userId) return;
    if (currentCount >= 20) {
      toast.error('Limite de 20 personagens atingido');
      return;
    }

    // Check credits
    const balance = await checkBalance();
    if (balance < creditCost) {
      toast.error('Créditos insuficientes para gerar personagem');
      return;
    }

    setStep('generating');
    setProgress(5);
    setErrorMsg(null);

    try {
      // 1. Optimize and upload the user's photo
      toast.info('Otimizando imagem...');
      const optimized = await optimizeForAI(uploadedFile);
      const uploadResult = await uploadToStorage(optimized.file, 'image-generator', userId);
      if (!uploadResult.url) throw new Error('Falha ao enviar imagem');
      setProgress(15);

      // Also upload thumbnail (original photo) to saved-avatars for permanent storage
      const thumbExt = uploadedFile.type === 'image/webp' ? 'webp' : 'png';
      const thumbPath = `${userId}/thumb_${crypto.randomUUID()}.${thumbExt}`;
      const { error: thumbUploadError } = await supabase.storage
        .from('saved-avatars')
        .upload(thumbPath, optimized.file, { contentType: optimized.file.type, upsert: false });
      
      if (thumbUploadError) throw new Error('Falha ao salvar thumbnail');
      
      const { data: thumbUrlData } = supabase.storage.from('saved-avatars').getPublicUrl(thumbPath);
      setThumbnailStorageUrl(thumbUrlData.publicUrl);

      // 2. Create job using Nano Banana engine
      const { jobId: newJobId, error: createError } = await createJob('image_generator', userId, sessionIdRef.current, {
        prompt: CHARACTER_PROMPT,
        aspect_ratio: '1:1',
        model: 'runninghub',
        engine: 'nano_banana',
        input_urls: [uploadResult.url],
      });

      if (createError || !newJobId) throw new Error(createError || 'Falha ao criar job');

      setJobId(newJobId);
      setProgress(25);

      // 3. Start job
      const result = await startJob('image_generator', newJobId, {
        referenceImageUrls: [uploadResult.url],
        aspectRatio: '1:1',
        creditCost,
        prompt: CHARACTER_PROMPT,
      });

      if (!result.success) {
        throw new Error(result.error || 'Erro ao iniciar geração');
      }

      if (result.queued) {
        setProgress(30);
      }

      // useJobStatusSync handles the rest
    } catch (err: any) {
      console.error('[CreateCharacter] Error:', err);
      setErrorMsg(err.message || 'Erro ao gerar personagem');
      setStep('upload');
      setJobId(null);
      toast.error(err.message || 'Erro ao gerar personagem');
    }
  };

  const handleSave = async () => {
    if (!characterName.trim()) {
      toast.error('Digite um nome para o personagem');
      return;
    }
    if (!gender) {
      toast.error('Selecione o sexo do personagem');
      return;
    }
    if (!generatedImageUrl || !thumbnailStorageUrl) return;

    setSaving(true);
    try {
      // Upload the generated image to permanent storage
      const response = await fetch(generatedImageUrl);
      if (!response.ok) throw new Error('Falha ao baixar imagem gerada');
      const blob = await response.blob();
      const refPath = `${userId}/ref_${crypto.randomUUID()}.png`;
      
      const { error: refUploadError } = await supabase.storage
        .from('saved-avatars')
        .upload(refPath, blob, { contentType: 'image/png', upsert: false });
      
      if (refUploadError) throw refUploadError;
      
      const { data: refUrlData } = supabase.storage.from('saved-avatars').getPublicUrl(refPath);

      const { error } = await supabase
        .from('saved_characters' as any)
        .insert({
          user_id: userId,
          name: characterName.trim(),
          image_url: thumbnailStorageUrl,
          thumbnail_url: thumbnailStorageUrl,
          reference_image_url: refUrlData.publicUrl,
          gender,
          job_id: jobId,
        });

      if (error) throw error;

      toast.success('Personagem salvo com sucesso!');
      onCharacterCreated();
      resetAndClose();
    } catch (err: any) {
      console.error('[CreateCharacter] Save error:', err);
      toast.error('Erro ao salvar personagem');
    } finally {
      setSaving(false);
    }
  };

  const resetAndClose = () => {
    if (uploadedPreview) URL.revokeObjectURL(uploadedPreview);
    setStep('upload');
    setUploadedFile(null);
    setUploadedPreview('');
    setProgress(0);
    setCharacterName('');
    setGeneratedImageUrl(null);
    setThumbnailStorageUrl(null);
    setJobId(null);
    setErrorMsg(null);
    setGender(null);
    sessionIdRef.current = crypto.randomUUID();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && step !== 'generating') resetAndClose(); }}>
      <DialogContent className="bg-[#141420] border-white/[0.08] max-w-[540px] w-[95vw] max-h-[90vh] overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle className="text-gray-200 text-sm">
            ✨ Criar Personagem ({currentCount}/20)
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4 pt-2">
            {/* Good example */}
            <div className="space-y-2">
              <p className="text-[11px] text-gray-300 font-medium">📸 Envie uma foto clara do rosto</p>
              <div className="flex items-start gap-3">
                <div className="w-28 h-28 rounded-lg overflow-hidden border-2 border-green-500/50 flex-shrink-0">
                  <img src={charGood} alt="Exemplo correto" className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="text-[10px] text-gray-400 space-y-1">
                  <p className="text-green-400 font-medium">✅ Foto ideal:</p>
                  <p>• Rosto de frente, bem centralizado</p>
                  <p>• Boa iluminação</p>
                  <p>• Foco nítido</p>
                  <p>• Sem acessórios cobrindo o rosto</p>
                </div>
              </div>
            </div>

            {/* Bad examples */}
            <div className="space-y-2">
              <p className="text-[10px] text-red-400 font-medium">❌ NÃO envie fotos assim:</p>
              <div className="grid grid-cols-6 gap-1.5">
                {BAD_EXAMPLES.map((ex) => (
                  <div key={ex.label} className="text-center">
                    <div className="aspect-square rounded-lg overflow-hidden border border-red-500/30">
                      <img src={ex.img} alt={ex.label} className="w-full h-full object-cover opacity-80" loading="lazy" />
                    </div>
                    <p className="text-[9px] text-red-400/80 mt-1">{ex.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload area */}
            <div
              onClick={() => fileRef.current?.click()}
              className={`w-full aspect-[4/3] rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
                uploadedPreview 
                  ? 'border-slate-500/50 bg-white/50/5'
                  : 'border-white/10 bg-black/20 hover:border-white/20'
              }`}
            >
              {uploadedPreview ? (
                <div className="relative w-full h-full">
                  <img src={uploadedPreview} alt="Sua foto" className="w-full h-full object-contain" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      URL.revokeObjectURL(uploadedPreview);
                      setUploadedFile(null);
                      setUploadedPreview('');
                    }}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/60 hover:bg-black/80"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-gray-400 mb-2" />
                  <span className="text-[11px] text-gray-500">Clique para enviar sua foto</span>
                  <span className="text-[9px] text-gray-400 mt-1">JPG, PNG ou WebP • Máx 10MB</span>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

            {errorMsg && (
              <div className="flex items-center gap-2 text-[11px] text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {errorMsg}
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={!uploadedFile || currentCount >= 20}
              className="w-full bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-500 hover:to-slate-400 text-white text-[12px]"
            >
              <span className="mr-1">✦</span>
              Gerar Personagem
              <span className="ml-2 text-[10px] opacity-80">({creditCost} créditos)</span>
            </Button>
          </div>
        )}

        {step === 'generating' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 rounded-full border-4 border-white/5" />
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="44" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-400/30" />
                <circle
                  cx="48" cy="48" r="44" fill="none" stroke="currentColor" strokeWidth="4"
                  className="text-slate-400 transition-all duration-500"
                  strokeDasharray={`${2 * Math.PI * 44}`}
                  strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white">{progress}%</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-300 font-medium">Gerando personagem...</p>
              <p className="text-[10px] text-gray-500 mt-1">Isso pode levar até 2 minutos</p>
            </div>
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Personagem gerado!</span>
            </div>

            <div className="flex gap-3 justify-center">
              {thumbnailStorageUrl && (
                <div className="text-center">
                  <div className="w-24 h-24 rounded-lg overflow-hidden border border-white/10">
                    <img src={thumbnailStorageUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-[9px] text-gray-500 mt-1">Thumbnail</p>
                </div>
              )}
              {generatedImageUrl && (
                <div className="text-center">
                  <div className="w-24 h-24 rounded-lg overflow-hidden border border-white/10">
                    <img src={generatedImageUrl} alt="Referência" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-[9px] text-gray-500 mt-1">Referência IA</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-gray-400 font-medium">Nome do personagem</label>
              <Input
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="Ex: Meu Avatar Principal"
                className="bg-black/20 border-white/[0.08] text-gray-300 text-[12px]"
                maxLength={50}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-gray-400 font-medium">Sexo do personagem</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setGender('male')}
                  className={`flex-1 py-2 rounded-lg text-[12px] font-medium transition-all border ${
                    gender === 'male'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                      : 'bg-black/20 border-white/[0.08] text-gray-400 hover:border-white/20'
                  }`}
                >
                  ♂ Masculino
                </button>
                <button
                  onClick={() => setGender('female')}
                  className={`flex-1 py-2 rounded-lg text-[12px] font-medium transition-all border ${
                    gender === 'female'
                      ? 'bg-pink-600/20 border-pink-500 text-pink-400'
                      : 'bg-black/20 border-white/[0.08] text-gray-400 hover:border-white/20'
                  }`}
                >
                  ♀ Feminino
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAndClose}
                className="flex-1 text-gray-400 text-[11px]"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!characterName.trim() || !gender || saving}
                className="flex-1 bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-500 hover:to-slate-400 text-white text-[11px]"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Salvar Personagem
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateCharacterModal;
