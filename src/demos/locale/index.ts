import type { Locale } from "./types.js";
import { en } from "./en.js";
import { jp } from "./jp.js";

const isJp = process.argv.includes("--jp");

export const locale: Locale = isJp ? jp : en;
