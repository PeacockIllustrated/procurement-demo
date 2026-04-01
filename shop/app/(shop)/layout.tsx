"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDemoBrand } from "@/lib/demo-brand";
import { BasketProvider } from "@/components/BasketContext";
import Header from "@/components/Header";
import Toast from "@/components/Toast";
import SplashScreen from "@/components/SplashScreen";
import SuggestionWidget from "@/components/SuggestionWidget";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { brand, isReady } = useDemoBrand();
  const router = useRouter();

  useEffect(() => {
    if (isReady && !brand) {
      router.replace("/setup");
    }
  }, [isReady, brand, router]);

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
      <main className="min-h-screen">{children}</main>
      <Toast />
      <SuggestionWidget />
    </BasketProvider>
  );
}
