# Demo Rebrand Design Spec

## Overview

Convert the Kier-branded procurement app into a white-label demo version. Remove all Kier branding, auth, admin, and pricing. Replace the login page with an onboarding flow where prospective customers configure their own brand identity. All data is stored in localStorage (no Supabase dependency for demo functionality). A single real Supabase integration captures warm leads when users express interest.

## 1. Onboarding Page

Replaces the login page as the app entry point at `/`.

### Fields
- **Business name** — text input
- **Wordmark logo** — file upload (SVG, PNG, JPG)
- **Icon logo** — file upload (SVG, PNG, JPG)
- **Primary brand colour** — colour picker with eyedropper to sample from uploaded images
- **Dark/header colour** — colour picker with eyedropper to sample from uploaded images

### Colour Derivation
- `primaryLight` = primary lightened ~10%
- `primaryDark` = primary darkened ~15%
- `navyLight` = dark colour lightened ~10%

### Flow
1. User fills in the form
2. Clicks "Launch Portal"
3. Brand config saved to localStorage (key: `demo-brand`)
4. CSS variables updated at runtime via `document.documentElement.style.setProperty()`
5. Logos stored as base64 data URLs in localStorage
6. Redirect to shop homepage — splash screen plays with their uploaded icon + wordmark

### Returning Visitors
- On load, check localStorage for `demo-brand`
- If present, skip onboarding, apply brand config, go straight to shop
- "Customise" button in the header returns to onboarding in edit mode (pre-populated)

## 2. localStorage Adapter (Approach A)

A drop-in replacement for the Supabase client that mimics the chaining API the app uses.

### Supported Methods
- `from(table)` — selects a localStorage collection
- `.select(columns?)` — reads records
- `.insert(records)` — adds records, auto-generates UUIDs
- `.update(fields)` — modifies matching records
- `.eq(column, value)` — filters by equality
- `.order(column, { ascending })` — sorts results
- `.single()` — returns first result instead of array
- `.limit(n)` — limits result count

### Storage Schema
Each table stored as a JSON array under a key:
- `demo_orders`
- `demo_order_items`
- `demo_contacts`
- `demo_sites`
- `demo_purchasers`
- `demo_suggestions`

### Email & Webhook Replacement
- `sendOrderConfirmation()` — becomes a no-op, returns success
- `sendTeamNotification()` — becomes a no-op, returns success
- Webhook calls — become no-ops, return success

## 3. Lead Capture (Real Supabase)

The only real Supabase integration. Fires when user clicks "Get Started" CTA.

### `demo_leads` Table Schema
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| business_name | text | From onboarding |
| primary_colour | text | Hex value |
| dark_colour | text | Hex value |
| wordmark_logo | text | Base64 data URL |
| icon_logo | text | Base64 data URL |
| contact_name | text | From CTA form |
| contact_email | text | From CTA form |
| contact_phone | text | From CTA form |
| created_at | timestamptz | Auto-set |

### CTA Placement
A "Get Started" or "Launch Your Portal" prompt — final-stage, not a demo signup. Appears as:
- A persistent but unobtrusive element (e.g. banner or floating button)
- Collects: name, email, phone
- On submit: saves brand config + contact info to `demo_leads` in Supabase
- Shows a confirmation message

## 4. Pricing Replacement

All price displays replaced with a styled "T.B.D" tag.

### Affected Locations
- Product cards (grid/list views)
- Product detail page
- Custom sign builder pricing
- Basket drawer line items and totals
- Checkout order summary
- Order confirmation page
- Order history items
- PDF generation (quote PDF, order list PDF)

### Behaviour
- Basket still tracks items and quantities
- Checkout flow still works end-to-end
- No monetary values shown anywhere — "T.B.D" in their place
- Delivery fee logic hidden/removed

## 5. Removals

### Deleted Entirely
- `/app/(auth)/login/` — page and layout (replaced by onboarding)
- `/app/api/auth/` — auth API route
- `/app/(shop)/admin/` — admin page and all sub-routes
- `/lib/auth.ts` — auth check functions
- Auth middleware/redirects in shop layout
- Admin auth cookie logic
- Kier SVG logos from `/public/assets/` (icon.svg, wordmark.svg, full-logo.svg)
- Kier-specific references in brand.ts

### Modified
- **`brand.ts`** — becomes a runtime config reader. Exports a `getBrand()` function that reads from localStorage with generic fallbacks (name: "Your Company", portalTitle: "Signage Portal")
- **`globals.css`** — CSS variables set to neutral defaults (greys), overridden at runtime
- **Header** — adds "Customise" button, removes admin link
- **Splash screen** — reads logos from localStorage instead of static files
- **Shop layout** — removes auth check, keeps BasketProvider/SplashScreen/Header
- **Email module** — export functions become no-ops
- **Webhook calls** — become no-ops
- **All price displays** — show "T.B.D"

### Kept Unchanged
- Product catalogue and images
- Category browsing and search
- Custom sign builder (minus pricing)
- Basket item management (add/remove/quantity)
- Checkout form and order submission flow
- Order confirmation page (minus monetary totals)
- Database migration files (unused but retained for reference)
- `.env.example` (updated for demo context)

## 6. Runtime Brand Application

### On App Load (client-side)
1. Read `demo-brand` from localStorage
2. If missing, redirect to onboarding
3. If present:
   - Set CSS variables on `:root` (`--brand-primary`, `--brand-primary-light`, `--brand-primary-dark`, `--brand-navy`, `--brand-navy-light`)
   - Make logo data URLs available to components via React context or direct localStorage reads
   - Set `brand.name` and `brand.portalTitle` from stored config

### Colour Derivation Logic
```
lighten(hex, amount) → mix with white
darken(hex, amount) → mix with black
primaryLight = lighten(primary, 0.10)
primaryDark = darken(primary, 0.15)
navyLight = lighten(dark, 0.10)
```

## 7. Default/Fallback State

Before onboarding is completed, the app uses neutral defaults:
- Name: "Your Company"
- Portal title: "Signage Portal"
- Primary: `#6B7280` (neutral grey)
- Dark: `#1F2937` (dark grey)
- Logos: generic placeholder SVGs (simple geometric shapes)
