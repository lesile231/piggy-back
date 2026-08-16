"use client";

import { useState } from "react";

const LOCALES = ["ko", "en", "ja", "zh", "es", "fr", "de", "it", "id", "th"] as const;
const LOCALE_LABELS: Record<string, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "中文",
  es: "Espanol",
  fr: "Francais",
  de: "Deutsch",
  it: "Italiano",
  id: "Indonesia",
  th: "ไทย",
};

interface LocalizedInputProps {
  name: string; // base name, e.g. "name" → hidden inputs "name.ko", "name.en", etc.
  label: string;
  defaultValues?: Record<string, string>;
  multiline?: boolean;
}

export function LocalizedInput({
  name,
  label,
  defaultValues = {},
  multiline = false,
}: LocalizedInputProps) {
  const [activeTab, setActiveTab] = useState<string>("ko");

  return (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      <p className="mt-0.5 text-xs text-zinc-400">
        한국어만 입력해도 저장 시 나머지 언어가 자동 번역됩니다.
      </p>
      <div className="mt-1 flex gap-1 border-b border-zinc-200">
        {LOCALES.map((locale) => (
          <button
            key={locale}
            type="button"
            onClick={() => setActiveTab(locale)}
            className={`px-3 py-1 text-xs ${
              activeTab === locale
                ? "border-b-2 border-blue-600 font-medium text-blue-600"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {LOCALE_LABELS[locale]}
          </button>
        ))}
      </div>
      {LOCALES.map((locale) => (
        <div
          key={locale}
          className={activeTab === locale ? "mt-2" : "hidden"}
        >
          {multiline ? (
            <textarea
              name={`${name}.${locale}`}
              defaultValue={defaultValues[locale] ?? ""}
              rows={3}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          ) : (
            <input
              type="text"
              name={`${name}.${locale}`}
              defaultValue={defaultValues[locale] ?? ""}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          )}
        </div>
      ))}
    </div>
  );
}
