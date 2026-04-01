"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { brand } from "@/lib/brand";

export default function SplashScreen() {
  const [phase, setPhase] = useState<"visible" | "exiting" | "done">("visible");

  useEffect(() => {
    // Start exit after icon + wordmark have animated in and held
    const exitTimer = setTimeout(() => setPhase("exiting"), 2000);
    // Remove from DOM after exit animation completes
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
        <Image
          src="/assets/icon.svg"
          alt={brand.name}
          width={64}
          height={62}
          priority
        />
      </div>

      {/* Wordmark */}
      <div style={{ animation: "splash-wordmark-in 0.6s ease-out 0.4s both" }}>
        <Image
          src="/assets/wordmark.svg"
          alt={brand.name}
          width={160}
          height={23}
          priority
        />
      </div>

      {/* Subtitle */}
      <p
        className="text-gray-400 text-xs tracking-[0.2em] uppercase mt-3"
        style={{ animation: "splash-wordmark-in 0.5s ease-out 0.7s both" }}
      >
        {brand.portalTitle}
      </p>
    </div>
  );
}
