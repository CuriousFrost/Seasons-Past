import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ManaColor } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Join a color identity array into a compact string, e.g. ["U","B"] → "UB". Empty → "C". */
export function buildColorString(colors: ManaColor[]): string {
  return colors.length === 0 ? "C" : colors.join("");
}
