import { lang } from "next/root-params";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { SpotRepository } from "@/services/tourism/spot.repository";
import { getDictionary } from "../../dictionaries";
import { localize } from "@/types/common";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";

/** Static food category metadata (tag used for DB query + display info). */
const FOOD_META: Record<string, {
  tag: string;
  names: Record<string, string>;
}> = {
  "dwaeji-gukbap": {
    tag: "dwaeji-gukbap",
    names: { ko: "돼지국밥", en: "Dwaeji-gukbap", ja: "テジクッパ", zh: "猪肉汤饭" },
  },
  milmyeon: {
    tag: "milmyeon",
    names: { ko: "밀면", en: "Milmyeon", ja: "ミルミョン", zh: "小麦冷面" },
  },
  "raw-fish": {
    tag: "raw-fish",
    names: { ko: "회 / 해산물", en: "Raw Fish & Seafood", ja: "刺身・海鮮", zh: "生鱼片/海鲜" },
  },
  eomuk: {
    tag: "eomuk",
    names: { ko: "어묵", en: "Fish Cake (Eomuk)", ja: "かまぼこ", zh: "鱼糕" },
  },
  "ssiat-hotteok": {
    tag: "ssiat-hotteok",
    names: { ko: "씨앗호떡", en: "Ssiat-hotteok", ja: "シアッホットク", zh: "种子糖饼" },
  },
};

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/food/[slug]">) {
  const { slug } = await params;
  const meta = FOOD_META[slug];
  if (!meta) return { title: "Not Found" };
  const locale = (await lang()) ?? "en";
  const name = meta.names[locale] ?? meta.names.en;
  return { title: name };
}

export default async function FoodDetailPage({
  params,
}: PageProps<"/[lang]/food/[slug]">) {
  const { slug } = await params;
  const meta = FOOD_META[slug];
  if (!meta) notFound();

  const locale = (await lang()) ?? "en";
  const dict = await getDictionary();
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);
  const spotRepo = new SpotRepository(db);

  const spots = await spotRepo.searchByCategory(meta.tag, 10);
  const name = meta.names[locale] ?? meta.names.en;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Back link */}
      <Link
        href={`/${locale}/food`}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        {dict.common.back}
      </Link>

      <h1 className="mt-4 text-2xl font-bold">{name}</h1>

      {spots.length === 0 ? (
        <p className="mt-8 text-center text-zinc-500">{dict.common.noResults}</p>
      ) : (
        <ul className="mt-6 divide-y divide-zinc-100">
          {spots.map((spot) => {
            const spotName = localize(spot.names, locale) ?? spot.nameKo;
            const spotAddr = spot.addresses
              ? (localize(spot.addresses, locale) ?? spot.addressKo)
              : spot.addressKo;

            return (
              <li key={spot.id}>
                <Link
                  href={`/${locale}/spots/${spot.id}`}
                  className="flex items-start gap-4 py-4 transition-colors hover:bg-zinc-50 -mx-3 px-3 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900">{spotName}</p>
                    {spotAddr && (
                      <p className="mt-0.5 text-sm text-zinc-500 truncate">{spotAddr}</p>
                    )}
                  </div>
                  {spot.rating && (
                    <span className="shrink-0 flex items-center gap-1 text-sm text-amber-600">
                      <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                      {spot.rating.toFixed(1)}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
