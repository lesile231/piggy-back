import Link from "next/link";
import { LangSwitcher } from "./LangSwitcher";
import type { Dictionary } from "@/app/[lang]/dictionaries";

interface HeaderProps {
  dict: Dictionary;
  locale: string;
}

export function Header({ dict, locale }: HeaderProps) {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href={`/${locale}`} className="text-lg font-bold">
          PiggyBack
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href={`/${locale}/spots`}
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {dict.common.spots}
          </Link>
          <Link
            href={`/${locale}/events`}
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {dict.common.events}
          </Link>
          <LangSwitcher currentLocale={locale} />
        </nav>
      </div>
    </header>
  );
}
