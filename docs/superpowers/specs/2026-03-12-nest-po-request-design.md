# Nest PO Request System — Design Spec

## Overview

Add a "Send to Nest" workflow to the Persimmon admin dashboard so that admins can send a formatted PO request email to Nest with one click. This replaces the current manual process of drafting and sending emails. The system introduces a new `awaiting_po` order status to track orders that are waiting on a purchase order from Nest.

**Initial deployment is internal-only** — the `NEST_EMAIL` env var will point to an Onesign team address for testing. Once verified, it will be swapped to Nest's real email.

## Status Model

### Current

```
new → in-progress → completed
         ↘ cancelled
```

### New

```
new → awaiting_po → in-progress → completed
         ↘ cancelled (from any state)
```

### Changes Required

1. **Database:** `ALTER` the CHECK constraint on `psp_orders.status` to include `'awaiting_po'`
2. **API validation:** Add `'awaiting_po'` to the valid statuses array in `shop/app/api/orders/[orderNumber]/route.ts` (PATCH handler)
3. **Admin dashboard:** Update filter pills, status dropdown, and badge colours in `shop/app/(shop)/admin/page.tsx`
4. **Customer orders page:** Add `awaiting_po` status description in `shop/app/(shop)/orders/page.tsx`

### Badge Colour

- `new` — blue (existing)
- `awaiting_po` — amber/yellow (new)
- `in-progress` — blue (existing)
- `completed` — grey/green (existing)
- `cancelled` — red (existing)

Note: `cancelled` is a valid status in the database but is not currently exposed in the admin filter pills or status dropdown. This is an existing limitation we are intentionally preserving — cancellation is a rare manual operation handled directly in the database if needed.

## API: Send to Nest

### Endpoint

**POST `/api/orders/[orderNumber]/send-to-nest`**

### Authentication

Requires `admin-auth` cookie (same as existing admin endpoints).

### Request

No body required — the order number is in the URL path.

### Logic

1. Fetch order from `psp_orders` by order number
2. Validate: order exists, status is `new` or `awaiting_po` (allows re-sending if Nest lost the email; re-send keeps status as `awaiting_po`)
3. Fetch order items from `psp_order_items` by order ID
4. Send PO request email to `NEST_EMAIL` env var via Resend
5. Update order status to `awaiting_po`
6. Return response

### Response

**Success (200):**
```json
{ "success": true, "message": "PO request sent to Nest" }
```

**Error (400/404/500):**
```json
{ "error": "Description of what went wrong" }
```

### Guard Rails

- Rejects if order status is `in-progress`, `completed`, or `cancelled` (only `new` and `awaiting_po` are valid for sending)
- Re-sending from `awaiting_po` is idempotent — email is re-sent, status stays `awaiting_po`
- If email send fails, status is NOT updated (no silent failures)
- If status update fails after email send, returns current order status in the error response so the admin UI can reflect reality. If the order is already `awaiting_po` (transient DB timeout where write succeeded), treat as success.

## Email Template

### Recipient

`NEST_EMAIL` environment variable (single fixed address).

### Subject

`PO Request — {orderNumber} — {siteName}`

### Body (HTML)

Follows the existing Persimmon email template style from `shop/lib/email.ts`:

- **Header:** Persimmon green banner with "Purchase Order Request"
- **Order details section:**
  - Order Number
  - Site Name
  - Site Address
  - Contact Name
  - Contact Email
  - Contact Phone
  - Customer PO Number (if provided at checkout)
  - Notes (if provided)
- **Items table:**
  - Uses the same 4-column layout as existing emails: product image (CID), product description (name + size inline), qty, line total
  - Custom sign items marked with sign type badge (same as existing emails)
  - This is a deliberate match to the existing template style — Nest sees the same format the customer and team already receive
- **Totals:**
  - Subtotal
  - VAT (20%)
  - Total

### New Function

`sendNestPORequest(order, items)` added to `shop/lib/email.ts`. Uses the same Resend client and inline-HTML approach as existing email functions. Queries `psp_order_items` directly from the database (not via the API response shape) to get all columns including `size`, `material`, and `custom_data`.

### Sender

Same `FROM_EMAIL` env var used for all other system emails.

## Admin Dashboard UI

### "Send to Nest" Button

- **Visibility:** Appears on order cards with status `new` or `awaiting_po` (re-send capability)
- **Placement:** Inside the order detail accordion, alongside the status dropdown
- **Style:** Amber/yellow button to visually associate with the `awaiting_po` state
- **Confirmation:** Browser `confirm()` dialog — "Send PO request to Nest for {orderNumber}?"
- **Loading state:** Button shows spinner/disabled state while request is in flight
- **Success:** Order status updates to `awaiting_po` in the UI (refetch or local state update)
- **Failure:** Error message displayed inline on the order card

### Filter Pills

Add `awaiting_po` pill between `new` and `in-progress`:

`All | New | Awaiting PO | In Progress | Completed`

Each pill shows a count badge.

### Status Dropdown

Add `Awaiting PO` option to the existing status dropdown. Normal workflow is via the button, but manual override is available.

### Status Badge

`awaiting_po` renders as an amber/yellow badge with text "Awaiting PO".

## Customer Orders Page

Add `awaiting_po` entry to the existing `statusConfig` object in `orders/page.tsx`. Only the new entry is added — existing status descriptions are left as-is.

- **New entry:** `awaiting_po` — label: "Awaiting PO", description: "Order sent for purchase order approval", colour: amber/yellow (consistent with admin badge)
- **Filter pills:** Add `awaiting_po` between `new` and `in-progress` so customers can filter to it
- **Status banner:** `awaiting_po` gets amber/yellow styling in the expanded order detail view (consistent with badge colour)

## Environment Variables

| Variable | Purpose | Initial Value (Testing) |
|----------|---------|------------------------|
| `NEST_EMAIL` | Recipient for PO request emails | Onesign team email address |

No new Supabase env vars needed — uses existing connection.

## Database Migration

### Prerequisite

The `custom_data JSONB` column on `psp_order_items` must already exist. If not yet applied, run first:

```sql
ALTER TABLE psp_order_items ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT NULL;
```

### Status Constraint

```sql
-- Add 'awaiting_po' to the status check constraint
ALTER TABLE psp_orders DROP CONSTRAINT IF EXISTS psp_orders_status_check;
ALTER TABLE psp_orders ADD CONSTRAINT psp_orders_status_check
  CHECK (status IN ('new', 'awaiting_po', 'in-progress', 'completed', 'cancelled'));
```

## Files Changed

| File | Change |
|------|--------|
| `shop/app/api/orders/[orderNumber]/route.ts` | Add `'awaiting_po'` to valid statuses |
| `shop/app/api/orders/[orderNumber]/send-to-nest/route.ts` | **New file** — POST handler for sending PO request |
| `shop/lib/email.ts` | Add `sendNestPORequest()` function |
| `shop/app/(shop)/admin/page.tsx` | Add button, filter pill, badge colour, dropdown option |
| `shop/app/(shop)/orders/page.tsx` | Add `awaiting_po` status description |
| `shop/supabase-setup.sql` | Update CHECK constraint documentation |

## What Does NOT Change

- Order submission flow (checkout, POST `/api/orders`)
- Customer confirmation and team notification emails
- Product catalog, images, custom sign builder
- Authentication model
- Any other existing functionality
