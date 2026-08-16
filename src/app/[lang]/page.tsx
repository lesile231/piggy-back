import { lang } from "next/root-params";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { SpotRepository } from "@/services/tourism/spot.repository";
import { EventRepository } from "@/services/tourism/event.repository";
import { getDictionary } from "./dictionaries";
import { SpotCard } from "@/components/user/SpotCard";
import { EventCard } from "@/components/user/EventCard";
import { DecodeBoard } from "@/components/user/decode-board";
import { Button } from "@/components/ui/Button";

export async function generateMetadata() {
  const dict = await getDictionary();
  return {
    title: `${dict.home.title} | VIA BUSAN`,
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

export default async function HomePage() {
  const locale = (await lang()) ?? "en";
  const dict = await getDictionary();
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);

  const spotRepo = new SpotRepository(db);
  const eventRepo = new EventRepository(db);

  const [spots, events] = await Promise.all([
    spotRepo.searchByName("", 6),
    eventRepo.getActiveEvents({ date: new Date(), limit: 3 }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {/* §3.1 Hero */}
      <section className="flex flex-col items-center text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          VIA BUSAN
        </h1>
        <p className="mt-3 text-lg text-[#6B8FA3]">
          {dict.strip.tagline}
        </p>

        {/* Decode Board — replaces TransshipmentStrip */}
        <div className="mt-8 w-full">
          <DecodeBoard
            locale={locale}
            dict={dict.strip}
            popularChips={POPULAR_CHIPS}
          />
        </div>
      </section>

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
  );
}
