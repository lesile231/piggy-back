import Link from "next/link";
import Image from "next/image";
import { localize } from "@/types/common";
import type { SpotRecord } from "@/services/tourism/types";

interface SpotCardProps {
  spot: SpotRecord;
  locale: string;
}

export function SpotCard({ spot, locale }: SpotCardProps) {
  const name = localize(spot.names, locale) || spot.nameKo;
  const firstImage = spot.images[0];

  return (
    <Link
      href={`/${locale}/spots/${spot.id}`}
      className="group block overflow-hidden rounded-lg border border-zinc-200 bg-white transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="relative aspect-[4/3] bg-zinc-100 dark:bg-zinc-900">
        {firstImage ? (
          <Image
            src={firstImage}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-400">
            No Image
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100">
          {name}
        </h3>
        {spot.rating && (
          <p className="mt-1 text-sm text-zinc-500">
            {spot.rating.toFixed(1)}
          </p>
        )}
      </div>
    </Link>
  );
}
