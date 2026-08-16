import Link from "next/link";
import Image from "next/image";
import { localize } from "@/types/common";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { EventRecord } from "@/services/tourism/types";

interface EventCardProps {
  event: EventRecord;
  locale: string;
  featured?: boolean;
}

function getEventStatus(event: EventRecord): "ongoing" | "upcoming" | "ended" {
  const now = new Date();
  if (now < event.startsAt) return "upcoming";
  if (now > event.endsAt) return "ended";
  return "ongoing";
}

/**
 * §3.3 Event card with editorial magazine grid style.
 * - featured = true: large hero card with image overlay text
 * - featured = false: standard card
 * - No-image fallback: §5.3 typography card (event name as display font)
 */
export function EventCard({ event, locale, featured = false }: EventCardProps) {
  const name = localize(event.names, locale) || event.nameKo;
  const venue = localize(event.venueName, locale);
  const status = getEventStatus(event);
  const firstImage = event.images[0];

  const statusBadgeVariant = {
    ongoing: "success" as const,
    upcoming: "info" as const,
    ended: "neutral" as const,
  };

  const statusLabels: Record<string, Record<string, string>> = {
    ongoing: { en: "Ongoing", ja: "開催中", zh: "进行中", ko: "진행 중" },
    upcoming: { en: "Upcoming", ja: "開催予定", zh: "即将开始", ko: "예정" },
    ended: { en: "Ended", ja: "終了", zh: "已结束", ko: "종료" },
  };

  const dateRange = `${event.startsAt.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  })}–${event.endsAt.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  })}`;

  if (featured) {
    return (
      <Link
        href={`/${locale}/events/${event.id}`}
        className="group block overflow-hidden rounded-xl"
      >
        <div
          className={`relative ${firstImage ? "aspect-[16/9]" : "aspect-[16/9]"} overflow-hidden rounded-xl`}
        >
          {firstImage ? (
            <>
              <Image
                src={firstImage}
                alt={name}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 768px"
                priority
              />
              {/* Gradient overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            </>
          ) : (
            <TypographyFallback name={name} nameKo={event.nameKo} />
          )}

          {/* Overlay content */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <Badge variant={statusBadgeVariant[status]}>
              {statusLabels[status]?.[locale] ?? statusLabels[status]?.en}
            </Badge>
            <h3 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              {name}
            </h3>
            <p className="mt-1 text-sm text-white/80">
              {dateRange}
              {venue && ` · ${venue}`}
            </p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/${locale}/events/${event.id}`}
      className="group block"
    >
      <Card>
        <div className="relative aspect-[16/9] overflow-hidden bg-[#EBF4FA]">
          {firstImage ? (
            <Image
              src={firstImage}
              alt={name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : (
            <TypographyFallback name={name} nameKo={event.nameKo} />
          )}
          <Badge variant={statusBadgeVariant[status]} className="absolute right-2 top-2">
            {statusLabels[status]?.[locale] ?? statusLabels[status]?.en}
          </Badge>
        </div>
        <div className="p-3">
          <h3 className="font-medium text-[#1B3A4B] group-hover:text-[#0077B6]">
            {name}
          </h3>
          {venue && <p className="mt-1 text-sm text-zinc-500">{venue}</p>}
          <p className="mt-1 text-xs text-zinc-400">{dateRange}</p>
        </div>
      </Card>
    </Link>
  );
}

/**
 * §5.3 Typography fallback card.
 * No grey placeholder — display event name in large, bold font.
 */
function TypographyFallback({
  name,
  nameKo,
}: {
  name: string;
  nameKo: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-zinc-900 p-6 text-center">
      <p className="text-2xl font-extrabold leading-tight text-white sm:text-3xl">
        {name}
      </p>
      {name !== nameKo && (
        <p className="mt-2 text-lg font-semibold text-zinc-400" lang="ko">
          {nameKo}
        </p>
      )}
    </div>
  );
}
