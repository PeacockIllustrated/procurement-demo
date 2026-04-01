"use client";

import Link from "next/link";
import { useBasket } from "./BasketContext";
import { useState, useEffect } from "react";
import SearchBar from "./SearchBar";
import BasketDrawer from "./BasketDrawer";
import { useDemoBrand } from "@/lib/demo-brand";

export default function Header() {
  const { totalItems, setDrawerOpen } = useBasket();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { brand: demoBrand } = useDemoBrand();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className={`bg-white/95 backdrop-blur-md border-b sticky top-0 z-50 transition-[box-shadow,border-color] duration-300 ${scrolled ? "shadow-md border-gray-200/60" : "border-gray-200/80 shadow-none"}`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <img src={demoBrand?.iconUrl} alt={demoBrand?.businessName || ""} className="w-7 h-7 shrink-0 object-contain" />
            <div className="flex flex-col">
              <img src={demoBrand?.wordmarkUrl} alt={demoBrand?.businessName || ""} className="h-[13px] w-auto object-contain" />
              <span className="text-[10px] text-gray-400 leading-tight mt-0.5 tracking-wide">{demoBrand?.portalTitle || "Signage Portal"}</span>
            </div>
          </Link>

          <div className="hidden md:block flex-1 max-w-lg mx-4">
            <SearchBar />
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/setup"
              className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-navy px-3 py-2 rounded-lg hover:bg-gray-50 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Customise
            </Link>

            <Link
              href="/custom-sign"
              className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-navy px-3 py-2 rounded-lg hover:bg-gray-50 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              Custom Sign
            </Link>

            <Link
              href="/orders"
              className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-navy px-3 py-2 rounded-lg hover:bg-gray-50 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Orders
            </Link>

            <button
              onClick={() => setDrawerOpen(true)}
              className="relative flex items-center gap-2 text-sm font-medium text-brand-navy bg-brand-gray hover:bg-brand-gray-dark rounded-lg px-4 py-2.5 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              {totalItems > 0 && (
                <>
                  <span className="text-brand-navy">{totalItems}</span>
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-primary rounded-full" />
                </>
              )}
            </button>

            <button
              className="md:hidden p-2 hover:bg-gray-50 rounded-lg transition"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden px-4 pb-3 border-t border-gray-100 pt-3">
            <SearchBar />
            <Link
              href="/setup"
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-navy mt-3 px-1"
              onClick={() => setMenuOpen(false)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Customise
            </Link>
            <Link
              href="/custom-sign"
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-navy mt-3 px-1"
              onClick={() => setMenuOpen(false)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              Custom Sign
            </Link>
            <Link
              href="/orders"
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-navy mt-3 px-1"
              onClick={() => setMenuOpen(false)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Orders
            </Link>
          </div>
        )}
      </header>
      <BasketDrawer />
    </>
  );
}
