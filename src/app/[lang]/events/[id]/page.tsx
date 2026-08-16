import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import Link from "next/link";
import Image from "next/image";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { EventRepository } from "@/services/tourism/event.repository";
import { getDictionary } from "../../dictionaries";
import { localize } from "@/types/common";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/events/[id]">) {
  const { id } = await params;
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);
  const event = await new EventRepository(db).getById(id);
  if (!event) return { title: "Not Found" };

  const locale = (await lang()) ?? "en";
  const name = localize(event.names, locale) || event.nameKo;
  return { title: `${name} | VIA BUSAN` };
}

export default async function EventDetailPage({
  params,
}: PageProps<"/[lang]/events/[id]">) {
  const { id } = await params;
  const locale = (await lang()) ?? "en";
  const dict = await getDictionary();
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);
  const event = await new EventRepository(db).getById(id);

  if (!event) notFound();

  const name = localize(event.names, locale) || event.nameKo;
  const description = localize(event.description, locale);
  const venue = localize(event.venueName, locale);
  const priceInfo = localize(event.priceInfo, locale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href={`/${locale}/events`}
        className="text-sm text-blue-600 hover:underline"
      >
        &larr; {dict.common.back}
      </Link>

      {event.images[0] && (
        <div className="relative mt-4 aspect-[16/9] overflow-hidden rounded-lg bg-zinc-100">
          <Image src={event.images[0]} alt={name} fill className="object-cover" sizes="100vw" />
        </div>
      )}

      <h1 className="mt-6 text-3xl font-bold">{name}</h1>

      {description && <p className="mt-4 text-[#1B3A4B]">{description}</p>}

      <dl className="mt-6 space-y-2 text-sm">
        <div>
          <dt className="font-medium text-zinc-500">{dict.events.period}</dt>
          <dd>
            {event.startsAt.toLocaleDateString(locale)} –{" "}
            {event.endsAt.toLocaleDateString(locale)}
          </dd>
        </div>
        {venue && (
          <div>
            <dt className="font-medium text-zinc-500">{dict.events.venue}</dt>
            <dd>{venue}</dd>
          </div>
        )}
        {priceInfo && (
          <div>
            <dt className="font-medium text-zinc-500">{dict.events.price}</dt>
            <dd>{priceInfo}</dd>
          </div>
        )}
      </dl>

      {event.bookingUrl && (
        <a
          href={event.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {dict.events.bookNow}
        </a>
      )}
    </div>
  );
}
