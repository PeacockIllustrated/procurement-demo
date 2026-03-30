import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdminAuthed } from "@/lib/auth";
import { calculateDeliveryFee } from "@/lib/delivery";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string; itemId: string }> }
) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const { orderNumber, itemId } = await params;
    const body = await req.json();
    const price = Math.round(Number(body.price) * 100) / 100;

    if (!price || price <= 0 || price > 100000) {
      return NextResponse.json({ error: "Price must be between £0.01 and £100,000" }, { status: 400 });
    }

    // Find the order
    const { data: order, error: orderErr } = await supabase
      .from("psp_orders")
      .select("id")
      .eq("order_number", orderNumber)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Find the item and verify it belongs to this order and is a quote item
    const { data: item, error: itemErr } = await supabase
      .from("psp_order_items")
      .select("*")
      .eq("id", itemId)
      .eq("order_id", order.id)
      .single();

    if (itemErr || !item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (!item.custom_data) {
      return NextResponse.json({ error: "Only custom/quote items can be repriced" }, { status: 400 });
    }

    // Update the item price and line_total
    const lineTotal = Math.round(price * item.quantity * 100) / 100;

    const { error: updateErr } = await supabase
      .from("psp_order_items")
      .update({ price, line_total: lineTotal })
      .eq("id", itemId);

    if (updateErr) {
      return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
    }

    // Recalculate order totals from all items
    const { data: allItems } = await supabase
      .from("psp_order_items")
      .select("price, quantity, line_total")
      .eq("order_id", order.id);

    const subtotal = Math.round(
      (allItems || []).reduce((sum, i) => sum + Number(i.line_total), 0) * 100
    ) / 100;
    const deliveryFee = calculateDeliveryFee(subtotal);
    const vat = Math.round((subtotal + deliveryFee) * 20) / 100;
    const total = Math.round((subtotal + deliveryFee + vat) * 100) / 100;

    const { error: orderUpdateErr } = await supabase
      .from("psp_orders")
      .update({ subtotal, delivery_fee: deliveryFee, vat, total })
      .eq("id", order.id);

    if (orderUpdateErr) {
      return NextResponse.json({ error: "Failed to update order totals" }, { status: 500 });
    }

    return NextResponse.json({
      message: "Item price updated",
      item: { id: itemId, price, lineTotal },
      orderTotals: { subtotal, deliveryFee, vat, total },
    });
  } catch (error) {
    console.error("Error updating item price:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
