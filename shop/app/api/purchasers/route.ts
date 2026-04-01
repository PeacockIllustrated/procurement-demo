import { NextRequest, NextResponse } from "next/server";
import { tables } from "@/lib/brand";
import { supabase } from "@/lib/supabase";
import { isShopAuthed, isAdminAuthed } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  if (!(await isShopAuthed()) && !(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from(tables.purchasers)
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Fetch purchasers error:", error);
    return NextResponse.json({ error: "Failed to fetch purchasers" }, { status: 500 });
  }

  return NextResponse.json({ purchasers: data });
}

export async function POST(req: NextRequest) {
  if (!(await isShopAuthed()) && !(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();

    if (!name || name.length > 200) {
      return NextResponse.json({ error: "Name is required (max 200 chars)" }, { status: 400 });
    }
    if (!email || !EMAIL_RE.test(email) || email.length > 200) {
      return NextResponse.json({ error: "Valid email is required (max 200 chars)" }, { status: 400 });
    }

    // Check for existing purchaser with same email (upsert semantics)
    const { data: existing } = await supabase
      .from(tables.purchasers)
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    const { data, error } = await supabase
      .from(tables.purchasers)
      .insert({ name, email })
      .select()
      .single();

    if (error) {
      console.error("Create purchaser error:", error);
      return NextResponse.json({ error: "Failed to create purchaser" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  if (!(await isShopAuthed()) && !(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = String(body.id || "").trim();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    if (!name || name.length > 200) return NextResponse.json({ error: "Name is required (max 200 chars)" }, { status: 400 });
    if (!email || !EMAIL_RE.test(email) || email.length > 200) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });

    const { data, error } = await supabase
      .from(tables.purchasers)
      .update({ name, email })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) return NextResponse.json({ error: "Purchaser not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isShopAuthed()) && !(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    // Nullify FK references on orders first
    await supabase.from(tables.orders).update({ purchaser_id: null }).eq("purchaser_id", id);

    const { error } = await supabase.from(tables.purchasers).delete().eq("id", id);
    if (error) return NextResponse.json({ error: "Failed to delete purchaser" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
