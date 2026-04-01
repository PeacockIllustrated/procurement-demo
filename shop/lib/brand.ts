/**
 * Brand configuration for demo mode.
 *
 * Static defaults used for server-side rendering, metadata, and PDF/email generation.
 * At runtime, components read dynamic values from DemoBrandContext (localStorage).
 */

export const brand = {
  name: "Your Company",
  portalTitle: "Signage Portal",
  fullTitle: "Signage Portal Demo",
  description: "Demo procurement portal — configure your own brand to get started",
  orderPrefix: "DEMO",
  basketKey: "demo-basket",
  dbPrefix: "demo",
  webhookBrand: "demo",
  email: {
    senderName: "Signage Portal",
    companyName: "Onesign and Digital",
    companyAddress: "D86 Princesway, Gateshead NE11 0TU",
    companyPhone: "0191 487 6767",
  },
  colors: {
    primary: "#6B7280",
    primaryLight: "#9CA3AF",
    primaryDark: "#4B5563",
    navy: "#1F2937",
    navyLight: "#374151",
    red: "#EF4444",
  },
};

export const tables = {
  orders: `${brand.dbPrefix}_orders`,
  orderItems: `${brand.dbPrefix}_order_items`,
  suggestions: `${brand.dbPrefix}_suggestions`,
  contacts: `${brand.dbPrefix}_contacts`,
  sites: `${brand.dbPrefix}_sites`,
  purchasers: `${brand.dbPrefix}_purchasers`,
} as const;
