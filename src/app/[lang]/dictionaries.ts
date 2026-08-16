import { lang } from "next/root-params";
import { notFound } from "next/navigation";

const dictionaries = {
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  ja: () => import("./dictionaries/ja.json").then((m) => m.default),
  zh: () => import("./dictionaries/zh.json").then((m) => m.default),
  ko: () => import("./dictionaries/ko.json").then((m) => m.default),
  es: () => import("./dictionaries/es.json").then((m) => m.default),
  it: () => import("./dictionaries/it.json").then((m) => m.default),
  fr: () => import("./dictionaries/fr.json").then((m) => m.default),
  de: () => import("./dictionaries/de.json").then((m) => m.default),
  id: () => import("./dictionaries/id.json").then((m) => m.default),
  th: () => import("./dictionaries/th.json").then((m) => m.default),
};

export type Locale = keyof typeof dictionaries;

export const LOCALES: Locale[] = ["en", "ja", "zh", "ko", "es", "it", "fr", "de", "id", "th"];

export const hasLocale = (locale: string | undefined): locale is Locale =>
  typeof locale === "string" && locale in dictionaries;

export type Dictionary = Awaited<ReturnType<(typeof dictionaries)["en"]>>;

export const getDictionary = async (): Promise<Dictionary> => {
  const locale = await lang();
  if (!hasLocale(locale)) notFound();
  return dictionaries[locale]();
};
