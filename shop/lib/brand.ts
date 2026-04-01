/**
 * Central brand configuration — single source of truth for all client-specific values.
 *
 * To rebrand for a new client:
 * 1. Update the values below
 * 2. Replace logo SVGs in public/assets/ (icon.svg, wordmark.svg, full-logo.svg)
 * 3. Set environment variables (.env / Vercel)
 * 4. Create Supabase tables with the chosen dbPrefix
 *
 * See REBRAND.md for the full guide.
 */

export const brand = {
  /** Display name shown in UI text (e.g. "Persimmon", "Balfour Beatty", "Keepmoat") */
  name: "Kier",

  /** Subtitle shown in header and splash screen */
  portalTitle: "Signage Portal",

  /** Full page title for browser tab / metadata */
  fullTitle: "Kier Signage Portal",

  /** Meta description for SEO */
  description: "Order construction signage for your Kier development",

  /**
   * Order number prefix (e.g. "PER", "BAL", "KPM").
   * Orders will be generated as {prefix}-{date}-{random}, e.g. "PER-20260331-AB12"
   */
  orderPrefix: "KER",

  /** localStorage key for the shopping basket — must be unique per client if sharing a domain */
  basketKey: "kier-basket",

  /**
   * Supabase table prefix — MUST be unique per client.
   * All clients share the same Supabase database, so each gets a distinct prefix
   * to avoid data cross-contamination.
   *
   * Convention: 3-letter abbreviation of the company name.
   * Examples: "psp" (Persimmon), "bal" (Balfour Beatty), "kpm" (Keepmoat)
   *
   * Tables created: {prefix}_orders, {prefix}_order_items, {prefix}_suggestions,
   *                 {prefix}_contacts, {prefix}_sites, {prefix}_purchasers
   */
  dbPrefix: "ker",

  /** Brand identifier sent to Make.com webhook for order routing */
  webhookBrand: "kier",

  /** Email configuration */
  email: {
    senderName: "Signage Portal",
    companyName: "Onesign and Digital",
    companyAddress: "D86 Princesway, Gateshead NE11 0TU",
    companyPhone: "0191 487 6767",
  },

  /**
   * Brand colours — these are used in email templates and PDF documents.
   * CSS colours for the UI are defined separately in globals.css (--brand-* variables).
   * Keep both in sync when rebranding.
   */
  colors: {
    primary: "#007B86",
    primaryLight: "#1A9AA5",
    primaryDark: "#005F68",
    navy: "#1A1A1A",
    navyLight: "#333333",
    red: "#DA242A",
  },
};

/**
 * Supabase table names — derived from the brand prefix.
 * Import this wherever you query the database.
 */
export const tables = {
  orders: `${brand.dbPrefix}_orders`,
  orderItems: `${brand.dbPrefix}_order_items`,
  suggestions: `${brand.dbPrefix}_suggestions`,
  contacts: `${brand.dbPrefix}_contacts`,
  sites: `${brand.dbPrefix}_sites`,
  purchasers: `${brand.dbPrefix}_purchasers`,
} as const;
