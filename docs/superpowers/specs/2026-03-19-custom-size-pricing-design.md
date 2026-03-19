# Custom Size Pricing — Design Spec

**Date:** 2026-03-19
**Status:** Approved

## Problem

Users sometimes need signs in non-standard sizes. Currently they must pick from fixed variant sizes or use the custom sign builder (which is quote-only at £0). We need a way to let users enter arbitrary dimensions for existing catalog products and receive an automated price based on the nearest fitting standard size.

## Requirements

- User enters custom width × height (mm) on the product detail page
- System finds the smallest standard variant where both dimensions fit the requested size (round up, never down)
- Material matching is strict — 4mm Correx and 10mm Correx are distinct
- Dimensions are orientation-independent (350×500 can match a 400×600 variant)
- Results shown grouped by material with price and matched size
- Available on any product with at least one variant with parseable `WxHmm` size
- No new database tables or columns — uses existing `custom_data` JSONB on `psp_order_items`
- No email template changes — items flow through as normal line items
- Webhook unchanged — `hasCustomItems` flag already handles items with `custom_data`

## Pricing Waterfall

1. **Same product, same material** — find the cheapest variant of that material where `variantWidth >= requestedWidth AND variantHeight >= requestedHeight` (checking both orientations)
2. **Same category, same material** — if no match within the product, search sibling products in the same category for the cheapest fitting variant of that material
3. **No match** — flag as "requires manual quote" (`requiresQuote: true`, price = £0)

## Architecture

### 1. Pricing Engine — `shop/lib/custom-size-pricing.ts`

Pure utility function, no UI concerns.

**Input:**
```ts
interface CustomSizeRequest {
  widthMm: number;
  heightMm: number;
  product: Product;
  category: Category;
}
```

**Constants:**
```ts
export const MIN_CUSTOM_SIZE_MM = 1;
export const MAX_CUSTOM_SIZE_MM = 5000;
```

**Output:**
```ts
interface CustomSizeResult {
  material: string;
  matchedVariant: {
    code: string;
    size: string;
    price: number;
  } | null;
  matchedFromProduct: string | null; // baseCode if cross-product, null if same product
  requiresQuote: boolean;
}
```

**Logic:**
- Parse `"400x600mm"` strings into `{ width, height }` — variants with `size: null` or `material: null` excluded
- For each distinct material in the product's variants (excluding `null` materials):
  - Find all same-material variants (own product first, then category siblings)
  - Check both orientations: `(w >= reqW && h >= reqH)` and `(h >= reqW && w >= reqH)`
  - Among fitting variants, pick the one with the lowest price (break ties by smallest area)
  - If own-product match found, use it; otherwise use category match; otherwise `requiresQuote: true`

### 2. Product Page UI

**Location:** Below the variant cards grid on `shop/app/(shop)/product/[code]/page.tsx`.

**Implementation:** The custom size section is a **new client component** (`shop/components/CustomSizeSection.tsx`), imported into the server-rendered product page — following the same pattern as `AddToBasketButton`. It includes its own add-to-basket logic (does not reuse `AddToBasketButton`).

**Behaviour:**
- Only rendered on products with ≥1 variant with parseable dimensions
- Collapsed by default — "Need a custom size?" header with chevron toggle
- When expanded:
  - Two number inputs: Width (mm) and Height (mm)
  - Validation: 1–5000mm, whole numbers only
  - Debounced calculation as user types
  - Results listed per material:
    - Material name, matched price, "priced as 400×600mm"
    - If cross-product: "(based on PCF29)" note
    - If no match: "This size requires a manual quote" in amber
    - Add to Basket button + quantity selector per result line

### 3. Basket Item Shape

Custom-sized items use the existing `BasketItem` interface with these values:

```ts
{
  code: `${variant.code}-cs${Date.now()}`,  // unique to prevent merging
  baseCode: product.baseCode,
  name: product.name,
  size: "Custom: 350×500mm",               // display string
  material: "4mm Correx",
  description: variant.description,
  price: matchedVariant.price,              // or 0 if requiresQuote
  quantity: n,
  image: product.image,
  customSizeData: {
    type: "custom_size",
    requestedWidth: 350,
    requestedHeight: 500,
    matchedVariantCode: "PCF29/M",
    matchedSize: "400x600mm",
    matchedFromProduct: null,               // or "PCF29" if cross-product
    requiresQuote: false
  }
}
```

### 4. Order API — `shop/app/api/orders/route.ts`

- Accept `customSizeData` on incoming items (alongside existing `customSign` and `customFieldValues`)
- Add third branch to the `custom_data` construction: `if (item.customSizeData) { custom_data = { type: "custom_size", ... } }`
- Refactor the `isCustomSign` validation boolean into a general `isQuoteItem` check that covers both custom signs AND custom sizes with `requiresQuote: true` — both enforce `price: 0`
- Non-quote custom-sized items validate price in normal range (£0.01–£100,000)

### 5. Basket Page — `shop/app/(shop)/basket/page.tsx`

- Custom-sized items display `"Custom: 350×500mm"` as size
- Muted subtitle: `"Priced as 400×600mm"` (or `"Priced as 400×600mm from PCF29"`)
- Items with `requiresQuote: true` show `"Quote"` in amber, same as custom signs

### 6. Admin Dashboard — `shop/app/(shop)/admin/page.tsx`

- Order item detail shows extra line: `"Requested: 350×500mm → Priced as 400×600mm"`
- Cross-product: `"(price from PCF29)"`
- Requires quote: amber "Requires Quote" badge

### 7. Checkout Page — `shop/app/(shop)/checkout/page.tsx`

- Add `customSizeData` to the item serialisation in the order submission payload (same pattern as `customSign` and `customFieldValues` spreads)
- No changes to totals logic or form layout

### 8. Emails & Webhook

- **Emails:** No template changes. Items render with name, size string, and price via existing HTML table.
- **Webhook:** No changes. `hasCustomItems` flag already covers items with `custom_data`.

## Data Storage

Uses existing `custom_data` JSONB column on `psp_order_items`. New type value:

```json
{
  "type": "custom_size",
  "requestedWidth": 350,
  "requestedHeight": 500,
  "matchedVariantCode": "PCF29/M",
  "matchedSize": "400x600mm",
  "matchedFromProduct": null,
  "requiresQuote": false
}
```

Sits alongside existing types: `"custom_sign"` and `"custom_fields"`.

## Files to Modify

| File | Change |
|------|--------|
| `shop/lib/custom-size-pricing.ts` | **New** — pricing engine with exported constants |
| `shop/components/CustomSizeSection.tsx` | **New** — client component for product page UI |
| `shop/app/(shop)/product/[code]/page.tsx` | Import and render `CustomSizeSection` below variants |
| `shop/components/BasketContext.tsx` | Add `customSizeData` to `BasketItem` interface |
| `shop/app/(shop)/basket/page.tsx` | Display custom size info on basket items |
| `shop/app/(shop)/checkout/page.tsx` | Add `customSizeData` to item serialisation payload |
| `shop/app/api/orders/route.ts` | Accept `customSizeData`, refactor `isCustomSign` → `isQuoteItem`, map to `custom_data` |
| `shop/app/(shop)/admin/page.tsx` | Display custom size details in order expansion |

## Files NOT Modified

| File | Reason |
|------|--------|
| `shop/lib/email.ts` | Items render through existing HTML table |
| `shop/supabase-setup.sql` | No new tables or columns |
