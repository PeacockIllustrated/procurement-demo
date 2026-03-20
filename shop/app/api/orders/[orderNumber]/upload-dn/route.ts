import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdminAuthed } from "@/lib/auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB — delivery notes can be larger scans
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await params;

  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Please upload a PDF or image." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const { error } = await supabase
      .from("psp_orders")
      .update({
        dn_document_name: file.name,
        dn_document_data: base64,
        dn_document_type: file.type,
      })
      .eq("order_number", orderNumber);

    if (error) {
      console.error("DN upload DB error:", error);
      return NextResponse.json({ error: "Failed to save delivery note" }, { status: 500 });
    }

    console.log(`Delivery note uploaded for ${orderNumber} — ${file.name} (${Math.round(file.size / 1024)}KB)`);
    return NextResponse.json({ success: true, filename: file.name });
  } catch (error) {
    console.error("DN upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
