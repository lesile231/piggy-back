import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import Link from "next/link";
import Image from "next/image";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { SpotRepository } from "@/services/tourism/spot.repository";
import { EventRepository } from "@/services/tourism/event.repository";
import { getDictionary } from "../../dictionaries";
import { localize } from "@/types/common";
import { googleMapsUrl, naverMapUrl, kakaoMapUrl } from "@/lib/map-links";
import { SectionLabel } from "@/components/ui/SectionLabel";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/spots/[id]">) {
  const { id } = await params;
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);
  const spot = await new SpotRepository(db).getById(id);
  if (!spot) return { title: "Not Found" };

  const locale = (await lang()) ?? "en";
  const name = localize(spot.names, locale) || spot.nameKo;
  return { title: `${name} | PiggyBack` };
}

export default async function SpotDetailPage({
  params,
}: PageProps<"/[lang]/spots/[id]">) {
  const { id } = await params;
  const locale = (await lang()) ?? "en";
  const dict = await getDictionary();
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);

  const spotRepo = new SpotRepository(db);
  const eventRepo = new EventRepository(db);

  const spot = await spotRepo.getById(id);
  if (!spot) notFound();

  const upcomingEvents =
    spot.latitude != null && spot.longitude != null
      ? await eventRepo.getNearbyUpcomingEvents(spot.latitude, spot.longitude, 3)
      : [];

  const name = localize(spot.names, locale) || spot.nameKo;
  const description = localize(spot.description, locale);
  const address = localize(spot.addresses, locale) || spot.addressKo;
  const hasCoords = spot.latitude != null && spot.longitude != null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Back navigation */}
      <Link
        href={`/${locale}/spots`}
        className="inline-flex items-center gap-1 text-sm text-[#6B8FA3] hover:text-[#0077B6]"
      >
        <span aria-hidden="true">&larr;</span> {dict.common.back}
      </Link>

      {/* Title */}
      <h1 className="mt-4 text-2xl font-bold leading-tight sm:text-3xl">
        {name}
      </h1>

      {/* Korean name — show to taxi driver */}
      {locale !== "ko" && (
        <div className="mt-2 rounded-lg border border-[rgba(0,119,182,0.15)] bg-[#EBF4FA] px-4 py-3">
          <p
            className="select-all text-2xl font-semibold tracking-wide sm:text-3xl"
            lang="ko"
          >
            {spot.nameKo}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {dict.place.showToDriver}
          </p>
        </div>
      )}

      {/* Hero image (16:9) */}
      {spot.images.length > 0 && spot.images[0] && (
        <div className="mt-4 relative aspect-[16/9] overflow-hidden rounded-xl bg-[#EBF4FA]">
          <Image
            src={spot.images[0]}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 672px) 100vw, 672px"
            priority
          />
        </div>
      )}

      {/* Rating */}
      {spot.rating && (
        <p className="mt-3 text-sm text-zinc-500">
          <span className="text-amber-500">&#9733;</span> {spot.rating.toFixed(1)}
        </p>
      )}

      {/* ── How to get there ── */}
      {hasCoords && (
        <section className="mt-6">
          <SectionLabel>{dict.place.directions}</SectionLabel>

          {address && (
            <p className="mt-2 text-sm text-[#1B3A4B]">
              {address}
            </p>
          )}
          {spot.addressKo && locale !== "ko" && (
            <p className="mt-1 select-all text-sm text-zinc-500" lang="ko">
              {spot.addressKo}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={googleMapsUrl(spot.latitude!, spot.longitude!, spot.nameKo)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50 hover:bg-[#EBF4FA]"
            >
              {dict.place.openInGoogleMaps}
            </a>
            <a
              href={naverMapUrl(spot.latitude!, spot.longitude!, spot.nameKo)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50 hover:bg-[#EBF4FA]"
            >
              {dict.place.openInNaverMap}
            </a>
            <a
              href={kakaoMapUrl(spot.latitude!, spot.longitude!)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50 hover:bg-[#EBF4FA]"
            >
              {dict.place.openInKakaoMap}
            </a>
          </div>
        </section>
      )}

      {/* ── Events here ── */}
      {upcomingEvents.length > 0 && (
        <section className="mt-8">
          <SectionLabel>{dict.place.relatedEvents}</SectionLabel>
          <ul className="mt-3 divide-y divide-[rgba(0,119,182,0.08)]">
            {upcomingEvents.map((event) => {
              const eventName = localize(event.names, locale) || event.nameKo;
              const startStr = event.startsAt.toLocaleDateString(locale, {
                month: "short",
                day: "numeric",
              });
              const endStr = event.endsAt.toLocaleDateString(locale, {
                month: "short",
                day: "numeric",
              });
              return (
                <li key={event.id}>
                  <Link
                    href={`/${locale}/events/${event.id}`}
                    className="flex items-center justify-between py-3 hover:bg-[#EBF4FA] -mx-2 px-2 rounded"
                  >
                    <span className="text-sm font-medium">{eventName}</span>
                    <span className="text-xs text-zinc-500 whitespace-nowrap ml-2">
                      {startStr}–{endStr}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── About this place ── */}
      {description && (
        <section className="mt-8">
          <SectionLabel>{dict.place.description}</SectionLabel>
          <p className="mt-3 text-sm leading-relaxed text-[#1B3A4B]">
            {description}
          </p>
        </section>
      )}

      {/* Contact info */}
      {(spot.phone || spot.website) && (
        <dl className="mt-6 space-y-2 border-t border-[rgba(0,119,182,0.08)] pt-4 text-sm">
          {spot.phone && (
            <div className="flex gap-2">
              <dt className="font-medium text-zinc-500">{dict.spots.phone}</dt>
              <dd>
                <a href={`tel:${spot.phone}`} className="hover:underline">
                  {spot.phone}
                </a>
              </dd>
            </div>
          )}
          {spot.website && (
            <div className="flex gap-2">
              <dt className="font-medium text-zinc-500">{dict.spots.website}</dt>
              <dd>
                <a
                  href={spot.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0077B6] hover:underline"
                >
                  {new URL(spot.website).hostname}
                </a>
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
