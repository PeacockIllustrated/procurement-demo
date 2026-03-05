"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface OrderItem {
  code: string;
  name: string;
  size: string | null;
  quantity: number;
  price: number;
}

interface Order {
  orderNumber: string;
  createdAt: string;
  status: string;
  contact: { contactName: string; email: string; phone: string };
  site: { siteName: string; siteAddress: string };
  poNumber: string | null;
  notes: string | null;
  items: OrderItem[];
  subtotal: number;
  vat: number;
  total: number;
}

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => {
        setOrders(data.orders || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredOrders = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const statusColors: Record<string, string> = {
    new: "bg-blue-50 text-blue-600",
    "in-progress": "bg-amber-50 text-amber-600",
    completed: "bg-emerald-50 text-emerald-600",
  };

  const updateStatus = async (orderNumber: string, newStatus: string) => {
    await fetch(`/api/orders/${orderNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setOrders((prev) =>
      prev.map((o) => (o.orderNumber === orderNumber ? { ...o, status: newStatus } : o))
    );
    if (selectedOrder?.orderNumber === orderNumber) {
      setSelectedOrder((prev) => prev ? { ...prev, status: newStatus } : null);
    }
  };

  if (loading) {
    return <div className="max-w-6xl mx-auto px-4 py-16 text-center text-gray-400">Loading orders...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-persimmon-navy">Order Management</h1>
          <p className="text-gray-400 text-sm mt-0.5">{orders.length} total orders</p>
        </div>
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-persimmon-green transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to shop
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        {["all", "new", "in-progress", "completed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              filter === f
                ? "bg-persimmon-navy text-white shadow-sm"
                : "bg-white text-gray-500 border border-gray-100 hover:bg-gray-50"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== "all" && (
              <span className="ml-1.5 opacity-60">
                ({orders.filter((o) => o.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400">No orders found.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <button
                key={order.orderNumber}
                onClick={() => setSelectedOrder(order)}
                className={`w-full text-left bg-white rounded-2xl border p-5 transition-all hover:shadow-md ${
                  selectedOrder?.orderNumber === order.orderNumber
                    ? "border-persimmon-green shadow-md"
                    : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-persimmon-navy">{order.orderNumber}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{order.contact.contactName}</p>
                    <p className="text-xs text-gray-400">{order.site.siteName}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusColors[order.status] || "bg-gray-100 text-gray-500"}`}>
                      {order.status}
                    </span>
                    <p className="text-sm font-bold text-persimmon-navy mt-1.5">
                      {"\u00A3"}{order.total.toFixed(2)}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-gray-300 mt-2.5">{order.items.length} items</p>
              </button>
            ))}
          </div>

          {selectedOrder && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-24 self-start">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h2 className="text-lg font-bold text-persimmon-navy">{selectedOrder.orderNumber}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(selectedOrder.createdAt).toLocaleString("en-GB")}
                  </p>
                </div>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => updateStatus(selectedOrder.orderNumber, e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-persimmon-green/15"
                >
                  <option value="new">New</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Contact</h3>
                    <p className="text-sm font-medium">{selectedOrder.contact.contactName}</p>
                    <p className="text-sm text-gray-500">{selectedOrder.contact.email}</p>
                    <p className="text-sm text-gray-500">{selectedOrder.contact.phone}</p>
                  </div>
                  <div>
                    <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Site</h3>
                    <p className="text-sm font-medium">{selectedOrder.site.siteName}</p>
                    <p className="text-sm text-gray-500">{selectedOrder.site.siteAddress}</p>
                  </div>
                </div>

                {(selectedOrder.poNumber || selectedOrder.notes) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedOrder.poNumber && (
                      <div>
                        <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">PO Number</h3>
                        <p className="text-sm">{selectedOrder.poNumber}</p>
                      </div>
                    )}
                    {selectedOrder.notes && (
                      <div>
                        <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Notes</h3>
                        <p className="text-sm text-gray-500">{selectedOrder.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Items</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-gray-400 text-xs">
                        <th className="pb-2 font-medium">Code</th>
                        <th className="pb-2 font-medium">Size</th>
                        <th className="pb-2 font-medium text-center">Qty</th>
                        <th className="pb-2 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="py-2.5 font-medium text-gray-700">{item.code}</td>
                          <td className="py-2.5 text-gray-500">{item.size || "-"}</td>
                          <td className="py-2.5 text-center text-gray-500">{item.quantity}</td>
                          <td className="py-2.5 text-right font-medium">{"\u00A3"}{(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-100">
                        <td colSpan={3} className="pt-2.5 text-gray-500">Subtotal</td>
                        <td className="pt-2.5 text-right">{"\u00A3"}{selectedOrder.subtotal.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="text-gray-400 text-xs">VAT</td>
                        <td className="text-right text-gray-400 text-xs">{"\u00A3"}{selectedOrder.vat.toFixed(2)}</td>
                      </tr>
                      <tr className="font-bold text-persimmon-navy">
                        <td colSpan={3} className="pt-2">Total</td>
                        <td className="pt-2 text-right">{"\u00A3"}{selectedOrder.total.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
