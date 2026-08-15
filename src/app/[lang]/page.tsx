import { lang } from "next/root-params";
import Link from "next/link";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { SpotRepository } from "@/services/tourism/spot.repository";
import { EventRepository } from "@/services/tourism/event.repository";
import { getDictionary } from "./dictionaries";
import { SpotCard } from "@/components/user/SpotCard";
import { EventCard } from "@/components/user/EventCard";
import { SearchInput } from "@/components/user/SearchInput";

export async function generateMetadata() {
  const dict = await getDictionary();
  return {
    title: `${dict.home.title} | PiggyBack`,
    description: dict.home.subtitle,
  };
}

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
      <section className="text-center">
        <h1 className="text-4xl font-bold">{dict.home.title}</h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
          {dict.home.subtitle}
        </p>
        <div className="mt-6 flex justify-center">
          <SearchInput
            placeholder={dict.search.placeholder}
            action={`/${locale}/search`}
          />
        </div>
      </section>

      {spots.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{dict.home.popularSpots}</h2>
            <Link
              href={`/${locale}/spots`}
              className="text-sm text-blue-600 hover:underline"
            >
              {dict.common.viewMore}
            </Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {spots.map((spot) => (
              <SpotCard key={spot.id} spot={spot} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{dict.home.upcomingEvents}</h2>
            <Link
              href={`/${locale}/events`}
              className="text-sm text-blue-600 hover:underline"
            >
              {dict.common.viewMore}
            </Link>
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
