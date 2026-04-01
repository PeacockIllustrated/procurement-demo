"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { derivePalette } from "./color-utils";

const STORAGE_KEY = "demo-brand";

// Simple SVG placeholders encoded as data URLs
const DEFAULT_ICON = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="4" fill="#6B7280"/><path d="M8 7h2v2H8zM8 11h2v2H8zM14 7h2v2h-2zM14 11h2v2h-2zM10 15h4v6h-4z" fill="white"/></svg>')}`;
const DEFAULT_WORDMARK = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 20"><text x="0" y="15" font-family="system-ui,sans-serif" font-size="14" font-weight="600" fill="#1F2937">Your Company</text></svg>')}`;

export const DEFAULT_BRAND: DemoBrandConfig = {
  businessName: "Your Company",
  portalTitle: "Signage Portal",
  primaryColor: "#007B86",
  darkColor: "#1A1A1A",
  iconUrl: DEFAULT_ICON,
  wordmarkUrl: DEFAULT_WORDMARK,
};

export interface DemoBrandConfig {
  businessName: string;
  portalTitle: string;
  primaryColor: string;
  darkColor: string;
  wordmarkUrl: string; // base64 data URL
  iconUrl: string;     // base64 data URL
}

interface DemoBrandContextType {
  brand: DemoBrandConfig | null;
  isReady: boolean;
  isDefaultBrand: boolean;
  saveBrand: (config: DemoBrandConfig) => void;
  clearBrand: () => void;
}

const DemoBrandContext = createContext<DemoBrandContextType | undefined>(undefined);

function applyBrandCssVars(config: DemoBrandConfig) {
  const palette = derivePalette(config.primaryColor, config.darkColor);
  const root = document.documentElement;
  root.style.setProperty("--brand-primary", palette.primary);
  root.style.setProperty("--brand-primary-light", palette.primaryLight);
  root.style.setProperty("--brand-primary-dark", palette.primaryDark);
  root.style.setProperty("--brand-navy", palette.navy);
  root.style.setProperty("--brand-navy-light", palette.navyLight);
}

export function DemoBrandProvider({ children }: { children: ReactNode }) {
  const [brand, setBrand] = useState<DemoBrandConfig | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isDefaultBrand, setIsDefaultBrand] = useState(false);

  // Load from localStorage on mount, fall back to default brand
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const config: DemoBrandConfig = JSON.parse(stored);
        setBrand(config);
        applyBrandCssVars(config);
        setIsDefaultBrand(false);
      } else {
        setBrand(DEFAULT_BRAND);
        applyBrandCssVars(DEFAULT_BRAND);
        setIsDefaultBrand(true);
      }
    } catch {
      setBrand(DEFAULT_BRAND);
      applyBrandCssVars(DEFAULT_BRAND);
      setIsDefaultBrand(true);
    }
    setIsReady(true);
  }, []);

  const saveBrand = useCallback((config: DemoBrandConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setBrand(config);
    applyBrandCssVars(config);
    setIsDefaultBrand(false);
  }, []);

  const clearBrand = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setBrand(null);
    setIsDefaultBrand(false);
  }, []);

  return (
    <DemoBrandContext.Provider value={{ brand, isReady, isDefaultBrand, saveBrand, clearBrand }}>
      {children}
    </DemoBrandContext.Provider>
  );
}

export function useDemoBrand() {
  const ctx = useContext(DemoBrandContext);
  if (!ctx) throw new Error("useDemoBrand must be used within DemoBrandProvider");
  return ctx;
}
