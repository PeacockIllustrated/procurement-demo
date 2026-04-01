# Demo Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Kier-branded procurement app into a white-label demo with onboarding flow, localStorage data layer, lead capture, and price removal.

**Architecture:** Replace the Supabase client with a localStorage adapter that mirrors its chaining API. Replace the login page with a brand-onboarding wizard that writes to localStorage. A React context (`DemoBrandProvider`) reads the stored config and applies CSS variables + logo data URLs at runtime. One real Supabase call remains for lead capture.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript, localStorage, Supabase (lead capture only)

---

### Task 1: Create colour utility helpers

**Files:**
- Create: `shop/lib/color-utils.ts`

- [ ] **Step 1: Create `shop/lib/color-utils.ts`**

```typescript
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
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd c:/Users/peaco/Desktop/procurement-demo/shop && npx tsc --noEmit lib/color-utils.ts 2>&1 | head -20`
Expected: No errors (or only unrelated TS config warnings)

- [ ] **Step 3: Commit**

```bash
git add shop/lib/color-utils.ts
git commit -m "feat(demo): add colour derivation utilities"
```

---

### Task 2: Create DemoBrand context and provider

**Files:**
- Create: `shop/lib/demo-brand.tsx`

This is the central runtime brand system. It reads/writes localStorage, applies CSS variables, and exposes brand config to all components.

- [ ] **Step 1: Create `shop/lib/demo-brand.tsx`**

```tsx
"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { derivePalette } from "./color-utils";

const STORAGE_KEY = "demo-brand";

export interface DemoBrandConfig {
  businessName: string;
  portalTitle: string;
  primaryColor: string;
  darkColor: string;
  wordmarkUrl: string; // base64 data URL
  iconUrl: string;     // base64 data URL
}

interface DemoBrandContextType {
  brand: DemoBrandConfig | null;
  isReady: boolean;
  saveBrand: (config: DemoBrandConfig) => void;
  clearBrand: () => void;
}

const DemoBrandContext = createContext<DemoBrandContextType | undefined>(undefined);

function applyBrandCssVars(config: DemoBrandConfig) {
  const palette = derivePalette(config.primaryColor, config.darkColor);
  const root = document.documentElement;
  root.style.setProperty("--brand-primary", palette.primary);
  root.style.setProperty("--brand-primary-light", palette.primaryLight);
  root.style.setProperty("--brand-primary-dark", palette.primaryDark);
  root.style.setProperty("--brand-navy", palette.navy);
  root.style.setProperty("--brand-navy-light", palette.navyLight);
}

export function DemoBrandProvider({ children }: { children: ReactNode }) {
  const [brand, setBrand] = useState<DemoBrandConfig | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const config: DemoBrandConfig = JSON.parse(stored);
        setBrand(config);
        applyBrandCssVars(config);
      }
    } catch {
      // Corrupt data — ignore
    }
    setIsReady(true);
  }, []);

  const saveBrand = useCallback((config: DemoBrandConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setBrand(config);
    applyBrandCssVars(config);
  }, []);

  const clearBrand = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setBrand(null);
  }, []);

  return (
    <DemoBrandContext.Provider value={{ brand, isReady, saveBrand, clearBrand }}>
      {children}
    </DemoBrandContext.Provider>
  );
}

export function useDemoBrand() {
  const ctx = useContext(DemoBrandContext);
  if (!ctx) throw new Error("useDemoBrand must be used within DemoBrandProvider");
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add shop/lib/demo-brand.tsx
git commit -m "feat(demo): add DemoBrand context and provider"
```

---

### Task 3: Create the localStorage Supabase adapter

**Files:**
- Create: `shop/lib/local-db.ts`

This mimics the Supabase client's chaining API but reads/writes localStorage. Covers all the method chains used across the codebase: `.from().select().eq().order().single().limit().maybeSingle().in().insert().update().delete()`.

- [ ] **Step 1: Create `shop/lib/local-db.ts`**

```typescript
/**
 * localStorage adapter that mimics the Supabase PostgREST chaining API.
 * Used in demo mode so all data stays in the browser.
 */

function getTable(name: string): Record<string, unknown>[] {
  try {
    const raw = localStorage.getItem(`demo_${name}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setTable(name: string, rows: Record<string, unknown>[]) {
  localStorage.setItem(`demo_${name}`, JSON.stringify(rows));
}

function uuid(): string {
  return crypto.randomUUID();
}

type Row = Record<string, unknown>;
type Result<T> = { data: T; error: null } | { data: null; error: { message: string } };

class QueryBuilder {
  private tableName: string;
  private filters: Array<{ col: string; op: string; val: unknown }> = [];
  private orderCol: string | null = null;
  private orderAsc = true;
  private limitN: number | null = null;
  private returnSingle = false;
  private returnMaybeSingle = false;
  private selectCols: string | null = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns?: string): this {
    this.selectCols = columns || "*";
    return this;
  }

  eq(col: string, val: unknown): this {
    this.filters.push({ col, op: "eq", val });
    return this;
  }

  neq(col: string, val: unknown): this {
    this.filters.push({ col, op: "neq", val });
    return this;
  }

  is(col: string, val: unknown): this {
    this.filters.push({ col, op: "is", val });
    return this;
  }

  in(col: string, vals: unknown[]): this {
    this.filters.push({ col, op: "in", val: vals });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }): this {
    this.orderCol = col;
    this.orderAsc = opts?.ascending ?? true;
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  single(): this {
    this.returnSingle = true;
    return this;
  }

  maybeSingle(): this {
    this.returnMaybeSingle = true;
    return this;
  }

  /** Execute a SELECT query. Called implicitly via `await`. */
  then<TResult>(
    resolve: (value: Result<Row | Row[] | null>) => TResult,
    reject?: (reason: unknown) => TResult,
  ): Promise<TResult> {
    try {
      let rows = getTable(this.tableName);

      // Apply filters
      for (const f of this.filters) {
        rows = rows.filter((r) => {
          if (f.op === "eq") return r[f.col] === f.val;
          if (f.op === "neq") return r[f.col] !== f.val;
          if (f.op === "is") return r[f.col] === f.val;
          if (f.op === "in") return (f.val as unknown[]).includes(r[f.col]);
          return true;
        });
      }

      // Order
      if (this.orderCol) {
        const col = this.orderCol;
        const asc = this.orderAsc;
        rows.sort((a, b) => {
          const av = a[col] as string | number;
          const bv = b[col] as string | number;
          if (av < bv) return asc ? -1 : 1;
          if (av > bv) return asc ? 1 : -1;
          return 0;
        });
      }

      // Limit
      if (this.limitN !== null) rows = rows.slice(0, this.limitN);

      // Project columns
      if (this.selectCols && this.selectCols !== "*") {
        const cols = this.selectCols.split(",").map((c) => c.trim());
        rows = rows.map((r) => {
          const out: Row = {};
          for (const c of cols) out[c] = r[c];
          return out;
        });
      }

      if (this.returnSingle) {
        if (rows.length === 0) return resolve({ data: null, error: { message: "No rows found" } });
        return resolve({ data: rows[0], error: null });
      }
      if (this.returnMaybeSingle) {
        return resolve({ data: rows[0] || null, error: null });
      }
      return resolve({ data: rows, error: null });
    } catch (e) {
      if (reject) return reject(e);
      return resolve({ data: null, error: { message: String(e) } });
    }
  }
}

