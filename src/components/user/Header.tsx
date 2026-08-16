"use client";

import { useState } from "react";
import Link from "next/link";
import { LangSwitcher } from "./LangSwitcher";
import type { Dictionary } from "@/app/[lang]/dictionaries";

interface HeaderProps {
  dict: Dictionary;
  locale: string;
}

export function Header({ dict, locale }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href={`/${locale}`} className="text-lg font-bold">
          PiggyBack
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 sm:flex">
          <Link
            href={`/${locale}/spots`}
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            {dict.common.spots}
          </Link>
          <Link
            href={`/${locale}/events`}
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            {dict.common.events}
          </Link>
          <Link
            href={`/${locale}/spots`}
            className="text-zinc-600 hover:text-zinc-900"
            aria-label="Search"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </Link>
          <LangSwitcher currentLocale={locale} />
        </nav>

        {/* Mobile nav icons */}
        <div className="flex items-center gap-4 sm:hidden">
          <Link
            href={`/${locale}/spots`}
            className="text-zinc-600 hover:text-zinc-900"
            aria-label="Search"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="text-zinc-600 hover:text-zinc-900"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="absolute left-0 right-0 top-14 z-50 border-b border-zinc-200 bg-white shadow-md sm:hidden">
          <nav className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3">
            <Link
              href={`/${locale}/spots`}
              onClick={() => setMenuOpen(false)}
              className="rounded px-2 py-2 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            >
              {dict.common.spots}
            </Link>
            <Link
              href={`/${locale}/events`}
              onClick={() => setMenuOpen(false)}
              className="rounded px-2 py-2 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            >
              {dict.common.events}
            </Link>
            <div className="px-2 py-2">
              <LangSwitcher currentLocale={locale} />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
