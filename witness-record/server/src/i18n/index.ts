import { en, type Dictionary } from "./en.js";
import { es } from "./es.js";

export type { Dictionary } from "./en.js";
export const dictionaries: Record<"en" | "es", Dictionary> = { en, es };
export const PRIVACY_NOTICE_VERSION = "2026-10-30.1";

export function dict(lang: string | null | undefined): Dictionary {
  return lang === "es" ? es : en;
}