class InsertBuilder {
  private tableName: string;
  private records: Row[];
  private selectCols: string | null = null;
  private returnSingle = false;

  constructor(tableName: string, records: Row | Row[]) {
    this.tableName = tableName;
    this.records = Array.isArray(records) ? records : [records];
  }

  select(columns?: string): this {
    this.selectCols = columns || "*";
    return this;
  }

  single(): this {
    this.returnSingle = true;
    return this;
  }

  then<TResult>(
    resolve: (value: Result<Row | Row[] | null>) => TResult,
    reject?: (reason: unknown) => TResult,
  ): Promise<TResult> {
    try {
      const rows = getTable(this.tableName);
      const now = new Date().toISOString();
      const inserted = this.records.map((r) => ({
        id: r.id || uuid(),
        ...r,
        created_at: r.created_at || now,
        updated_at: r.updated_at || now,
      }));
      rows.push(...inserted);
      setTable(this.tableName, rows);
      if (this.returnSingle) return resolve({ data: inserted[0], error: null });
      return resolve({ data: inserted, error: null });
    } catch (e) {
      if (reject) return reject(e);
      return resolve({ data: null, error: { message: String(e) } });
    }
  }
}

class UpdateBuilder {
  private tableName: string;
  private updates: Row;
  private filters: Array<{ col: string; val: unknown }> = [];
  private selectCols: string | null = null;
  private returnSingle = false;

  constructor(tableName: string, updates: Row) {
    this.tableName = tableName;
    this.updates = updates;
  }

  eq(col: string, val: unknown): this {
    this.filters.push({ col, val });
    return this;
  }

  select(columns?: string): this {
    this.selectCols = columns || "*";
    return this;
  }

  single(): this {
    this.returnSingle = true;
    return this;
  }

  then<TResult>(
    resolve: (value: Result<Row | Row[] | null>) => TResult,
    reject?: (reason: unknown) => TResult,
  ): Promise<TResult> {
    try {
      const rows = getTable(this.tableName);
      const now = new Date().toISOString();
      const updated: Row[] = [];
      for (const row of rows) {
        const match = this.filters.every((f) => row[f.col] === f.val);
        if (match) {
          Object.assign(row, this.updates, { updated_at: now });
          updated.push(row);
        }
      }
      setTable(this.tableName, rows);
      if (this.returnSingle) return resolve({ data: updated[0] || null, error: null });
      return resolve({ data: updated, error: null });
    } catch (e) {
      if (reject) return reject(e);
      return resolve({ data: null, error: { message: String(e) } });
    }
  }
}

class DeleteBuilder {
  private tableName: string;
  private filters: Array<{ col: string; val: unknown }> = [];

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  eq(col: string, val: unknown): this {
    this.filters.push({ col, val });
    return this;
  }

  then<TResult>(
    resolve: (value: Result<null>) => TResult,
    reject?: (reason: unknown) => TResult,
  ): Promise<TResult> {
    try {
      let rows = getTable(this.tableName);
      rows = rows.filter(
        (row) => !this.filters.every((f) => row[f.col] === f.val),
      );
      setTable(this.tableName, rows);
      return resolve({ data: null, error: null });
    } catch (e) {
      if (reject) return reject(e);
      return resolve({ data: null, error: { message: String(e) } });
    }
  }
}

class TableRef {
  private tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns?: string): QueryBuilder {
    return new QueryBuilder(this.tableName).select(columns);
  }

  insert(records: Row | Row[]): InsertBuilder {
    return new InsertBuilder(this.tableName, records);
  }

  update(data: Row): UpdateBuilder {
    return new UpdateBuilder(this.tableName, data);
  }

  delete(): DeleteBuilder {
    return new DeleteBuilder(this.tableName);
  }
}

