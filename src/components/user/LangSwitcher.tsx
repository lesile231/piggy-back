"use client";

import { usePathname } from "next/navigation";

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  ja: "日本語",
  zh: "中文",
  ko: "한국어",
  es: "Espanol",
  it: "Italiano",
  fr: "Francais",
  de: "Deutsch",
  id: "Indonesia",
  th: "ไทย",
};

const LOCALES = ["en", "ko", "ja", "zh", "es", "fr", "de", "it", "id", "th"] as const;

export function LangSwitcher({ currentLocale }: { currentLocale: string }) {
  const pathname = usePathname();

  function buildLocalePath(newLocale: string): string {
    const segments = pathname.split("/");
    segments[1] = newLocale;
    return segments.join("/");
  }

  return (
    <select
      value={currentLocale}
      onChange={(e) => {
        window.location.href = buildLocalePath(e.target.value);
      }}
      className="rounded border border-[rgba(0,119,182,0.2)] bg-white px-2 py-1 text-sm text-[#1B3A4B]"
    >
      {LOCALES.map((locale) => (
        <option key={locale} value={locale}>
          {LOCALE_LABELS[locale]}
        </option>
      ))}
    </select>
  );
}
