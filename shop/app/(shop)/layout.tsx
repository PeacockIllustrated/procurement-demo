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
