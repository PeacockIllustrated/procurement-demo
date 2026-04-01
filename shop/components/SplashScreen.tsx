"use client";

import { useState, useEffect } from "react";
import { useDemoBrand } from "@/lib/demo-brand";

export default function SplashScreen() {
  const [phase, setPhase] = useState<"visible" | "exiting" | "done">("visible");
  const { brand: demoBrand } = useDemoBrand();

  useEffect(() => {
    const exitTimer = setTimeout(() => setPhase("exiting"), 2000);
    const doneTimer = setTimeout(() => setPhase("done"), 2600);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white"
      style={{
        animation: phase === "exiting" ? "splash-exit 0.6s ease-in forwards" : undefined,
      }}
    >
      {/* Icon */}
      <div
        className="mb-5"
        style={{ animation: "splash-icon-in 0.7s ease-out both" }}
      >
        {demoBrand?.iconUrl ? (
          <img src={demoBrand.iconUrl} alt={demoBrand.businessName} className="w-16 h-16 object-contain" />
        ) : (
          <div className="w-16 h-16 bg-gray-200 rounded-2xl" />
        )}
      </div>

      {/* Wordmark */}
      <div style={{ animation: "splash-wordmark-in 0.6s ease-out 0.4s both" }}>
        {demoBrand?.wordmarkUrl ? (
          <img src={demoBrand.wordmarkUrl} alt={demoBrand.businessName} className="h-[23px] w-auto object-contain" />
        ) : (
          <div className="h-[23px] w-32 bg-gray-200 rounded" />
        )}
      </div>

      {/* Subtitle */}
      <p
        className="text-gray-400 text-xs tracking-[0.2em] uppercase mt-3"
        style={{ animation: "splash-wordmark-in 0.5s ease-out 0.7s both" }}
      >
        {demoBrand?.portalTitle || "Signage Portal"}
      </p>
    </div>
  );
}
