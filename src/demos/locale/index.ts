import type { Locale } from "./types.js";
import { en } from "./en.js";
import { jp } from "./jp.js";
import { vn } from "./vn.js";

function resolveLocale(): Locale {
  if (process.argv.includes("--jp")) return jp;
  if (process.argv.includes("--vn")) return vn;
  return en;
}

export const locale: Locale = resolveLocale();
