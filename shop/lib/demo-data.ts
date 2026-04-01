"use client";

import { localDb } from "@/lib/local-db";
import { brand, tables } from "@/lib/brand";
import { calculateDeliveryFee } from "@/lib/delivery";

type Row = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export async function getContacts(): Promise<Row[]> {
  const { data, error } = await localDb
    .from(tables.contacts)
    .select()
    .order("name", { ascending: true });
  if (error || !data) return [];
  return data as Row[];
}

export async function createContact(payload: {
  name: string;
  email: string;
  phone: string;
}): Promise<Row | null> {
  const { data, error } = await localDb
    .from(tables.contacts)
    .insert(payload)
    .select()
    .single();
  if (error || !data) return null;
  return data as Row;
}

export async function updateContact(
  id: string,
  payload: { name: string; email: string; phone: string },
): Promise<Row | null> {
  const { data, error } = await localDb
    .from(tables.contacts)
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) return null;
  return data as Row;
}

export async function deleteContact(id: string): Promise<void> {
  // Nullify FK in orders first
  await localDb.from(tables.orders).update({ contact_id: null }).eq("contact_id", id);
  await localDb.from(tables.contacts).delete().eq("id", id);
}

// ---------------------------------------------------------------------------
// Sites
// ---------------------------------------------------------------------------

export async function getSites(): Promise<Row[]> {
  const { data, error } = await localDb
    .from(tables.sites)
    .select()
    .order("name", { ascending: true });
  if (error || !data) return [];
  return data as Row[];
}

export async function createSite(payload: {
  name: string;
  address: string;
}): Promise<Row | null> {
  const { data, error } = await localDb
    .from(tables.sites)
    .insert(payload)
    .select()
    .single();
  if (error || !data) return null;
  return data as Row;
}

export async function updateSite(
  id: string,
  payload: { name: string; address: string },
): Promise<Row | null> {
  const { data, error } = await localDb
    .from(tables.sites)
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) return null;
  return data as Row;
}

export async function deleteSite(id: string): Promise<void> {
  await localDb.from(tables.orders).update({ site_id: null }).eq("site_id", id);
  await localDb.from(tables.sites).delete().eq("id", id);
}

// ---------------------------------------------------------------------------
// Purchasers
// ---------------------------------------------------------------------------

export async function getPurchasers(): Promise<Row[]> {
  const { data, error } = await localDb
    .from(tables.purchasers)
    .select()
    .order("name", { ascending: true });
  if (error || !data) return [];
  return data as Row[];
}

export async function createPurchaser(payload: {
  name: string;
  email: string;
}): Promise<Row | null> {
  const { data, error } = await localDb
    .from(tables.purchasers)
    .insert(payload)
    .select()
    .single();
  if (error || !data) return null;
  return data as Row;
}

export async function updatePurchaser(
  id: string,
  payload: { name: string; email: string },
): Promise<Row | null> {
  const { data, error } = await localDb
    .from(tables.purchasers)
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) return null;
  return data as Row;
}

export async function deletePurchaser(id: string): Promise<void> {
  await localDb.from(tables.orders).update({ purchaser_id: null }).eq("purchaser_id", id);
  await localDb.from(tables.purchasers).delete().eq("id", id);
}

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------

