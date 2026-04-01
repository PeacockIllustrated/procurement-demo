"use client";

import { useState } from "react";
import { useDemoBrand } from "@/lib/demo-brand";
import { submitLead } from "@/lib/lead-capture";

export default function GetStartedCta() {
  const { brand } = useDemoBrand();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!brand || submitted) {
    if (submitted) {
      return (
        <div className="fixed bottom-5 left-5 z-40">
          <div className="bg-brand-primary text-white px-4 py-2.5 rounded-full shadow-lg text-sm font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            We&apos;ll be in touch!
          </div>
        </div>
      );
    }
    return null;
  }

  const canSubmit = name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && phone.trim() && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    await submitLead({
      businessName: brand.businessName,
      primaryColour: brand.primaryColor,
      darkColour: brand.darkColor,
      wordmarkLogo: brand.wordmarkUrl,
      iconLogo: brand.iconUrl,
      contactName: name.trim(),
      contactEmail: email.trim(),
      contactPhone: phone.trim(),
    });
    setSubmitted(true);
    setSubmitting(false);
  };

  return (
    <div className="fixed bottom-5 left-5 z-40">
      {open && (
        <div
          className="mb-3 bg-white rounded-2xl shadow-2xl border border-gray-100 w-80 overflow-hidden"
          style={{ animation: "slide-up 0.2s ease-out" }}
        >
          <div className="bg-brand-navy px-5 py-3.5 flex items-center justify-between">
            <h3 className="text-white text-sm font-semibold">Get Started</h3>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs text-gray-500">Ready to launch your own signage portal? Leave your details and we&apos;ll set everything up.</p>
            <input type="text" placeholder="Your Name *" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/15 focus:border-brand-primary transition" />
            <input type="email" placeholder="Email *" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/15 focus:border-brand-primary transition" />
            <input type="tel" placeholder="Phone *" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/15 focus:border-brand-primary transition" />
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`w-full py-2.5 rounded-xl text-sm font-medium transition ${
                canSubmit ? "bg-brand-primary text-white hover:bg-brand-primary-dark" : "bg-gray-100 text-gray-300 cursor-not-allowed"
              }`}
            >
              {submitting ? "Submitting..." : "Get Started"}
            </button>
          </div>
        </div>
      )}

      {!submitted && (
        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-2 px-5 py-3 rounded-full shadow-lg text-sm font-semibold transition-all ${
            open ? "bg-gray-100 text-gray-500 hover:bg-gray-200" : "bg-brand-primary text-white hover:bg-brand-primary-dark"
          }`}
        >
          {open ? "Close" : "Get Started"}
          {!open && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
