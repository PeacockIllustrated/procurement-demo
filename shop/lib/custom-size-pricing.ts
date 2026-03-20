// shop/lib/custom-size-pricing.ts
import type { Product, Category, Variant } from "./catalog";

export const MIN_CUSTOM_SIZE_MM = 1;
export const MAX_CUSTOM_SIZE_MM = 5000;

interface ParsedSize {
  width: number;
  height: number;
}

export interface CustomSizeRequest {
  widthMm: number;
  heightMm: number;
  product: Product;
  category: Category;
}

export interface CustomSizeResult {
  material: string;
  matchedVariant: {
    code: string;
    size: string;
    price: number;
  } | null;
  matchedFromProduct: string | null;
  requiresQuote: boolean;
}

export interface CustomSizeData {
  type: "custom_size";
  requestedWidth: number;
  requestedHeight: number;
  matchedVariantCode: string | null;
  matchedSize: string | null;
  matchedFromProduct: string | null;
  requiresQuote: boolean;
}

/**
 * Parse a size string like "400x600mm" into { width, height }.
 * Returns null if the string is not parseable.
 */
export function parseSize(size: string | null): ParsedSize | null {
  if (!size) return null;
  const match = size.match(/^(\d+)\s*x\s*(\d+)\s*mm$/i);
  if (!match) return null;
  return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
}

/**
 * Check if a variant's parsed size can fit the requested dimensions.
 * Checks both orientations (the sign can be rotated).
 */
function fitsRequest(
  variantSize: ParsedSize,
  reqWidth: number,
  reqHeight: number
): boolean {
  const normalFit =
    variantSize.width >= reqWidth && variantSize.height >= reqHeight;
  const rotatedFit =
    variantSize.height >= reqWidth && variantSize.width >= reqHeight;
  return normalFit || rotatedFit;
}

/**
 * Return the display size string for a variant, rotating if needed
 * so the user sees dimensions in the orientation that fits their request.
 */
function displaySize(
  parsed: ParsedSize,
  reqWidth: number,
  reqHeight: number
): string {
  const normalFit =
    parsed.width >= reqWidth && parsed.height >= reqHeight;
  if (normalFit) {
    return `${parsed.width}x${parsed.height}mm`;
  }
  // Rotated fit
  return `${parsed.height}x${parsed.width}mm`;
}

/**
 * Find the best matching variant from a list of candidates.
 * Picks the one with the lowest price; breaks ties by smallest area.
 */
function findBestMatch(
  candidates: { variant: Variant; parsed: ParsedSize; fromProduct: string | null }[],
  reqWidth: number,
  reqHeight: number
): { variant: Variant; fromProduct: string | null; displaySize: string } | null {
  const fitting = candidates.filter((c) =>
    fitsRequest(c.parsed, reqWidth, reqHeight)
  );
  if (fitting.length === 0) return null;

  fitting.sort((a, b) => {
    if (a.variant.price !== b.variant.price) {
      return a.variant.price - b.variant.price;
    }
    const areaA = a.parsed.width * a.parsed.height;
    const areaB = b.parsed.width * b.parsed.height;
    return areaA - areaB;
  });

  return {
    variant: fitting[0].variant,
    fromProduct: fitting[0].fromProduct,
    displaySize: displaySize(fitting[0].parsed, reqWidth, reqHeight),
  };
}

/**
 * Calculate custom size pricing for a product.
 * Returns one result per material the product offers.
 *
 * Pricing waterfall:
 * 1. Same product, same material — cheapest fitting variant
 * 2. Same category, same material — cheapest fitting variant from sibling products
 * 3. No match — requiresQuote: true
 */
export function calculateCustomSizePricing(
  request: CustomSizeRequest
): CustomSizeResult[] {
  const { widthMm, heightMm, product, category } = request;

  // Collect all sized variants from the product, grouped by material
  const productVariantsByMaterial = new Map<
    string,
    { variant: Variant; parsed: ParsedSize }[]
  >();

  for (const v of product.variants) {
    if (!v.material) continue;
    const parsed = parseSize(v.size);
    if (!parsed) continue;
    const list = productVariantsByMaterial.get(v.material) || [];
    list.push({ variant: v, parsed });
    productVariantsByMaterial.set(v.material, list);
  }

  // If this product has no sized variants at all, return empty
  if (productVariantsByMaterial.size === 0) return [];

  // Collect category sibling variants by material (excluding this product)
  const categoryVariantsByMaterial = new Map<
    string,
    { variant: Variant; parsed: ParsedSize; fromProduct: string }[]
  >();

  for (const p of category.products) {
    if (p.baseCode === product.baseCode) continue;
    for (const v of p.variants) {
      if (!v.material) continue;
      const parsed = parseSize(v.size);
      if (!parsed) continue;
      const list = categoryVariantsByMaterial.get(v.material) || [];
      list.push({ variant: v, parsed, fromProduct: p.baseCode });
      categoryVariantsByMaterial.set(v.material, list);
    }
  }

  const results: CustomSizeResult[] = [];

  for (const [material, ownVariants] of productVariantsByMaterial) {
    // Step 1: Try own product variants
    const ownCandidates = ownVariants.map((v) => ({
      ...v,
      fromProduct: null as string | null,
    }));
    const ownMatch = findBestMatch(ownCandidates, widthMm, heightMm);

    if (ownMatch) {
      results.push({
        material,
        matchedVariant: {
          code: ownMatch.variant.code,
          size: ownMatch.displaySize,
          price: ownMatch.variant.price,
        },
        matchedFromProduct: null,
        requiresQuote: false,
      });
      continue;
    }

    // Step 2: Try category sibling variants of same material
    const siblingVariants = categoryVariantsByMaterial.get(material);
    if (siblingVariants) {
      const siblingMatch = findBestMatch(siblingVariants, widthMm, heightMm);
      if (siblingMatch) {
        results.push({
          material,
          matchedVariant: {
            code: siblingMatch.variant.code,
            size: siblingMatch.displaySize,
            price: siblingMatch.variant.price,
          },
          matchedFromProduct: siblingMatch.fromProduct,
          requiresQuote: false,
        });
        continue;
      }
    }

    // Step 3: No match — requires manual quote
    results.push({
      material,
      matchedVariant: null,
      matchedFromProduct: null,
      requiresQuote: true,
    });
  }

  return results;
}

/**
 * Check if a product has any variants with parseable dimensions.
 * Used to determine whether to show the custom size section.
 */
export function productHasSizedVariants(product: Product): boolean {
  return product.variants.some(
    (v) => v.material !== null && parseSize(v.size) !== null
  );
}