export async function createSuggestion(payload: {
  name: string;
  message: string;
}): Promise<Row | null> {
  const { data, error } = await localDb
    .from(tables.suggestions)
    .insert({ ...payload, status: "new" })
    .select()
    .single();
  if (error || !data) return null;
  return data as Row;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

function generateOrderNumber(): string {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${brand.orderPrefix}-${datePart}-${rand}`;
}

interface OrderPayload {
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
    customSign?: {
      signType: string;
      textContent: string;
      shape: string;
      additionalNotes: string;
    };
    customFieldValues?: Array<{ label: string; key: string; value: string }>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customSizeData?: any;
  }>;
}

export async function submitOrder(
  payload: OrderPayload,
): Promise<{ orderNumber: string }> {
  const {
    contactName,
    email,
    phone,
    siteName,
    siteAddress,
    poNumber,
    notes,
    contactId,
    siteId,
    purchaserName,
    purchaserEmail,
    purchaserId,
    items,
  } = payload;

  // Calculate totals
  let subtotal = 0;
  const validatedItems = items.map((item) => {
    const price = Math.round(Number(item.price) * 100) / 100;
    const quantity = Math.max(1, Math.min(9999, Math.floor(Number(item.quantity))));
    const lineTotal = Math.round(price * quantity * 100) / 100;
    subtotal += lineTotal;

    let custom_data: Row | null = null;
    if (item.customSign) {
      custom_data = {
        type: "custom_sign",
        signType: String(item.customSign.signType),
        textContent: String(item.customSign.textContent),
        shape: String(item.customSign.shape),
        additionalNotes: String(item.customSign.additionalNotes || ""),
      };
    } else if (item.customFieldValues && item.customFieldValues.length > 0) {
      custom_data = {
        type: "custom_fields",
        fields: item.customFieldValues.map((f) => ({
          label: String(f.label),
          key: String(f.key),
          value: String(f.value),
        })),
      };
    } else if (item.customSizeData) {
      custom_data = {
        type: "custom_size",
        requestedWidth: Number(item.customSizeData.requestedWidth),
        requestedHeight: Number(item.customSizeData.requestedHeight),
        matchedVariantCode: item.customSizeData.matchedVariantCode
          ? String(item.customSizeData.matchedVariantCode)
          : null,
        matchedSize: item.customSizeData.matchedSize
          ? String(item.customSizeData.matchedSize)
          : null,
        matchedFromProduct: item.customSizeData.matchedFromProduct
          ? String(item.customSizeData.matchedFromProduct)
          : null,
        requiresQuote: !!item.customSizeData.requiresQuote,
      };
    }

    return {
      code: String(item.code),
      base_code: item.baseCode ? String(item.baseCode) : null,
      name: String(item.name),
      size: item.size ? String(item.size) : null,
      material: item.material ? String(item.material) : null,
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

  // Insert order
  const { data: order } = await localDb
    .from(tables.orders)
    .insert({
      order_number: orderNumber,
      status: "new",
      contact_name: String(contactName),
      email: String(email),
      phone: String(phone),
      site_name: String(siteName),
      site_address: String(siteAddress),
      po_number: poNumber || null,
      notes: notes || null,
      contact_id: contactId || null,
      site_id: siteId || null,
      purchaser_name: purchaserName || null,
      purchaser_email: purchaserEmail || null,
      purchaser_id: purchaserId || null,
      subtotal,
      delivery_fee: deliveryFee,
      vat,
      total,
    })
    .select()
    .single();

  if (!order) throw new Error("Failed to save order");

  // Insert order items
  const itemsWithOrderId = validatedItems.map((item) => ({
    order_id: (order as Row).id,
    ...item,
  }));

  await localDb.from(tables.orderItems).insert(itemsWithOrderId);

  return { orderNumber };
}

export async function getOrders(): Promise<Row[]> {
  const { data: orders, error } = await localDb
    .from(tables.orders)
    .select()
    .order("created_at", { ascending: false });

  if (error || !orders) return [];

  const orderRows = orders as Row[];
  const orderIds = orderRows.map((o) => o.id as string);

  if (orderIds.length === 0) return [];

  const { data: allItems } = await localDb
    .from(tables.orderItems)
    .select()
    .in("order_id", orderIds);

  const itemRows = (allItems as Row[] | null) || [];

  return orderRows.map((o) => ({
    orderNumber: o.order_number,
    createdAt: o.created_at,
    status: o.status,
    contactId: o.contact_id || null,
    siteId: o.site_id || null,
    contact: {
      contactName: o.contact_name,
      email: o.email,
      phone: o.phone,
    },
    site: {
      siteName: o.site_name,
      siteAddress: o.site_address,
    },
    poNumber: o.po_number || null,
    notes: o.notes || null,
    purchaserName: o.purchaser_name || null,
    purchaserEmail: o.purchaser_email || null,
    poDocumentName: o.po_document_name || null,
    dnDocumentName: o.dn_document_name || null,
    items: itemRows
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
