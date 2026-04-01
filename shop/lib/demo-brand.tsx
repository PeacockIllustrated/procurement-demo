"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { derivePalette } from "./color-utils";

const STORAGE_KEY = "demo-brand";

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

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const config: DemoBrandConfig = JSON.parse(stored);
        setBrand(config);
        applyBrandCssVars(config);
      }
    } catch {
      // Corrupt data — ignore
    }
    setIsReady(true);
  }, []);

  const saveBrand = useCallback((config: DemoBrandConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setBrand(config);
    applyBrandCssVars(config);
  }, []);

  const clearBrand = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setBrand(null);
  }, []);

  return (
    <DemoBrandContext.Provider value={{ brand, isReady, saveBrand, clearBrand }}>
      {children}
    </DemoBrandContext.Provider>
  );
}

export function useDemoBrand() {
  const ctx = useContext(DemoBrandContext);
  if (!ctx) throw new Error("useDemoBrand must be used within DemoBrandProvider");
  return ctx;
}
