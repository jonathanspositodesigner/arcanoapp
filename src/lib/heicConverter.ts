/**
 * HEIC/HEIF converter for iPhone photos.
 * Browsers cannot natively decode HEIC, so we convert to JPEG before any
 * processing (preview, dimension reading, compression, upload).
 */

// File extensions accepted by inputs across the app (use in `accept` attribute)
export const IMAGE_ACCEPT =
  'image/*,image/heic,image/heif,.heic,.heif';

const HEIC_MIME_TYPES = new Set(['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence']);

export const isHeicFile = (file: File): boolean => {
  if (HEIC_MIME_TYPES.has(file.type.toLowerCase())) return true;
  const name = file.name.toLowerCase();
  return name.endsWith('.heic') || name.endsWith('.heif');
};

/**
 * Returns true if the file is an image OR a HEIC/HEIF (which often comes
 * with empty `file.type` on Windows/Chrome).
 */
export const isAcceptedImage = (file: File): boolean => {
  if (file.type.startsWith('image/')) return true;
  return isHeicFile(file);
};

/**
 * Converts HEIC/HEIF to JPEG. If the file is not HEIC, returns it unchanged.
 * Lazy-loads heic2any to avoid bloating the main bundle.
 */
export const ensureBrowserCompatibleImage = async (file: File): Promise<File> => {
  if (!isHeicFile(file)) return file;

  try {
    const { default: heic2any } = await import('heic2any');
    const blob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.92,
    });
    const out = Array.isArray(blob) ? blob[0] : blob;
    const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    return new File([out], newName, { type: 'image/jpeg', lastModified: Date.now() });
  } catch (err) {
    console.error('[heicConverter] Falha ao converter HEIC:', err);
    throw new Error('Não foi possível converter a foto HEIC do iPhone. Tente exportar como JPG.');
  }
};
