import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Stroke width default pentru lucide-react. iOS preferă 1.75 — mai elegant
 * decât default-ul 2 al lui lucide.
 */
export const ICON_STROKE = 1.75
