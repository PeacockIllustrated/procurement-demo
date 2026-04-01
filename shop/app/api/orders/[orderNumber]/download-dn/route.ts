import { NextRequest, NextResponse } from "next/server";
import { tables } from "@/lib/brand";
import { supabase } from "@/lib/supabase";
import { isShopAuthed, isAdminAuthed } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  if (!(await isShopAuthed()) && !(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const { orderNumber } = await params;

    const { data: order, error } = await supabase
      .from(tables.orders)
      .select("dn_document_name, dn_document_data, dn_document_type")
      .eq("order_number", orderNumber)
      .single();

    if (error || !order || !order.dn_document_data) {
      return NextResponse.json({ error: "Delivery note not found" }, { status: 404 });
    }

    const buffer = Buffer.from(order.dn_document_data, "base64");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": order.dn_document_type || "application/pdf",
        "Content-Disposition": `attachment; filename="${order.dn_document_name || `delivery-note-${orderNumber}.pdf`}"`,
      },
    });
  } catch (error) {
    console.error("DN download error:", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