/** Drop-in replacement for the Supabase client — all data stored in localStorage. */
export const localDb = {
  from(table: string): TableRef {
    return new TableRef(table);
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add shop/lib/local-db.ts
git commit -m "feat(demo): add localStorage Supabase adapter"
```

---

### Task 4: Rewrite `brand.ts` for demo mode

**Files:**
- Modify: `shop/lib/brand.ts`

The brand config becomes a set of generic defaults. The runtime values come from `DemoBrandContext` at the component level. The static `brand` export is kept for server-side usage (metadata, PDF generation) with neutral defaults.

- [ ] **Step 1: Rewrite `shop/lib/brand.ts`**

Replace the entire file content with:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add shop/lib/brand.ts
git commit -m "feat(demo): set brand.ts to generic demo defaults"
```

---

### Task 5: Update `globals.css` to neutral defaults

**Files:**
- Modify: `shop/app/globals.css`

- [ ] **Step 1: Update the `:root` block in `globals.css`**

Change lines 3–12 from Kier colours to neutral greys:

```css
:root {
  --brand-primary: #6B7280;
  --brand-primary-light: #9CA3AF;
  --brand-primary-dark: #4B5563;
  --brand-navy: #1F2937;
  --brand-navy-light: #374151;
  --brand-gray: #F4F6F8;
  --brand-gray-dark: #E2E6EA;
  --background: #F8FAFB;
  --foreground: #1A1D21;
}
```

- [ ] **Step 2: Commit**

```bash
git add shop/app/globals.css
git commit -m "feat(demo): set CSS variables to neutral grey defaults"
```

---

### Task 6: Replace all API routes with localStorage adapter

**Files:**
- Modify: `shop/app/api/orders/route.ts`
- Modify: `shop/app/api/contacts/route.ts`
- Modify: `shop/app/api/sites/route.ts`
- Modify: `shop/app/api/purchasers/route.ts`
- Modify: `shop/app/api/suggestions/route.ts`
- Modify: `shop/app/api/orders/[orderNumber]/route.ts`
- Modify: `shop/app/api/orders/[orderNumber]/delivery-note/route.ts`
- Modify: `shop/app/api/orders/[orderNumber]/items/[itemId]/route.ts`
- Modify: `shop/app/api/orders/[orderNumber]/quote/route.ts`
- Modify: `shop/app/api/orders/[orderNumber]/send-to-nest/route.ts`
- Modify: `shop/app/api/orders/[orderNumber]/raise-po/route.ts`
- Modify: `shop/lib/supabase.ts`

The strategy: since the localStorage adapter only works client-side, and all the API routes are server-side Next.js route handlers, the cleanest approach is to move order creation, contacts, sites, and purchasers **entirely to the client side**. The API routes can be simplified to stubs or removed.

However, the simpler approach that minimises changes: keep the API routes but swap `supabase` import with `localDb` import. **Problem:** `localStorage` doesn't exist on the server.

**Better approach:** Since this is a demo app, convert the data operations to happen client-side. The checkout page and other pages currently call `fetch("/api/...")`. Instead, they should call the localStorage adapter directly. This means:

- The API routes for CRUD (contacts, sites, purchasers, orders) are no longer needed for demo mode.
- The checkout submission can happen entirely on the client.
- Order listing can read from localStorage directly.

This is a large task, so we'll approach it in sub-steps.

- [ ] **Step 1: Create a client-side demo data service**

Create `shop/lib/demo-data.ts` — a set of functions that mirror what the API routes do, but using `localDb`:

```typescript
"use client";

import { localDb } from "./local-db";
import { brand, tables } from "./brand";
import { calculateDeliveryFee } from "./delivery";

// --------------- Order Number Generation ---------------

function generateOrderNumber(): string {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${brand.orderPrefix}-${datePart}-${rand}`;
}

// --------------- Contacts ---------------

export async function getContacts() {
  const { data } = await localDb.from(tables.contacts).select("*").order("name", { ascending: true });
  return (data as Record<string, unknown>[]) || [];
}

export async function createContact(contact: { name: string; email: string; phone: string }) {
  const { data } = await localDb.from(tables.contacts).insert(contact).select().single();
  return data;
}

export async function updateContact(id: string, updates: { name: string; email: string; phone: string }) {
  const { data } = await localDb.from(tables.contacts).update(updates).eq("id", id).select().single();
  return data;
}

export async function deleteContact(id: string) {
  // Nullify FK references in orders
  await localDb.from(tables.orders).update({ contact_id: null }).eq("contact_id", id);
  await localDb.from(tables.contacts).delete().eq("id", id);
}

// --------------- Sites ---------------

export async function getSites() {
  const { data } = await localDb.from(tables.sites).select("*").order("name", { ascending: true });
  return (data as Record<string, unknown>[]) || [];
}

export async function createSite(site: { name: string; address: string }) {
  const { data } = await localDb.from(tables.sites).insert(site).select().single();
  return data;
}

export async function updateSite(id: string, updates: { name: string; address: string }) {
  const { data } = await localDb.from(tables.sites).update(updates).eq("id", id).select().single();
  return data;
}

export async function deleteSite(id: string) {
  await localDb.from(tables.orders).update({ site_id: null }).eq("site_id", id);
  await localDb.from(tables.sites).delete().eq("id", id);
}

// --------------- Purchasers ---------------

export async function getPurchasers() {
  const { data } = await localDb.from(tables.purchasers).select("*").order("name", { ascending: true });
  return (data as Record<string, unknown>[]) || [];
}

export async function createPurchaser(purchaser: { name: string; email: string }) {
  const { data } = await localDb.from(tables.purchasers).insert(purchaser).select().single();
  return data;
}

export async function updatePurchaser(id: string, updates: { name: string; email: string }) {
  const { data } = await localDb.from(tables.purchasers).update(updates).eq("id", id).select().single();
  return data;
}

export async function deletePurchaser(id: string) {
  await localDb.from(tables.orders).update({ purchaser_id: null }).eq("purchaser_id", id);
  await localDb.from(tables.purchasers).delete().eq("id", id);
}

// --------------- Suggestions ---------------

export async function createSuggestion(suggestion: { name: string; message: string }) {
  const { data } = await localDb.from(tables.suggestions).insert({ ...suggestion, status: "new" }).select().single();
  return data;
}

// --------------- Orders ---------------

export interface SubmitOrderPayload {
  contactName: string;
  email: string;
  phone: string;
  siteName: string;
  siteAddress: string;
  poNumber: string | null;
  notes: string | null;
  contactId: string | null;
  siteId: string | null;
  purchaserName: string | null;
  purchaserEmail: string | null;
  purchaserId: string | null;
  items: Array<{
    code: string;
    baseCode?: string;
    name: string;
    size?: string;
    material?: string;
    price: number;
    quantity: number;
    customSign?: { signType: string; textContent: string; shape: string; additionalNotes: string };
    customFieldValues?: Array<{ label: string; key: string; value: string }>;
    customSizeData?: { type: string; requestedWidth: number; requestedHeight: number; matchedVariantCode: string | null; matchedSize: string | null; matchedFromProduct: string | null; requiresQuote: boolean };
  }>;
}

export async function submitOrder(payload: SubmitOrderPayload): Promise<{ orderNumber: string }> {
  let subtotal = 0;
  const validatedItems = payload.items.map((item) => {
    const price = Math.round(Number(item.price) * 100) / 100;
    const quantity = Math.max(1, Math.min(9999, Math.floor(Number(item.quantity))));
    const lineTotal = Math.round(price * quantity * 100) / 100;
    subtotal += lineTotal;

    let custom_data = null;
    if (item.customSign) {
      custom_data = { type: "custom_sign" as const, ...item.customSign };
    } else if (item.customFieldValues && item.customFieldValues.length > 0) {
      custom_data = { type: "custom_fields" as const, fields: item.customFieldValues };
    } else if (item.customSizeData) {
      custom_data = { type: "custom_size" as const, ...item.customSizeData };
    }

    return {
      code: item.code,
      base_code: item.baseCode || null,
      name: item.name,
      size: item.size || null,
      material: item.material || null,
      price,
      quantity,
      line_total: lineTotal,
      custom_data,
    };
  });

  subtotal = Math.round(subtotal * 100) / 100;
  const deliveryFee = calculateDeliveryFee(subtotal);
  const vat = Math.round((subtotal + deliveryFee) * 20) / 100;
  const total = Math.round((subtotal + deliveryFee + vat) * 100) / 100;
  const orderNumber = generateOrderNumber();

  const { data: order } = await localDb.from(tables.orders).insert({
    order_number: orderNumber,
    status: "new",
    contact_name: payload.contactName,
    email: payload.email,
    phone: payload.phone,
    site_name: payload.siteName,
    site_address: payload.siteAddress,
    po_number: payload.poNumber,
    notes: payload.notes,
    contact_id: payload.contactId,
    site_id: payload.siteId,
    purchaser_name: payload.purchaserName,
    purchaser_email: payload.purchaserEmail,
    purchaser_id: payload.purchaserId,
    subtotal,
    delivery_fee: deliveryFee,
    vat,
    total,
  }).select("id").single();

  const itemsWithOrderId = validatedItems.map((item) => ({
    order_id: (order as Record<string, unknown>).id,
    ...item,
  }));

  await localDb.from(tables.orderItems).insert(itemsWithOrderId);

  return { orderNumber };
}

export async function getOrders() {
  const { data: orders } = await localDb.from(tables.orders).select("*").order("created_at", { ascending: false });
  const allOrders = (orders as Record<string, unknown>[]) || [];

  const orderIds = allOrders.map((o) => o.id);
  const { data: allItems } = await localDb.from(tables.orderItems).select("*").in("order_id", orderIds);

  return allOrders.map((o) => ({
    orderNumber: o.order_number,
    createdAt: o.created_at,
    status: o.status,
    contactId: o.contact_id || null,
    siteId: o.site_id || null,
    contact: { contactName: o.contact_name, email: o.email, phone: o.phone },
    site: { siteName: o.site_name, siteAddress: o.site_address },
    poNumber: o.po_number,
    notes: o.notes,
    purchaserName: o.purchaser_name || null,
    purchaserEmail: o.purchaser_email || null,
    poDocumentName: o.po_document_name || null,
    dnDocumentName: o.dn_document_name || null,
    items: ((allItems as Record<string, unknown>[]) || [])
      .filter((item) => item.order_id === o.id)
      .map((item) => ({
        id: item.id,
        code: item.code,
        baseCode: item.base_code,
        name: item.name,
        size: item.size,
        price: Number(item.price),
        quantity: item.quantity,
        customData: item.custom_data || null,
      })),
    subtotal: Number(o.subtotal),
    deliveryFee: Number(o.delivery_fee || 0),
    vat: Number(o.vat),
    total: Number(o.total),
  }));
}
```

- [ ] **Step 2: Replace API route calls in checkout page**

Modify `shop/app/(shop)/checkout/page.tsx`:

Replace the fetch calls at lines 71-73:
```typescript
// OLD:
fetch("/api/contacts").then((r) => r.json()).then((d) => setContacts(d.contacts || [])).catch(() => {});
fetch("/api/sites").then((r) => r.json()).then((d) => setSites(d.sites || [])).catch(() => {});
fetch("/api/purchasers").then((r) => r.json()).then((d) => setPurchasers(d.purchasers || [])).catch(() => {});
```

With:
```typescript
import { getContacts, createContact, updateContact, deleteContact as deleteContactApi, getSites, createSite, updateSite, deleteSite as deleteSiteApi, getPurchasers, createPurchaser, updatePurchaser, deletePurchaser as deletePurchaserApi, submitOrder } from "@/lib/demo-data";

// In the useEffect:
getContacts().then((c) => setContacts(c.map((r: Record<string, unknown>) => ({ id: r.id as string, name: r.name as string, email: r.email as string, phone: r.phone as string }))));
getSites().then((s) => setSites(s.map((r: Record<string, unknown>) => ({ id: r.id as string, name: r.name as string, address: r.address as string }))));
getPurchasers().then((p) => setPurchasers(p.map((r: Record<string, unknown>) => ({ id: r.id as string, name: r.name as string, email: r.email as string }))));
```

Replace all `fetch("/api/contacts", ...)` calls (save, edit, delete) with direct calls to `createContact()`, `updateContact()`, `deleteContact()`, etc.

Replace all `fetch("/api/sites", ...)` calls with `createSite()`, `updateSite()`, `deleteSite()`.

Replace all `fetch("/api/purchasers", ...)` calls with `createPurchaser()`, `updatePurchaser()`, `deletePurchaser()`.

Replace the order submission `fetch("/api/orders", ...)` with `submitOrder()`.

- [ ] **Step 3: Replace API route calls in orders page**

Modify `shop/app/(shop)/orders/page.tsx`:

Replace `fetch("/api/orders")` with `getOrders()` from `@/lib/demo-data`.

- [ ] **Step 4: Replace API route calls in SuggestionWidget**

Modify `shop/components/SuggestionWidget.tsx`:

Replace `fetch("/api/suggestions", { method: "POST", ... })` with `createSuggestion()` from `@/lib/demo-data`.

- [ ] **Step 5: Commit**

```bash
git add shop/lib/demo-data.ts shop/app/(shop)/checkout/page.tsx shop/app/(shop)/orders/page.tsx shop/components/SuggestionWidget.tsx
git commit -m "feat(demo): replace all API calls with client-side localStorage operations"
```

---

### Task 7: Remove auth system and admin routes

**Files:**
- Delete: `shop/lib/auth.ts`
- Delete: `shop/lib/rate-limit.ts`
- Delete: `shop/app/api/auth/route.ts`
- Delete: `shop/app/(auth)/login/page.tsx`
- Delete: `shop/app/(auth)/login/layout.tsx`
- Delete: `shop/app/(shop)/admin/page.tsx`
- Delete: `shop/app/(shop)/admin/layout.tsx`
- Modify: `shop/app/(shop)/layout.tsx` — remove auth check
- Delete or stub: all API routes under `shop/app/api/` (orders, contacts, sites, purchasers, suggestions) — since we moved to client-side in Task 6, these server routes are now dead code
- Delete: `shop/app/api/orders/[orderNumber]/send-to-nest/route.ts`
- Delete: `shop/app/api/orders/[orderNumber]/raise-po/route.ts`
- Delete: `shop/app/api/orders/[orderNumber]/delivery-note/route.ts`
- Delete: `shop/app/api/orders/[orderNumber]/items/[itemId]/route.ts`
- Delete: `shop/app/api/orders/[orderNumber]/quote/route.ts`
- Delete: `shop/app/api/orders/[orderNumber]/route.ts`
- Delete: `shop/app/api/orders/route.ts`
- Delete: `shop/app/api/contacts/route.ts`
- Delete: `shop/app/api/sites/route.ts`
- Delete: `shop/app/api/purchasers/route.ts`
- Delete: `shop/app/api/suggestions/route.ts`
- Delete: `shop/app/dn-upload/` (admin feature)
- Delete: `shop/app/po-upload/` (admin feature)

- [ ] **Step 1: Update `shop/app/(shop)/layout.tsx`**

Replace the entire file with:

```tsx
import { BasketProvider } from "@/components/BasketContext";
import Header from "@/components/Header";
import Toast from "@/components/Toast";
import SplashScreen from "@/components/SplashScreen";
import SuggestionWidget from "@/components/SuggestionWidget";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BasketProvider>
      <SplashScreen />
      <Header />
      <main className="min-h-screen">{children}</main>
      <Toast />
      <SuggestionWidget />
    </BasketProvider>
  );
}
```

- [ ] **Step 2: Delete auth, admin, and API route files**

```bash
# Auth
rm -f shop/lib/auth.ts shop/lib/rate-limit.ts
rm -rf shop/app/api/auth
rm -rf shop/app/\(auth\)

