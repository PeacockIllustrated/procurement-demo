/**
 * Colour manipulation utilities for the demo brand system.
 * Converts hex colours and derives light/dark variants.
 */

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Mix a colour toward white by `amount` (0–1). */
export function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount,
  );
}

/** Mix a colour toward black by `amount` (0–1). */
export function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

/** Derive the full brand colour palette from two user-chosen colours. */
export function derivePalette(primary: string, dark: string) {
  return {
    primary,
    primaryLight: lighten(primary, 0.1),
    primaryDark: darken(primary, 0.15),
    navy: dark,
    navyLight: lighten(dark, 0.1),
  };
}
