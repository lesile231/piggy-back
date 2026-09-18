import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import Link from "next/link";
import Image from "next/image";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { EventRepository } from "@/services/tourism/event.repository";
import { getDictionary, LOCALES } from "../../dictionaries";
import { localize } from "@/types/common";
import { MessengerCTA } from "@/components/user/MessengerCTA";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/events/[id]">): Promise<Metadata> {
  const { id } = await params;
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);
  const event = await new EventRepository(db).getById(id);
  if (!event) return { title: "Not Found" };

  const locale = (await lang()) ?? "en";
  const name = localize(event.names, locale) || event.nameKo;
  const description = localize(event.description, locale) || "";
  const image = event.images[0] ?? "/og-default.png";

  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l] = `${APP_URL}/${l}/events/${id}`;
  }

  return {
    title: name,
    description: description.slice(0, 160),
    openGraph: {
      title: name,
      description: description.slice(0, 160),
      images: [{ url: image, width: 1200, height: 630, alt: name }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: name,
      description: description.slice(0, 160),
      images: [image],
    },
    alternates: {
      canonical: `${APP_URL}/${locale}/events/${id}`,
      languages,
    },
  };
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name,
    description: description || undefined,
    image: event.images[0] || undefined,
    startDate: event.startsAt.toISOString(),
    endDate: event.endsAt.toISOString(),
    location:
      event.latitude != null && event.longitude != null
        ? {
            "@type": "Place",
            name: venue || event.nameKo,
            address: event.addressKo
              ? {
                  "@type": "PostalAddress",
                  streetAddress: event.addressKo,
                  addressLocality: "Busan",
                  addressCountry: "KR",
                }
              : undefined,
            geo: {
              "@type": "GeoCoordinates",
              latitude: event.latitude,
              longitude: event.longitude,
            },
          }
        : undefined,
    ...(event.bookingUrl
      ? {
          offers: {
            "@type": "Offer",
            url: event.bookingUrl,
          },
        }
      : {}),
    organizer: {
      "@type": "Organization",
      name: "VIA BUSAN",
    },
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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

      {/* Messenger CTA */}
      <MessengerCTA dict={dict.messenger} variant="inline" />
    </div>
  );
}
