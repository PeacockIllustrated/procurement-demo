"use client";

import Link from "next/link";
import { useDemoBrand } from "@/lib/demo-brand";
import { BasketProvider } from "@/components/BasketContext";
import Header from "@/components/Header";
import Toast from "@/components/Toast";
import SplashScreen from "@/components/SplashScreen";
import SuggestionWidget from "@/components/SuggestionWidget";
import GetStartedCta from "@/components/GetStartedCta";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { brand, isReady, isDefaultBrand } = useDemoBrand();

  if (!isReady || !brand) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <BasketProvider>
      <SplashScreen />
      <Header />
      {isDefaultBrand && (
        <div className="bg-brand-navy text-white text-sm text-center py-2 px-4">
          <span className="text-white/70">No custom branding applied.</span>{" "}
          <Link href="/setup" className="underline underline-offset-2 font-medium hover:text-white/90 transition">
            Click here to set up your brand
          </Link>
        </div>
      )}
      <main className="min-h-screen">{children}</main>
      <Toast />
      <SuggestionWidget />
      <GetStartedCta />
    </BasketProvider>
  );
}
