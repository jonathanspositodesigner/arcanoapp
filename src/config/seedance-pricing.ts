/**
 * Seedance 2.0 — Tabela de preços centralizada
 * 
 * Custo em créditos POR SEGUNDO de vídeo gerado.
 * Chave: `${speed}-${quality}-${generationType}`
 * 
 * generationType:
 *   "t2v" = Text-to-Video (modo "Só Prompt")
 *   "i2v" = Image-to-Video (modos "Start + End" e "Multi-ref")
 */

export type SeedanceSpeed = "standard" | "fast";
export type SeedanceQuality = "720p" | "480p";
export type SeedanceGenType = "t2v" | "i2v";

interface PricingEntry {
  speed: SeedanceSpeed;
  quality: SeedanceQuality;
  genType: SeedanceGenType;
  creditsPerSecond: number;
}

const PRICING_TABLE: PricingEntry[] = [
  // Fast - 480p
  { speed: "fast", quality: "480p", genType: "i2v", creditsPerSecond: 130 },
  { speed: "fast", quality: "480p", genType: "t2v", creditsPerSecond: 130 },
  // Fast - 720p
  { speed: "fast", quality: "720p", genType: "i2v", creditsPerSecond: 270 },
  { speed: "fast", quality: "720p", genType: "t2v", creditsPerSecond: 280 },
  // Standard - 480p
  { speed: "standard", quality: "480p", genType: "i2v", creditsPerSecond: 160 },
  { speed: "standard", quality: "480p", genType: "t2v", creditsPerSecond: 170 },
  // Standard - 720p
  { speed: "standard", quality: "720p", genType: "i2v", creditsPerSecond: 300 },
  { speed: "standard", quality: "720p", genType: "t2v", creditsPerSecond: 350 },
];

const priceMap = new Map<string, number>();
for (const entry of PRICING_TABLE) {
  priceMap.set(`${entry.speed}-${entry.quality}-${entry.genType}`, entry.creditsPerSecond);
}

/**
 * Retorna o custo por segundo (créditos) para a combinação informada.
 * Fallback: 300 cr/s caso a combinação não exista.
 */
export function getSeedanceCostPerSecond(
  speed: SeedanceSpeed,
  quality: SeedanceQuality,
  genType: SeedanceGenType,
): number {
  return priceMap.get(`${speed}-${quality}-${genType}`) ?? 300;
}

/**
 * Calcula o custo total = custo_por_segundo × duração.
 */
export function getSeedanceTotalCost(
  speed: SeedanceSpeed,
  quality: SeedanceQuality,
  genType: SeedanceGenType,
  durationSeconds: number,
): number {
  return getSeedanceCostPerSecond(speed, quality, genType) * durationSeconds;
}

/**
 * Converte o "mode" do componente para o genType de pricing.
 * "text" → "t2v", qualquer outro → "i2v"
 */
export function modeToGenType(mode: string): SeedanceGenType {
  return mode === "text" ? "t2v" : "i2v";
}
