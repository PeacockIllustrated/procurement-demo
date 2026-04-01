import { NextRequest, NextResponse } from "next/server";
import { tables } from "@/lib/brand";
import { supabase } from "@/lib/supabase";
import { isAdminAuthed } from "@/lib/auth";
import { generateOrderListPdf } from "@/lib/order-list-pdf";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const { orderNumber } = await params;

    const { data: order, error: orderError } = await supabase
      .from(tables.orders)
      .select("*")
      .eq("order_number", orderNumber)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

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

    const pdfBase64 = await generateOrderListPdf(orderData);
    const buffer = Buffer.from(pdfBase64, "base64");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="order-list-${orderNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Order list PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate order list" }, { status: 500 });
  }
}
