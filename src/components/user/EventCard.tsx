import Link from "next/link";
import Image from "next/image";
import { localize } from "@/types/common";
import type { EventRecord } from "@/services/tourism/types";

interface EventCardProps {
  event: EventRecord;
  locale: string;
}

function getEventStatus(event: EventRecord): "ongoing" | "upcoming" | "ended" {
  const now = new Date();
  if (now < event.startsAt) return "upcoming";
  if (now > event.endsAt) return "ended";
  return "ongoing";
}

export function EventCard({ event, locale }: EventCardProps) {
  const name = localize(event.names, locale) || event.nameKo;
  const venue = localize(event.venueName, locale);
  const status = getEventStatus(event);
  const firstImage = event.images[0];

  const statusColors = {
    ongoing: "bg-green-100 text-green-800",
    upcoming: "bg-blue-100 text-blue-800",
    ended: "bg-zinc-100 text-zinc-600",
  };

  const statusLabels: Record<string, Record<string, string>> = {
    ongoing: { en: "Ongoing", ja: "開催中", zh: "进行中", ko: "진행 중" },
    upcoming: { en: "Upcoming", ja: "開催予定", zh: "即将开始", ko: "예정" },
    ended: { en: "Ended", ja: "終了", zh: "已结束", ko: "종료" },
  };

  return (
    <Link
      href={`/${locale}/events/${event.id}`}
      className="group block overflow-hidden rounded-lg border border-zinc-200 bg-white transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="relative aspect-[16/9] bg-zinc-100 dark:bg-zinc-900">
        {firstImage ? (
          <Image
            src={firstImage}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-400">
            No Image
          </div>
        )}
        <span
          className={`absolute right-2 top-2 rounded px-2 py-0.5 text-xs font-medium ${statusColors[status]}`}
        >
          {statusLabels[status]?.[locale] ?? statusLabels[status]?.en}
        </span>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100">
          {name}
        </h3>
        {venue && <p className="mt-1 text-sm text-zinc-500">{venue}</p>}
        <p className="mt-1 text-xs text-zinc-400">
          {event.startsAt.toLocaleDateString(locale)} –{" "}
          {event.endsAt.toLocaleDateString(locale)}
        </p>
      </div>
    </Link>
  );
}
