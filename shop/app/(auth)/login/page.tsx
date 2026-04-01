"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import { brand } from "@/lib/brand";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "admin" ? "admin" : "shop";

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, mode }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push(mode === "admin" ? "/admin" : "/");
        router.refresh();
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative z-10">
      <div className="w-full max-w-sm" style={{ animation: "slide-up 0.5s ease-out" }}>
        {/* Brand mark */}
        <div className="text-center mb-10">
          <Image src="/assets/icon.svg" alt={brand.name} width={80} height={80} className="mx-auto mb-5 w-20 h-auto" />
          <div className="flex justify-center mb-3">
            <Image src="/assets/wordmark.svg" alt={brand.name} width={160} height={24} className="h-5 w-auto" />
          </div>
          <p className="text-sm text-gray-400 mt-2 tracking-wide">
            {mode === "admin" ? "Order management" : brand.portalTitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="mb-5">
            <label htmlFor="password" className="block text-xs font-semibold text-brand-navy/60 uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary/15 focus:border-brand-primary outline-none transition bg-white"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 mb-4 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white py-3 rounded-xl font-medium transition disabled:opacity-50 active:scale-[0.98] shadow-sm"
            style={{ background: loading ? "var(--brand-primary)" : "linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%)" }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-[11px] text-gray-300 mt-6 tracking-wide">
          {brand.fullTitle}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
