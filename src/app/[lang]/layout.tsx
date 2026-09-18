import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/user/Header";
import { Footer } from "@/components/user/Footer";
import { getDictionary, hasLocale, LOCALES } from "./dictionaries";
import { notFound } from "next/navigation";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang: locale } = await params;

  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l] = `${APP_URL}/${l}`;
  }

  return {
    metadataBase: new URL(APP_URL),
    title: {
      template: "%s | VIA BUSAN",
      default: "VIA BUSAN – Discover Busan",
    },
    description: "Your complete guide to Busan travel",
    openGraph: {
      siteName: "VIA BUSAN",
      locale,
      type: "website",
      images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "VIA BUSAN" }],
    },
    twitter: {
      card: "summary_large_image",
    },
    alternates: {
      canonical: `${APP_URL}/${locale}`,
      languages,
    },
  };
}

export default async function LangLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang: locale } = await params;
  if (!hasLocale(locale)) notFound();

  const dict = await getDictionary();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header dict={dict} locale={locale} />
        <main className="flex-1">{children}</main>
        <Footer dict={dict} />
      </body>
    </html>
  );
}
