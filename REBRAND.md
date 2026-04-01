# Signage Portal — Rebrand Guide

This guide covers every step to deploy the Signage Portal for a new construction client. The product catalog, shop flow, custom sign builder, and admin dashboard all stay the same — only the branding and infrastructure change.

---

## Step 1: Brand Configuration — `shop/lib/brand.ts`

Open `shop/lib/brand.ts` and update these values:

| Field | What to set | Example (Keepmoat) |
|-------|------------|-------------------|
| `name` | Client display name | `"Keepmoat"` |
| `portalTitle` | Subtitle in header/splash | `"Signage Portal"` |
| `fullTitle` | Browser tab title | `"Keepmoat Signage Portal"` |
| `description` | Meta description | `"Order construction signage for your Keepmoat development"` |
| `orderPrefix` | Order number prefix (3 letters) | `"KPM"` |
| `basketKey` | localStorage key | `"keepmoat-basket"` |
| `dbPrefix` | Supabase table prefix (3 letters) | `"kpm"` |
| `webhookBrand` | Make.com webhook identifier | `"keepmoat"` |

### Brand Colours

Update `colors` in `brand.ts` **and** the matching CSS variables in `shop/app/globals.css`:

| CSS Variable | Role | Default |
|---|---|---|
| `--brand-primary` | Primary accent — buttons, links, active states | `#3db28c` |
| `--brand-primary-light` | Hover backgrounds | `#5ac4a1` |
| `--brand-primary-dark` | Button hover, dark accent | `#007961` |
| `--brand-navy` | Primary text, headings, header background | `#00474a` |
| `--brand-navy-light` | Secondary text | `#006266` |
| `--brand-gray` | Page background | `#F4F6F8` |
| `--brand-gray-dark` | Borders | `#E2E6EA` |

Keep `brand.ts` colors and `globals.css` variables in sync — both are used (CSS for the UI, brand.ts for emails and PDFs).

---

## Step 2: Logo Files — `shop/public/assets/`

Replace these 3 SVGs with the client's equivalents:

| File | Usage | Notes |
|------|-------|-------|
| `icon.svg` | Square icon — header, splash screen, favicon | Keep viewBox similar to original |
| `wordmark.svg` | Text logo — header, splash, login | Horizontal text-only logo |
| `full-logo.svg` | Combined logo (available for future use) | Icon + wordmark together |

Also replace:
- `shop/app/icon.svg` — Browser favicon
- `shop/app/apple-icon.png` — Touch icon (PNG, ~180x180)

---

## Step 3: Database Tables

**CRITICAL**: Each client gets a unique 3-letter prefix to avoid data cross-contamination. All clients share the same Supabase database.

### Prefix Convention

| Client | Prefix | Tables |
|--------|--------|--------|
| Persimmon | `psp` | `psp_orders`, `psp_order_items`, ... |
| Balfour Beatty | `bal` | `bal_orders`, `bal_order_items`, ... |
| Keepmoat | `kpm` | `kpm_orders`, `kpm_order_items`, ... |

### Creating Tables

1. Open the Supabase SQL Editor
2. Copy the SQL from `shop/supabase-setup.sql`
3. Find-and-replace `{prefix}` with your chosen prefix (e.g. `kpm`)
4. Run the SQL

**Note**: Run the contacts and sites tables BEFORE the orders table (orders references them via foreign keys). The SQL file is ordered correctly for this.

### Update brand.ts

Set `dbPrefix` to match: `dbPrefix: "kpm"`

---

## Step 4: Environment Variables

Set these in Vercel (and local `.env` for development):

```
# Shared across all clients (already set)
SUPABASE_URL=<shared Supabase URL>
SUPABASE_SERVICE_ROLE_KEY=<shared service role key>
MAKE_WEBHOOK_URL=<shared Make webhook>

# Unique per client
SHOP_PASSWORD=<password for client staff>
ADMIN_PASSWORD=<admin password for Onesign>
SHOP_AUTH_TOKEN=<generate: openssl rand -hex 32>
ADMIN_AUTH_TOKEN=<generate: openssl rand -hex 32>
SITE_URL=<new Vercel URL, e.g. https://keepmoat-signage.vercel.app>
SMTP_USER=<Office365 email address>
SMTP_PASS=<Office365 password>
TEAM_NOTIFICATION_EMAIL=<who receives order notifications>
NEST_EMAIL=<Nest PO request recipient>
RAISE_PO_SECRET=<generate: openssl rand -hex 16>
```

---

## Step 5: Deployment (Vercel)

1. Create a new Vercel project
2. Connect to the GitHub repo (or import the code)
3. Set **Root Directory** to `shop/`
4. Add environment variables from Step 4
5. Deploy

---

## Step 6: Verification Checklist

Run through this after all changes:

- [ ] Login page shows correct client branding and colours
- [ ] Splash screen shows correct logo and text
- [ ] Header shows client logo and correct colours
- [ ] Homepage category grid renders with new accent colour
- [ ] Product pages show correct brand colours
- [ ] Custom sign builder works (submit a test)
- [ ] Basket and checkout pages branded correctly
- [ ] Order confirmation page shows correct styling
- [ ] Order number starts with correct prefix (e.g. `KPM-`)
- [ ] Email confirmation received with correct branding
- [ ] Admin dashboard accessible and functional
- [ ] Orders write to correct tables (e.g. `kpm_orders`)
- [ ] `next build` passes cleanly
- [ ] Mobile responsive — no overflow or layout issues

---

## What Stays the Same

- Product catalog (`catalog.json`) — same signage range across clients
- Product images — same files
- Custom sign builder — same flow and preview
- Shop flow — browse, basket, checkout, confirmation
- Admin dashboard — orders + suggestions management
- Auth model — shared passwords, cookie-based
- All component logic and page structure
- Onesign branding in email headers, PDF documents, and footers
