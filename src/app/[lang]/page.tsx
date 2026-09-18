import { lang } from "next/root-params";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { SpotRepository } from "@/services/tourism/spot.repository";
import { EventRepository } from "@/services/tourism/event.repository";
import { getDictionary } from "./dictionaries";
import { SpotCard } from "@/components/user/SpotCard";
import { EventCard } from "@/components/user/EventCard";
import { DecodeBoard } from "@/components/user/decode-board";
import Image from "next/image";
import Link from "next/link";
import logoImg from "../../../public/logo/via-busan-white.png";
import { Button } from "@/components/ui/Button";
import { MessengerCTA } from "@/components/user/MessengerCTA";

export async function generateMetadata() {
  const dict = await getDictionary();
  return {
    title: dict.home.title,
    description: dict.home.subtitle,
  };
}

/**
 * §3.1 wireframe — popular search chips.
 * 8 fixed, mixed-language labels to teach users
 * "you can type it however you heard it."
 * Server-injected, not dynamic.
 */
const POPULAR_CHIPS: { label: string; query: string }[] = [
  { label: "감천", query: "gamcheon" },
  { label: "Jagalchi", query: "jagalchi" },
  { label: "광안리", query: "gwangalli" },
  { label: "海雲台", query: "haeundae" },
  { label: "Taejongdae", query: "taejongdae" },
  { label: "BIFF広場", query: "biff square" },
  { label: "용두산", query: "yongdusan" },
  { label: "Songdo", query: "songdo" },
];

import heroBg from "../../../public/via-busan-main-bg.png";

const iconProps = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 28,
  height: 28,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "text-sky-600",
};

/** Thin-line SVG icons for the 4 category quick links. */
const QUICK_LINK_ICONS = [
  /* Spots — landmark */
  <svg key="spots" {...iconProps}>
    <path d="M3 22h18" />
    <path d="M6 18v-7a6 6 0 1 1 12 0v7" />
    <path d="M10 18v-4a2 2 0 1 1 4 0v4" />
  </svg>,
  /* Local Food — utensils */
  <svg key="food" {...iconProps}>
    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
    <path d="M7 2v20" />
    <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
  </svg>,
  /* Deals — ticket */
  <svg key="deals" {...iconProps}>
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    <path d="M13 5v2" />
    <path d="M13 17v2" />
    <path d="M13 11v2" />
  </svg>,
  /* Events — calendar */
  <svg key="events" {...iconProps}>
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
    <path d="M8 14h.01" />
    <path d="M12 14h.01" />
    <path d="M16 14h.01" />
    <path d="M8 18h.01" />
    <path d="M12 18h.01" />
    <path d="M16 18h.01" />
  </svg>,
];

export default async function HomePage() {
  const locale = (await lang()) ?? "en";
  const dict = await getDictionary();
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);

  const spotRepo = new SpotRepository(db);
  const eventRepo = new EventRepository(db);

  const [spots, foodSpots, events] = await Promise.all([
    spotRepo.searchByName("", 6),
    spotRepo.searchByCategory("food", 6),
    eventRepo.getActiveEvents({ date: new Date(), limit: 3 }),
  ]);

  const quickLinks = [
    { href: `/${locale}/spots`, label: dict.common.spots },
    { href: `/${locale}/food`, label: dict.home.localFood },
    { href: `/${locale}/deals`, label: dict.common.deals },
    { href: `/${locale}/events`, label: dict.common.events },
  ];

  return (
    <>
      {/* Hero section — full-bleed with background image */}
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden">
        {/* Background image */}
        <Image
          src={heroBg}
          alt="Busan beach panorama"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        {/* Light gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-white/60" />

        {/* Content */}
        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-4 py-16 text-center">
          <Image
            src={logoImg}
            alt="VIA BUSAN"
            className="h-28 w-auto sm:h-36"
            priority
          />

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-700 sm:text-sm">
            {dict.home.heroSubtitle}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900 sm:text-4xl lg:text-5xl">
            {dict.home.heroHeading}
          </h1>
          <p className="mt-3 max-w-xl text-base text-zinc-600 sm:text-lg">
            {dict.home.heroDescription}
          </p>

          {/* Decode Board */}
          <div className="mt-8 w-full">
            <DecodeBoard
              locale={locale}
              dict={dict.strip}
              popularChips={POPULAR_CHIPS}
            />
          </div>

          {/* Category quick links */}
          <div className="mt-8 grid grid-cols-4 gap-3 sm:gap-5">
            {quickLinks.map((link, i) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex flex-col items-center gap-2.5"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/60 shadow-sm backdrop-blur-sm transition-all group-hover:bg-white/90 group-hover:shadow-md sm:h-16 sm:w-16">
                  {QUICK_LINK_ICONS[i]}
                </span>
                <span className="text-xs font-medium text-zinc-700 sm:text-sm">
                  {link.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Below-the-fold content */}
      <div className="mx-auto max-w-5xl px-4 py-12">
        {/* Messenger CTA banner */}
        <MessengerCTA dict={dict.messenger} variant="banner" />

        {/* Popular spots */}
        {spots.length > 0 && (
          <section className="mt-16">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{dict.home.popularSpots}</h2>
              <Button variant="ghost" size="sm" asChild href={`/${locale}/spots`}>
                {dict.common.viewMore}
              </Button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {spots.map((spot) => (
                <SpotCard key={spot.id} spot={spot} locale={locale} />
              ))}
            </div>
          </section>
        )}

        {/* Local Food */}
        {foodSpots.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{dict.home.localFood}</h2>
              <Button variant="ghost" size="sm" asChild href={`/${locale}/food`}>
                {dict.common.viewMore}
              </Button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {foodSpots.map((spot) => (
                <SpotCard key={spot.id} spot={spot} locale={locale} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming events */}
        {events.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{dict.home.upcomingEvents}</h2>
              <Button variant="ghost" size="sm" asChild href={`/${locale}/events`}>
                {dict.common.viewMore}
              </Button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {events.map((event) => (
                <EventCard key={event.id} event={event} locale={locale} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
