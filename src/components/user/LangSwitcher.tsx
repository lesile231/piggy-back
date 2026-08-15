"use client";

import { usePathname } from "next/navigation";

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  ja: "日本語",
  zh: "中文",
  ko: "한국어",
};

const LOCALES = ["en", "ja", "zh", "ko"] as const;

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
      className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      {LOCALES.map((locale) => (
        <option key={locale} value={locale}>
          {LOCALE_LABELS[locale]}
        </option>
      ))}
    </select>
  );
}
