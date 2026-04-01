import type { Metadata } from "next";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Login - ${brand.fullTitle}`,
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "linear-gradient(145deg, #f0faf6 0%, #F8FAFB 40%, #f4f8fb 70%, #eef7f3 100%)" }}>
      {/* Subtle branded background shapes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, var(--brand-primary) 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-48 -left-24 w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{ background: "radial-gradient(circle, var(--brand-navy) 0%, transparent 70%)" }}
        />
      </div>
      {children}
    </div>
  );
}
