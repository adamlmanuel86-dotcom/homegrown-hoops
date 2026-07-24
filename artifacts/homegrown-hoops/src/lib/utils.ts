import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function opponentAbbr(name: string): string {
  const initials = name.split(/\s+/).map((w) => w[0] ?? "").join("").toUpperCase();
  return (initials || name.slice(0, 2).toUpperCase()).slice(0, 3);
}
