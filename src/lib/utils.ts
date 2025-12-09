import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a pack name to a slug format
 * Examples:
 * - "Pack Arcano Vol.1" -> "pack-arcano-vol-1"
 * - "Pack de Halloween" -> "pack-de-halloween"
 * - "+2200 Fontes para Eventos" -> "2200-fontes-para-eventos"
 */
export function toPackSlug(packName: string | null | undefined): string {
  if (!packName) return '';
  return packName
    .toLowerCase()
    .replace(/\s+/g, '-')     // spaces to hyphens
    .replace(/\./g, '-')      // periods to hyphens
    .replace(/\+/g, '')       // remove plus signs
    .replace(/-+/g, '-')      // collapse multiple hyphens
    .replace(/^-|-$/g, '');   // trim leading/trailing hyphens
}
