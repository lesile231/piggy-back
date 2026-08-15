import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import Link from "next/link";
import Image from "next/image";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { SpotRepository } from "@/services/tourism/spot.repository";
import { getDictionary } from "../../dictionaries";
import { localize } from "@/types/common";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/spots/[id]">) {
  const { id } = await params;
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);
  const spot = await new SpotRepository(db).getById(id);
  if (!spot) return { title: "Not Found" };

  const locale = await lang();
  const name = localize(spot.names, locale) || spot.nameKo;
  return { title: `${name} | PiggyBack` };
}

export default async function SpotDetailPage({
  params,
}: PageProps<"/[lang]/spots/[id]">) {
  const { id } = await params;
  const locale = await lang();
  const dict = await getDictionary();
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);
  const spot = await new SpotRepository(db).getById(id);

  if (!spot) notFound();

  const name = localize(spot.names, locale) || spot.nameKo;
  const description = localize(spot.description, locale);
  const address = localize(spot.addresses, locale) || spot.addressKo;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href={`/${locale}/spots`}
        className="text-sm text-blue-600 hover:underline"
      >
        &larr; {dict.common.back}
      </Link>

      {spot.images.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {spot.images.slice(0, 4).map((img, i) => (
            <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-zinc-100">
              <Image src={img} alt={`${name} ${i + 1}`} fill className="object-cover" sizes="50vw" />
            </div>
          ))}
        </div>
      )}

      <h1 className="mt-6 text-3xl font-bold">{name}</h1>

      {spot.rating && (
        <p className="mt-2 text-sm text-zinc-500">
          {dict.spots.rating}: {spot.rating.toFixed(1)}
        </p>
      )}

      {description && <p className="mt-4 text-zinc-700 dark:text-zinc-300">{description}</p>}

      <dl className="mt-6 space-y-2 text-sm">
        {address && (
          <div>
            <dt className="font-medium text-zinc-500">{dict.spots.address}</dt>
            <dd>{address}</dd>
          </div>
        )}
        {spot.phone && (
          <div>
            <dt className="font-medium text-zinc-500">{dict.spots.phone}</dt>
            <dd>{spot.phone}</dd>
          </div>
        )}
        {spot.website && (
          <div>
            <dt className="font-medium text-zinc-500">{dict.spots.website}</dt>
            <dd>
              <a
                href={spot.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {spot.website}
              </a>
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
