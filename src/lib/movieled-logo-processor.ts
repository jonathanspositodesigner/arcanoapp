/**
 * MovieLed Maker — Logo Processor
 *
 * Detecta automaticamente se uma logo tem fundo transparente.
 * Se tiver, aplica fundo verde chroma key (#00B140 — padrão da indústria de cinema/TV)
 * antes de enviar pra RunningHub. Os modelos Kling/Wan tratam o verde como
 * um telão de LED real exibindo a logo, eliminando halos brancos/pretos nas bordas.
 *
 * 100% client-side via Canvas API. Zero custo de edge function.
 */

const CHROMA_GREEN = '#00B140'; // Verde chroma key padrão da indústria
const TRANSPARENCY_THRESHOLD = 0.03; // 3% dos pixels com alpha < 250 = logo sem fundo
const ALPHA_PIXEL_CUTOFF = 250; // Pixels considerados "transparentes" se alpha < 250

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error('Falha ao carregar imagem da logo'));
    };
    img.src = url;
  });
}

/**
 * Detecta se a imagem tem fundo transparente significativo.
 * Retorna true se mais de 3% dos pixels tiverem alpha < 250.
 */
export async function detectTransparency(file: File): Promise<boolean> {
  // JPG/JPEG nunca tem alpha channel — short-circuit
  if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
    return false;
  }

  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  // Para detecção, usamos uma versão reduzida (max 512px) — performance
  const maxDim = 512;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const totalPixels = data.length / 4;

  let transparentCount = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < ALPHA_PIXEL_CUTOFF) transparentCount++;
  }

  const ratio = transparentCount / totalPixels;
  return ratio > TRANSPARENCY_THRESHOLD;
}

/**
 * Aplica fundo verde chroma key (#00B140) por trás da logo.
 * Preserva dimensões originais e anti-aliasing das bordas.
 * Exporta como JPEG 95 (fundo opaco, menor que PNG).
 */
export async function applyChromaKey(file: File): Promise<File> {
  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível para aplicar chroma key');

  // 1) Pinta o fundo verde
  ctx.fillStyle = CHROMA_GREEN;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2) Desenha a logo por cima (alpha channel preservado naturalmente pelo canvas)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Falha ao exportar canvas'))),
      'image/jpeg',
      0.95
    );
  });

  const baseName = (file.name || 'logo').replace(/\.[^.]+$/, '');
  return new File([blob], `${baseName}-chroma.jpg`, { type: 'image/jpeg' });
}

/**
 * Orquestra: detecta transparência → aplica chroma se necessário.
 * Retorna o File final pronto para upload + flag indicando se foi processado.
 */
export async function processLogoForUpload(
  file: File
): Promise<{ file: File; hadTransparency: boolean }> {
  const hadTransparency = await detectTransparency(file);
  if (!hadTransparency) {
    return { file, hadTransparency: false };
  }
  const processed = await applyChromaKey(file);
  return { file: processed, hadTransparency: true };
}