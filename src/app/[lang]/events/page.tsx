import { lang } from "next/root-params";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { EventRepository } from "@/services/tourism/event.repository";
import { getDictionary } from "../dictionaries";
import { EventCard } from "@/components/user/EventCard";

export async function generateMetadata() {
  const dict = await getDictionary();
  return { title: `${dict.events.title} | PiggyBack` };
}

export default async function EventsPage({
  searchParams,
}: PageProps<"/[lang]/events">) {
  const locale = await lang();
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : undefined;

  const dict = await getDictionary();
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);
  const eventRepo = new EventRepository(db);

  const events = await eventRepo.getActiveEvents({
    date: new Date(),
    category,
    limit: 20,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">{dict.events.title}</h1>
      {events.length === 0 ? (
        <p className="mt-8 text-center text-zinc-500">{dict.common.noResults}</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
