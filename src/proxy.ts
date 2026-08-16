import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOCALES = ["en", "ja", "zh", "ko", "es", "it", "fr", "de", "id", "th"];
const DEFAULT_LOCALE = "en";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const pathnameHasLocale = LOCALES.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );
  if (pathnameHasLocale) return;

  const acceptLang = request.headers.get("accept-language") ?? "";
  const detected = detectLocale(acceptLang);

  request.nextUrl.pathname = `/${detected}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

function detectLocale(acceptLanguage: string): string {
  const lower = acceptLanguage.toLowerCase();
  for (const locale of LOCALES) {
    if (lower.includes(locale)) return locale;
  }
  return DEFAULT_LOCALE;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|admin|start).*)",
  ],
};
