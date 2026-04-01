import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { DemoBrandProvider } from "@/lib/demo-brand";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Signage Portal Demo",
  description: "Demo procurement portal — configure your own brand to get started",
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <DemoBrandProvider>{children}</DemoBrandProvider>
      </body>
    </html>
  );
}