# Admin
rm -rf shop/app/\(shop\)/admin

# Admin-only pages
rm -rf shop/app/dn-upload shop/app/po-upload

# All API routes (now replaced by client-side demo-data)
rm -rf shop/app/api/orders shop/app/api/contacts shop/app/api/sites shop/app/api/purchasers shop/app/api/suggestions
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(demo): remove auth, admin, and server API routes"
```

---

### Task 8: Create the onboarding page

**Files:**
- Create: `shop/app/(onboarding)/layout.tsx`
- Create: `shop/app/(onboarding)/page.tsx`

The onboarding page is the new entry point. It collects business name, wordmark, icon, and two brand colours.

- [ ] **Step 1: Create `shop/app/(onboarding)/layout.tsx`**

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Set Up Your Portal — Signage Portal Demo",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: "linear-gradient(145deg, #f5f7fa 0%, #F8FAFB 40%, #f4f8fb 70%, #f0f4f8 100%)" }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, var(--brand-primary) 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-48 -left-24 w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{ background: "radial-gradient(circle, var(--brand-navy) 0%, transparent 70%)" }}
        />
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create `shop/app/(onboarding)/page.tsx`**

This is a large component. Key features:
- File upload for wordmark and icon (drag-and-drop or click)
- Colour picker inputs with native `<input type="color">`
- EyeDropper API support (for sampling from uploaded images) — with feature detection fallback
- Reads existing config if in edit mode
- On submit: calls `saveBrand()` from DemoBrandContext and redirects to `/shop`

```tsx
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDemoBrand, DemoBrandConfig } from "@/lib/demo-brand";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function LogoUpload({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (dataUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.match(/^image\/(svg\+xml|png|jpeg|jpg|webp)$/)) {
        alert("Please upload an SVG, PNG, or JPG image.");
        return;
      }
      const dataUrl = await fileToDataUrl(file);
      onChange(dataUrl);
    },
    [onChange],
  );

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <p className="text-xs text-gray-400 mb-2">{hint}</p>
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
          dragOver ? "border-brand-primary bg-brand-primary/5" : "border-gray-200 hover:border-gray-300"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        {value ? (
          <img src={value} alt={label} className="max-h-20 mx-auto object-contain" />
        ) : (
          <div className="text-gray-400">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Drop an image or click to upload</p>
            <p className="text-xs mt-1">SVG, PNG, or JPG</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/svg+xml,image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
    </div>
  );
}

function ColorPickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const hasEyeDropper = typeof window !== "undefined" && "EyeDropper" in window;

  const pickFromScreen = async () => {
    try {
      // @ts-expect-error EyeDropper API not yet in all TS libs
      const dropper = new EyeDropper();
      const result = await dropper.open();
      onChange(result.sRGBHex);
    } catch {
      // User cancelled
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer p-1"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v);
          }}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-brand-primary/15 focus:border-brand-primary outline-none transition"
          placeholder="#000000"
        />
        {hasEyeDropper && (
          <button
            type="button"
            onClick={pickFromScreen}
            className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            title="Pick colour from screen"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 3l6 6-9 9-6-6 9-9zM3 21l3.5-3.5" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const { brand, isReady, saveBrand } = useDemoBrand();
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [wordmarkUrl, setWordmarkUrl] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#007B86");
  const [darkColor, setDarkColor] = useState("#1A1A1A");

  // Pre-populate if editing
  useEffect(() => {
    if (brand) {
      setBusinessName(brand.businessName);
      setWordmarkUrl(brand.wordmarkUrl);
      setIconUrl(brand.iconUrl);
      setPrimaryColor(brand.primaryColor);
      setDarkColor(brand.darkColor);
    }
  }, [brand]);

  const canSubmit = businessName.trim() && wordmarkUrl && iconUrl && primaryColor.length === 7 && darkColor.length === 7;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const config: DemoBrandConfig = {
      businessName: businessName.trim(),
      portalTitle: "Signage Portal",
      primaryColor,
      darkColor,
      wordmarkUrl,
      iconUrl,
    };
    saveBrand(config);
    router.push("/shop");
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative z-10">
      <div className="w-full max-w-lg" style={{ animation: "slide-up 0.5s ease-out" }}>
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {brand ? "Edit Your Brand" : "Set Up Your Portal"}
          </h1>
          <p className="text-sm text-gray-400">
            {brand
              ? "Update your branding below."
              : "Configure your brand identity to see how the signage portal looks with your branding."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
          {/* Business name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary/15 focus:border-brand-primary outline-none transition"
              placeholder="e.g. Acme Construction"
              autoFocus
            />
          </div>

          {/* Logo uploads */}
          <div className="grid grid-cols-2 gap-4">
            <LogoUpload
              label="Icon Logo"
              hint="Square icon for header & favicon"
              value={iconUrl}
              onChange={setIconUrl}
            />
            <LogoUpload
              label="Wordmark Logo"
              hint="Text logo / full brand name"
              value={wordmarkUrl}
              onChange={setWordmarkUrl}
            />
          </div>

          {/* Colour pickers */}
          <div className="grid grid-cols-2 gap-4">
            <ColorPickerField
              label="Primary Colour"
              value={primaryColor}
              onChange={setPrimaryColor}
            />
            <ColorPickerField
              label="Dark / Header Colour"
              value={darkColor}
              onChange={setDarkColor}
            />
          </div>

          {/* Preview strip */}
          <div className="rounded-xl overflow-hidden border border-gray-100">
            <div className="h-2" style={{ background: primaryColor }} />
            <div className="flex items-center gap-3 px-4 py-3" style={{ background: darkColor }}>
              {iconUrl && <img src={iconUrl} alt="" className="h-6 w-6 object-contain" />}
              {wordmarkUrl && <img src={wordmarkUrl} alt="" className="h-4 object-contain brightness-0 invert" />}
              {!iconUrl && !wordmarkUrl && (
                <span className="text-white/60 text-sm">Header preview</span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full text-white py-3 rounded-xl font-medium transition disabled:opacity-50 active:scale-[0.98] shadow-sm"
            style={{
              background: canSubmit
                ? `linear-gradient(135deg, ${primaryColor} 0%, ${darkColor} 100%)`
                : undefined,
            }}
          >
            {brand ? "Save Changes" : "Launch Portal"}
          </button>
        </form>

        <p className="text-center text-[11px] text-gray-300 mt-6">
          Signage Portal Demo — Powered by Onesign
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add shop/app/\(onboarding\)/layout.tsx shop/app/\(onboarding\)/page.tsx
git commit -m "feat(demo): add onboarding page with brand setup wizard"
```

---

### Task 9: Wire up DemoBrandProvider and routing

**Files:**
- Modify: `shop/app/layout.tsx` — wrap app in DemoBrandProvider
- Create: `shop/app/(shop)/layout.tsx` — add brand guard (redirect to onboarding if no brand set)
- Modify: `shop/components/Header.tsx` — use dynamic brand, add Customise button
- Modify: `shop/components/SplashScreen.tsx` — use dynamic logos from context

- [ ] **Step 1: Update `shop/app/layout.tsx`**

Wrap the app body in `DemoBrandProvider`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { DemoBrandProvider } from "@/lib/demo-brand";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Signage Portal Demo",
  description: "Demo procurement portal — configure your own brand to get started",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <DemoBrandProvider>{children}</DemoBrandProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Update shop layout with brand guard**

Create a client component wrapper. Modify `shop/app/(shop)/layout.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDemoBrand } from "@/lib/demo-brand";
import { BasketProvider } from "@/components/BasketContext";
import Header from "@/components/Header";
import Toast from "@/components/Toast";
import SplashScreen from "@/components/SplashScreen";
import SuggestionWidget from "@/components/SuggestionWidget";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { brand, isReady } = useDemoBrand();
  const router = useRouter();

  useEffect(() => {
    if (isReady && !brand) {
      router.replace("/");
    }
  }, [isReady, brand, router]);

  if (!isReady || !brand) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <BasketProvider>
      <SplashScreen />
      <Header />
      <main className="min-h-screen">{children}</main>
      <Toast />
      <SuggestionWidget />
    </BasketProvider>
  );
}
```

- [ ] **Step 3: Move shop homepage to `/shop` route**

Since the onboarding page now lives at `/`, the shop homepage needs to move. Create `shop/app/(shop)/shop/page.tsx` that re-exports the current homepage content, or restructure the routing so `(shop)` group matches `/shop` prefix.

Actually, the simpler approach: the onboarding page is at `/` via `(onboarding)/page.tsx`, and the shop layout group `(shop)` already contains the shop homepage at `(shop)/page.tsx`. When the user finishes onboarding, they redirect to `/shop`. We need to ensure the shop homepage renders at `/shop`.

Rename / restructure:
- Move `shop/app/(shop)/page.tsx` content to `shop/app/(shop)/shop/page.tsx` is wrong — route groups don't add URL segments.

Better approach: keep onboarding at root `/` and shop routes need a URL prefix. The cleanest way: put the shop content under a `shop/app/shop/` directory with its own layout:

- Move `shop/app/(shop)/` contents into `shop/app/shop/` (removing the route group parentheses so it becomes a real URL segment `/shop/...`)

OR — simpler: keep `(shop)` as a route group at root, and make the onboarding page redirect logic work differently. The onboarding page at `(onboarding)/page.tsx` would conflict with `(shop)/page.tsx` since both match `/`.

**Cleanest solution:** Remove the `(onboarding)` route group. Put the onboarding at `/setup` instead. The root `/` stays as the shop homepage. The shop layout redirects to `/setup` if no brand is configured.

- [ ] **Step 3 (revised): Create onboarding at `/setup` instead**

Move the onboarding files:
- Rename `shop/app/(onboarding)/` to `shop/app/setup/`
- The onboarding page URL becomes `/setup`
- The shop layout (Task 9, Step 2) redirects to `/setup` when no brand is found
- The onboarding `handleSubmit` redirects to `/` (the shop homepage)

Update the router.push in onboarding page from `"/shop"` to `"/"`.

Update the router.replace in shop layout from `"/"` to `"/setup"`.

- [ ] **Step 4: Update Header component**

Modify `shop/components/Header.tsx` to use dynamic brand from context:

Key changes:
- Import `useDemoBrand` instead of static `brand`
- Replace `<Image src="/assets/icon.svg" ...>` with `<img src={brand.iconUrl} ...>`
- Replace `<Image src="/assets/wordmark.svg" ...>` with `<img src={brand.wordmarkUrl} ...>`
- Replace `brand.name` with `brand.businessName`
- Replace `brand.portalTitle` with `brand.portalTitle`
- Add a "Customise" link to `/setup`
- Replace price display in basket button with item count only (T.B.D prices)

```tsx
// In the header, replace the brand logo section:
const { brand: demoBrand } = useDemoBrand();

// Replace Image components with:
<img src={demoBrand?.iconUrl} alt={demoBrand?.businessName || ""} className="w-7 h-7 shrink-0 object-contain" />
<img src={demoBrand?.wordmarkUrl} alt={demoBrand?.businessName || ""} className="h-[13px] w-auto object-contain" />
<span className="text-[10px] text-gray-400 leading-tight mt-0.5 tracking-wide">{demoBrand?.portalTitle || "Signage Portal"}</span>

// Add Customise button in the nav:
<Link href="/setup" className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-navy px-3 py-2 rounded-lg hover:bg-gray-50 transition">
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
  </svg>
  Customise
</Link>
```

- [ ] **Step 5: Update SplashScreen component**

Modify `shop/components/SplashScreen.tsx` to use dynamic logos:

```tsx
import { useDemoBrand } from "@/lib/demo-brand";

// Inside component:
const { brand: demoBrand } = useDemoBrand();

// Replace Image components:
<img src={demoBrand?.iconUrl} alt={demoBrand?.businessName || ""} className="w-16 h-16 object-contain" />
<img src={demoBrand?.wordmarkUrl} alt={demoBrand?.businessName || ""} className="h-[23px] w-auto object-contain" />
<p ...>{demoBrand?.portalTitle || "Signage Portal"}</p>
```

- [ ] **Step 6: Commit**

```bash
git add shop/app/layout.tsx shop/app/\(shop\)/layout.tsx shop/app/setup/ shop/components/Header.tsx shop/components/SplashScreen.tsx
git commit -m "feat(demo): wire up DemoBrandProvider, routing, and dynamic branding"
```

---

### Task 10: Replace all price displays with T.B.D

**Files:**
- Modify: `shop/components/ProductCard.tsx`
- Modify: `shop/components/Header.tsx` (basket button price)
- Modify: `shop/components/BasketDrawer.tsx`
- Modify: `shop/app/(shop)/basket/page.tsx`
- Modify: `shop/app/(shop)/checkout/page.tsx`
- Modify: `shop/app/(shop)/product/[code]/page.tsx`
- Modify: `shop/app/(shop)/orders/page.tsx`
- Modify: `shop/app/(shop)/order-confirmation/page.tsx`
- Modify: `shop/components/CustomSizeSection.tsx`

The pattern for each: replace `{"\u00A3"}{price.toFixed(2)}` with a styled T.B.D tag:

```tsx
<span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">T.B.D</span>
```

- [ ] **Step 1: ProductCard.tsx**

Replace lines 42-46:
```tsx
// OLD:
<span className="text-brand-navy font-bold text-base">
  {hasMultipleVariants && <span className="text-xs font-normal text-gray-400 mr-0.5">from </span>}
  {"\u00A3"}{minPrice.toFixed(2)}
</span>

// NEW:
<span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">T.B.D</span>
```

Can also remove the `minPrice` calculation at line 6 since it's no longer used.

- [ ] **Step 2: Header.tsx basket button**

Replace the price display inside the basket button (lines 80-87):
```tsx
// OLD:
{totalItems > 0 && (
  <>
    <span className="text-brand-navy">{totalItems}</span>
    <span className="text-gray-300">|</span>
    <span className="text-brand-primary font-semibold">
      {"\u00A3"}{totalPrice.toFixed(2)}
    </span>
    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-primary rounded-full" />
  </>
)}

// NEW:
{totalItems > 0 && (
  <>
    <span className="text-brand-navy">{totalItems}</span>
    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-primary rounded-full" />
  </>
)}
```

- [ ] **Step 3: BasketDrawer.tsx**

Replace all price displays:
- Line 109: item line total → T.B.D tag
- Lines 127-166: Remove entire delivery nudge section and pricing summary. Replace with a simple item count summary.

Remove the delivery nudge, subtotal, delivery, VAT, and total rows. Replace with:
```tsx
<div className="border-t border-gray-100 px-6 py-4 space-y-3 bg-white">
  <div className="flex justify-between text-sm text-gray-500">
    <span>Items</span>
    <span className="font-medium text-brand-navy">{totalItems}</span>
  </div>
  <p className="text-xs text-gray-400">Pricing confirmed after order review.</p>
  {items.some((i) => i.customSign) && (
    <p className="text-[11px] text-amber-600 leading-relaxed">
      Custom sign items will be quoted separately.
    </p>
  )}
  <div className="grid grid-cols-2 gap-2 pt-1">
    <Link href="/basket" onClick={() => setDrawerOpen(false)} className="py-2.5 text-center rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">View Basket</Link>
    <Link href="/checkout" onClick={() => setDrawerOpen(false)} className="py-2.5 text-center rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary-dark transition">Checkout</Link>
  </div>
</div>
```

- [ ] **Step 4: basket/page.tsx**

Replace all price displays:
- Line 81: unit price → T.B.D
- Line 118: line total → T.B.D
- Lines 127-178: Remove delivery nudge, subtotal, delivery, VAT, total section. Replace with simple summary.

- [ ] **Step 5: checkout/page.tsx**

Replace order summary pricing:
- Line 503: line item price → T.B.D
- Lines 521-539: Replace subtotal/delivery/VAT/total with simple item summary.

- [ ] **Step 6: product/[code]/page.tsx**

- Line 108: variant price → T.B.D tag
- Line 110: Remove "ex. VAT" text

- [ ] **Step 7: orders/page.tsx**

Replace all price displays in order history with T.B.D.

- [ ] **Step 8: order-confirmation/page.tsx**

Replace line 29 ("A confirmation email has been sent") with:
"Your order has been submitted. Our team will review it and be in touch shortly."

- [ ] **Step 9: CustomSizeSection.tsx**

Replace lines 224-227 (price display) with T.B.D tag.

- [ ] **Step 10: Commit**

```bash
git add shop/components/ProductCard.tsx shop/components/Header.tsx shop/components/BasketDrawer.tsx shop/app/\(shop\)/basket/page.tsx shop/app/\(shop\)/checkout/page.tsx shop/app/\(shop\)/product/\[code\]/page.tsx shop/app/\(shop\)/orders/page.tsx shop/app/\(shop\)/order-confirmation/page.tsx shop/components/CustomSizeSection.tsx
git commit -m "feat(demo): replace all price displays with T.B.D"
```

---

### Task 11: Remove Kier logo assets and update favicon

**Files:**
- Delete: `shop/public/assets/icon.svg`
- Delete: `shop/public/assets/wordmark.svg`
- Delete: `shop/public/assets/full-logo.svg`
- Modify: `shop/app/icon.svg` — replace with a generic placeholder

- [ ] **Step 1: Delete Kier logos**

```bash
rm -f shop/public/assets/icon.svg shop/public/assets/wordmark.svg shop/public/assets/full-logo.svg
```

- [ ] **Step 2: Replace favicon with a generic icon**

Write `shop/app/icon.svg` with a simple generic signage icon:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="8" fill="#6B7280"/>
  <text x="16" y="22" font-family="Arial,sans-serif" font-size="18" font-weight="bold" fill="white" text-anchor="middle">S</text>
</svg>
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(demo): remove Kier logos, add generic favicon"
```

---

### Task 12: Add lead capture CTA

**Files:**
- Create: `shop/components/GetStartedCta.tsx`
- Create: `shop/lib/lead-capture.ts`
- Modify: `shop/app/(shop)/layout.tsx` — include CTA component

- [ ] **Step 1: Create `shop/lib/lead-capture.ts`**

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function submitLead(data: {
  businessName: string;
  primaryColour: string;
  darkColour: string;
  wordmarkLogo: string;
  iconLogo: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}) {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Lead capture: Supabase not configured");
    return { success: false };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { error } = await supabase.from("demo_leads").insert({
    business_name: data.businessName,
    primary_colour: data.primaryColour,
    dark_colour: data.darkColour,
    wordmark_logo: data.wordmarkLogo,
    icon_logo: data.iconLogo,
    contact_name: data.contactName,
    contact_email: data.contactEmail,
    contact_phone: data.contactPhone,
  });

  if (error) {
    console.error("Lead capture error:", error);
    return { success: false };
  }
  return { success: true };
}
```

- [ ] **Step 2: Create `shop/components/GetStartedCta.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useDemoBrand } from "@/lib/demo-brand";
import { submitLead } from "@/lib/lead-capture";

export default function GetStartedCta() {
  const { brand } = useDemoBrand();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!brand || submitted) {
    if (submitted) {
      return (
        <div className="fixed bottom-5 left-5 z-40">
          <div className="bg-brand-primary text-white px-4 py-2.5 rounded-full shadow-lg text-sm font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            We&apos;ll be in touch!
          </div>
        </div>
      );
    }
    return null;
  }

  const canSubmit = name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && phone.trim() && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    await submitLead({
      businessName: brand.businessName,
      primaryColour: brand.primaryColor,
      darkColour: brand.darkColor,
      wordmarkLogo: brand.wordmarkUrl,
      iconLogo: brand.iconUrl,
      contactName: name.trim(),
      contactEmail: email.trim(),
      contactPhone: phone.trim(),
    });
    setSubmitted(true);
    setSubmitting(false);
  };

  return (
    <div className="fixed bottom-5 left-5 z-40">
      {open && (
        <div
          className="mb-3 bg-white rounded-2xl shadow-2xl border border-gray-100 w-80 overflow-hidden"
          style={{ animation: "slide-up 0.2s ease-out" }}
        >
          <div className="bg-brand-navy px-5 py-3.5 flex items-center justify-between">
            <h3 className="text-white text-sm font-semibold">Get Started</h3>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs text-gray-500">Ready to launch your own signage portal? Leave your details and we&apos;ll set everything up.</p>
            <input type="text" placeholder="Your Name *" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/15 focus:border-brand-primary transition" />
            <input type="email" placeholder="Email *" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/15 focus:border-brand-primary transition" />
            <input type="tel" placeholder="Phone *" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/15 focus:border-brand-primary transition" />
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`w-full py-2.5 rounded-xl text-sm font-medium transition ${
                canSubmit ? "bg-brand-primary text-white hover:bg-brand-primary-dark" : "bg-gray-100 text-gray-300 cursor-not-allowed"
              }`}
            >
              {submitting ? "Submitting..." : "Get Started"}
            </button>
          </div>
        </div>
      )}

      {!submitted && (
        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-2 px-5 py-3 rounded-full shadow-lg text-sm font-semibold transition-all ${
            open ? "bg-gray-100 text-gray-500 hover:bg-gray-200" : "bg-brand-primary text-white hover:bg-brand-primary-dark"
          }`}
        >
          {open ? "Close" : "Get Started"}
          {!open && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add GetStartedCta to shop layout**

In `shop/app/(shop)/layout.tsx`, import and render `<GetStartedCta />` alongside the other components.

- [ ] **Step 4: Add public Supabase env vars to `.env.example`**

Add:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 5: Commit**

```bash
git add shop/lib/lead-capture.ts shop/components/GetStartedCta.tsx shop/app/\(shop\)/layout.tsx .env.example
git commit -m "feat(demo): add Get Started lead capture CTA with Supabase"
```

---

### Task 13: Clean up dead code and unused imports

**Files:**
- Modify: `shop/lib/supabase.ts` — remove or keep only for lead capture
- Delete: `shop/lib/email.ts` — no longer needed
- Review all modified files for unused imports

- [ ] **Step 1: Replace `shop/lib/supabase.ts`**

This file used the service role key (server-side only). Lead capture now uses a client-side Supabase instance in `lead-capture.ts` with the anon key. Delete the old file:

```bash
rm -f shop/lib/supabase.ts
```

- [ ] **Step 2: Delete email module**

```bash
rm -f shop/lib/email.ts
```

- [ ] **Step 3: Clean up unused imports across all modified files**

Review each file for:
- `import { supabase }` — should be removed
- `import { isShopAuthed, isAdminAuthed }` — should be removed
- `import { sendOrderConfirmation, sendTeamNotification }` — should be removed
- `import Image from "next/image"` — where replaced by `<img>` tags
- Any other dead imports

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(demo): remove dead code — supabase server client, email module, unused imports"
```

---

### Task 14: Verify the app builds and runs

- [ ] **Step 1: Run TypeScript check**

```bash
cd c:/Users/peaco/Desktop/procurement-demo/shop && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 2: Run the dev server and test**

```bash
cd c:/Users/peaco/Desktop/procurement-demo/shop && npm run dev
```

Expected: App starts. Browser shows onboarding page at `/`. Fill in brand details, submit, see the shop with custom branding applied. Header shows custom logos, Customise button present. Products show T.B.D pricing. Basket works. Checkout works (submits to localStorage). Orders page shows the submitted order.

- [ ] **Step 3: Run the production build**

```bash
cd c:/Users/peaco/Desktop/procurement-demo/shop && npm run build
```

Expected: Build completes with no errors.

- [ ] **Step 4: Fix any issues found, commit fixes**

```bash
git add -A
git commit -m "fix(demo): address build and runtime issues"
```

---

### Task 15: Final commit — remove Persimmon assets and leftover brand references

- [ ] **Step 1: Check for any remaining Kier/Persimmon references**

Search for "Kier", "kier", "Persimmon", "persimmon" in all files.

```bash
grep -ri "kier\|persimmon" shop/ --include="*.ts" --include="*.tsx" --include="*.css" --include="*.json" -l
```

Remove any remaining references.

- [ ] **Step 2: Delete Persimmon assets from root public directory**

```bash
rm -f public/assets/persimmon_icon.svg public/assets/persimmon_wordmark.svg public/assets/persimmon_full_logo.svg
rm -f public/assets/Kier_Group_Icon.svg public/assets/Kier_Group_Full.svg
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(demo): remove all remaining Kier/Persimmon brand references"
```
