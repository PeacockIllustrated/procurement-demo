import { NextRequest, NextResponse } from "next/server";
import { brand, tables } from "@/lib/brand";
import { supabase } from "@/lib/supabase";
import { buildNestPOEmailHtml, buildPurchaserPOEmailHtml, generateRaisePoToken } from "@/lib/email";

function esc(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function confirmationHtml(orderNumber: string, message: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PO Sent — ${esc(orderNumber)}</title></head>
<body style="margin:0;font-family:Arial,sans-serif;background:#f8faf9;display:flex;align-items:center;justify-content:center;min-height:100vh">
  <div style="text-align:center;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:440px;width:100%;margin:16px;padding:40px">
    <div style="width:48px;height:48px;border-radius:50%;background:#3db28c;margin:0 auto 16px;display:flex;align-items:center;justify-content:center">
      <svg width="24" height="24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
    </div>
    <h1 style="color:#00474a;font-size:20px;margin:0 0 8px">${esc(message)}</h1>
    <p style="color:#666;font-size:14px;margin:0 0 24px">Order <strong>${esc(orderNumber)}</strong> — the purchaser will receive an email with a link to attach their PO document.</p>
    <p style="color:#999;font-size:12px;margin:0">You can close this page.</p>
  </div>
</body></html>`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await params;
  const token = req.nextUrl.searchParams.get("t");

  // Validate token
  const expected = generateRaisePoToken(orderNumber);
  if (!token || token !== expected) {
    return new NextResponse(
      "<h1>Invalid or expired link</h1>",
      { status: 403, headers: { "Content-Type": "text/html" } }
    );
  }

  const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;
  if (!makeWebhookUrl) {
    return new NextResponse(
      "<h1>Webhook not configured</h1>",
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }

  try {
    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from(tables.orders)
      .select("*")
      .eq("order_number", orderNumber)
      .single();

    if (orderError || !order) {
      return new NextResponse(
        "<h1>Order not found</h1>",
        { status: 404, headers: { "Content-Type": "text/html" } }
      );
    }

    const siteUrl = process.env.SITE_URL || "http://localhost:3000";

    // Prevent duplicate — only allow from "new" status
    if (order.status !== "new") {
      const purchaserLabel = order.purchaser_name || order.purchaser_email || "the purchaser";
      return new NextResponse(
        confirmationHtml(orderNumber, `Already sent to ${purchaserLabel}`),
        { headers: { "Content-Type": "text/html" } }
      );
    }

    // Update status immediately to prevent race conditions from double-clicks
    await supabase
      .from(tables.orders)
      .update({ status: "awaiting_po" })
      .eq("order_number", orderNumber);

    // Fetch order items
    const { data: items } = await supabase
      .from(tables.orderItems)
      .select("*")
      .eq("order_id", order.id);

    const orderData = {
      orderNumber: order.order_number,
      contactName: order.contact_name,
      email: order.email,
      phone: order.phone,
      siteName: order.site_name,
      siteAddress: order.site_address,
      poNumber: order.po_number,
      notes: order.notes,
      items: (items || []).map((item: Record<string, unknown>) => ({
        code: item.code as string,
        base_code: item.base_code as string | null,
        name: item.name as string,
        size: item.size as string | null,
        material: item.material as string | null,
        price: Number(item.price),
        quantity: item.quantity as number,
        line_total: Number(item.line_total),
        custom_data: item.custom_data || null,
      })),
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.delivery_fee || 0),
      vat: Number(order.vat),
      total: Number(order.total),
    };

    const { subject, html } = buildNestPOEmailHtml(orderData, siteUrl);

    // Build purchaser email if a purchaser is attached
    const uploadPoUrl = `${siteUrl}/po-upload/${orderNumber}?t=${token}`;
    const purchaserEmailPayload = order.purchaser_email
      ? buildPurchaserPOEmailHtml({ ...orderData, purchaserName: order.purchaser_name, purchaserEmail: order.purchaser_email }, siteUrl, uploadPoUrl)
      : null;

    // Fire Make webhook with isPO: true
    const hasPurchaser = !!(order.purchaser_email);
    const res = await fetch(makeWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand: brand.webhookBrand,
        isPO: true,
        hasPurchaser,
        emailSubject: subject,
        emailHtml: html,
        orderNumber: order.order_number,
        contactName: order.contact_name,
        contactEmail: order.email,
        contactPhone: order.phone,
        siteName: order.site_name,
        siteAddress: order.site_address,
        poNumber: order.po_number,
        notes: order.notes,
        subtotal: Number(order.subtotal),
        deliveryFee: Number(order.delivery_fee || 0),
        vat: Number(order.vat),
        total: Number(order.total),
        itemCount: (items || []).length,
        hasCustomItems: (items || []).some((i: Record<string, unknown>) => !!i.custom_data),
        purchaserName: order.purchaser_name || "",
        purchaserEmail: order.purchaser_email || "",
        purchaserEmailSubject: purchaserEmailPayload?.subject || "",
        purchaserEmailHtml: purchaserEmailPayload?.html || "",
      }),
    });

    console.log(`Raise PO webhook fired for ${orderNumber} — ${res.status}`);

    // Show confirmation page
    const confirmMsg = hasPurchaser
      ? `Sent to ${order.purchaser_name || order.purchaser_email}`
      : "PO raised — sent to Onesign";
    return new NextResponse(
      confirmationHtml(orderNumber, confirmMsg),
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (error) {
    console.error("Raise PO error:", error);
    return new NextResponse(
      "<h1>Something went wrong</h1><p>Please try again or raise the PO from the admin dashboard.</p>",
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
}
