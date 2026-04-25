/**
 * Helper para converter uma URL pública (output_url de criação) em File,
 * usado para prefill dos inputs das ferramentas de IA a partir de
 * "Minhas Criações". Tenta direto e cai pro download-proxy em caso de CORS.
 */
export async function urlToFile(
  url: string,
  filename?: string
): Promise<File> {
  const fetchAsBlob = async (u: string): Promise<Blob> => {
    const res = await fetch(u, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.blob();
  };

  let blob: Blob;
  try {
    blob = await fetchAsBlob(url);
  } catch (err) {
    // Fallback via download-proxy
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) throw err;
    const proxied = `${supabaseUrl}/functions/v1/download-proxy?url=${encodeURIComponent(url)}`;
    blob = await fetchAsBlob(proxied);
  }

  // Inferir extensão do mime
  const mime = blob.type || 'application/octet-stream';
  let ext = 'bin';
  if (mime.includes('png')) ext = 'png';
  else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
  else if (mime.includes('webp')) ext = 'webp';
  else if (mime.includes('mp4')) ext = 'mp4';
  else if (mime.includes('webm')) ext = 'webm';
  else if (mime.includes('quicktime')) ext = 'mov';

  const name =
    filename ||
    `creation-${Date.now()}.${ext}`;

  return new File([blob], name, { type: mime || `image/${ext}` });
}