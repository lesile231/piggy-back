import { lang } from "next/root-params";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { EventRepository } from "@/services/tourism/event.repository";
import { getDictionary } from "../dictionaries";
import { EventCard } from "@/components/user/EventCard";
import { SectionLabel } from "@/components/ui/SectionLabel";

/**
 * §8: ISR — revalidate every 1 hour for events.
 */
export const revalidate = 3600;

export async function generateMetadata() {
  const dict = await getDictionary();
  return { title: `${dict.events.title} | VIA BUSAN` };
}

/**
 * §3.3 `/events` — editorial magazine grid.
 *
 * Layout:
 * - "Happening now": featured hero (first ongoing event) + remaining ongoing in grid
 * - "Coming up": 2-column grid of future events
 * - No past events displayed
 */
export default async function EventsPage() {
  const locale = (await lang()) ?? "en";
  const dict = await getDictionary();
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);
  const eventRepo = new EventRepository(db);

  const [ongoingEvents, upcomingEvents] = await Promise.all([
    eventRepo.getOngoingEvents(10),
    eventRepo.getUpcomingEvents(10),
  ]);

  const hasContent = ongoingEvents.length > 0 || upcomingEvents.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">{dict.events.title}</h1>

      {!hasContent && (
        <p className="mt-8 text-center text-zinc-500">
          {dict.common.noResults}
        </p>
      )}

      {/* ── Happening now ── */}
      {ongoingEvents.length > 0 && (
        <section className="mt-8">
          <SectionLabel>
            {dict.events.ongoing}
          </SectionLabel>

          {/* Featured: first ongoing event as hero */}
          {ongoingEvents[0] && (
            <div className="mt-4">
              <EventCard
                event={ongoingEvents[0]}
                locale={locale}
                featured
              />
            </div>
          )}

          {/* Remaining ongoing events */}
          {ongoingEvents.length > 1 && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {ongoingEvents.slice(1).map((event) => (
                <EventCard key={event.id} event={event} locale={locale} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Coming up ── */}
      {upcomingEvents.length > 0 && (
        <section className="mt-10">
          <SectionLabel>
            {dict.events.upcoming}
          </SectionLabel>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
