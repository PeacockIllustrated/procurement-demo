"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDemoBrand, DemoBrandConfig } from "@/lib/demo-brand";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function LogoUpload({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (dataUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.match(/^image\/(svg\+xml|png|jpeg|jpg|webp)$/)) {
        alert("Please upload an SVG, PNG, or JPG image.");
        return;
      }
      const dataUrl = await fileToDataUrl(file);
      onChange(dataUrl);
    },
    [onChange],
  );

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <p className="text-xs text-gray-400 mb-2">{hint}</p>
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
          dragOver ? "border-brand-primary bg-brand-primary/5" : "border-gray-200 hover:border-gray-300"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        {value ? (
          <img src={value} alt={label} className="max-h-20 mx-auto object-contain" />
        ) : (
          <div className="text-gray-400">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Drop an image or click to upload</p>
            <p className="text-xs mt-1">SVG, PNG, or JPG</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/svg+xml,image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
    </div>
  );
}

function ColorPickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const hasEyeDropper = typeof window !== "undefined" && "EyeDropper" in window;

  const pickFromScreen = async () => {
    try {
      // @ts-expect-error EyeDropper API not yet in all TS libs
      const dropper = new EyeDropper();
      const result = await dropper.open();
      onChange(result.sRGBHex);
    } catch {
      // User cancelled
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer p-1"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v);
          }}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-brand-primary/15 focus:border-brand-primary outline-none transition"
          placeholder="#000000"
        />
        {hasEyeDropper && (
          <button
            type="button"
            onClick={pickFromScreen}
            className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            title="Pick colour from screen"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 3l6 6-9 9-6-6 9-9zM3 21l3.5-3.5" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const { brand, isReady, saveBrand } = useDemoBrand();
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [wordmarkUrl, setWordmarkUrl] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#007B86");
  const [darkColor, setDarkColor] = useState("#1A1A1A");

  // Pre-populate if editing
  useEffect(() => {
    if (brand) {
      setBusinessName(brand.businessName);
      setWordmarkUrl(brand.wordmarkUrl);
      setIconUrl(brand.iconUrl);
      setPrimaryColor(brand.primaryColor);
      setDarkColor(brand.darkColor);
    }
  }, [brand]);

  const canSubmit = businessName.trim() && wordmarkUrl && iconUrl && primaryColor.length === 7 && darkColor.length === 7;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const config: DemoBrandConfig = {
      businessName: businessName.trim(),
      portalTitle: "Signage Portal",
      primaryColor,
      darkColor,
      wordmarkUrl,
      iconUrl,
    };
    saveBrand(config);
    router.push("/");
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative z-10">
      <div className="w-full max-w-lg" style={{ animation: "slide-up 0.5s ease-out" }}>
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {brand ? "Edit Your Brand" : "Set Up Your Portal"}
          </h1>
          <p className="text-sm text-gray-400">
            {brand
              ? "Update your branding below."
              : "Configure your brand identity to see how the signage portal looks with your branding."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
          {/* Business name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary/15 focus:border-brand-primary outline-none transition"
              placeholder="e.g. Acme Construction"
              autoFocus
            />
          </div>

          {/* Logo uploads */}
          <div className="grid grid-cols-2 gap-4">
            <LogoUpload
              label="Icon Logo"
              hint="Square icon for header & favicon"
              value={iconUrl}
              onChange={setIconUrl}
            />
            <LogoUpload
              label="Wordmark Logo"
              hint="Text logo / full brand name"
              value={wordmarkUrl}
              onChange={setWordmarkUrl}
            />
          </div>

          {/* Colour pickers */}
          <div className="grid grid-cols-2 gap-4">
            <ColorPickerField
              label="Primary Colour"
              value={primaryColor}
              onChange={setPrimaryColor}
            />
            <ColorPickerField
              label="Dark / Header Colour"
              value={darkColor}
              onChange={setDarkColor}
            />
          </div>

          {/* Preview strip */}
          <div className="rounded-xl overflow-hidden border border-gray-100">
            <div className="h-2" style={{ background: primaryColor }} />
            <div className="flex items-center gap-3 px-4 py-3" style={{ background: darkColor }}>
              {iconUrl && <img src={iconUrl} alt="" className="h-6 w-6 object-contain" />}
              {wordmarkUrl && <img src={wordmarkUrl} alt="" className="h-4 object-contain brightness-0 invert" />}
              {!iconUrl && !wordmarkUrl && (
                <span className="text-white/60 text-sm">Header preview</span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full text-white py-3 rounded-xl font-medium transition disabled:opacity-50 active:scale-[0.98] shadow-sm"
            style={{
              background: canSubmit
                ? `linear-gradient(135deg, ${primaryColor} 0%, ${darkColor} 100%)`
                : undefined,
            }}
          >
            {brand ? "Save Changes" : "Launch Portal"}
          </button>
        </form>

        <p className="text-center text-[11px] text-gray-300 mt-6">
          Signage Portal Demo — Powered by Onesign
        </p>
      </div>
    </div>
  );
}
