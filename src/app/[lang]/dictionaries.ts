import { lang } from "next/root-params";
import { notFound } from "next/navigation";

const dictionaries = {
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  ja: () => import("./dictionaries/ja.json").then((m) => m.default),
  zh: () => import("./dictionaries/zh.json").then((m) => m.default),
  ko: () => import("./dictionaries/ko.json").then((m) => m.default),
};

export type Locale = keyof typeof dictionaries;

export const LOCALES: Locale[] = ["en", "ja", "zh", "ko"];

export const hasLocale = (locale: string): locale is Locale =>
  locale in dictionaries;

export type Dictionary = Awaited<ReturnType<(typeof dictionaries)["en"]>>;

export const getDictionary = async (): Promise<Dictionary> => {
  const locale = await lang();
  if (!hasLocale(locale)) notFound();
  return dictionaries[locale]();
};
