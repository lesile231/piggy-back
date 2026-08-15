import { lang } from "next/root-params";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { SpotRepository } from "@/services/tourism/spot.repository";
import { getDictionary } from "../dictionaries";
import { SpotCard } from "@/components/user/SpotCard";
import { TransshipmentStrip } from "@/components/user/TransshipmentStrip";
import { CategoryFilter } from "@/components/user/CategoryFilter";

const POPULAR_CHIPS: { label: string; query: string }[] = [
  { label: "감천", query: "gamcheon" },
  { label: "Jagalchi", query: "jagalchi" },
  { label: "광안리", query: "gwangalli" },
  { label: "海雲台", query: "haeundae" },
  { label: "Taejongdae", query: "taejongdae" },
  { label: "BIFF広場", query: "biff square" },
  { label: "용두산", query: "yongdusan" },
  { label: "Songdo", query: "songdo" },
];

const SPOT_CATEGORIES = [
  { slug: "nature", label: "Nature" },
  { slug: "culture", label: "Culture" },
  { slug: "food", label: "Food" },
  { slug: "shopping", label: "Shopping" },
];

export async function generateMetadata() {
  const dict = await getDictionary();
  return { title: `${dict.spots.title} | PiggyBack` };
}

export default async function SpotsPage({
  searchParams,
}: PageProps<"/[lang]/spots">) {
  const locale = (await lang()) ?? "en";
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const category = typeof params.category === "string" ? params.category : "";

  const dict = await getDictionary();
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);
  const spotRepo = new SpotRepository(db);

  const spots = query
    ? await spotRepo.searchByName(query, 20)
    : category
      ? await spotRepo.searchByCategory(category, 20)
      : await spotRepo.searchByName("", 20);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">{dict.spots.title}</h1>
      <div className="mt-4">
        <TransshipmentStrip locale={locale} dict={dict.strip} popularChips={POPULAR_CHIPS} />
      </div>
      <div className="mt-4">
        <CategoryFilter
          categories={SPOT_CATEGORIES}
          current={category || undefined}
          basePath={`/${locale}/spots`}
          allLabel={dict.spots.allCategories}
        />
      </div>
      {spots.length === 0 ? (
        <p className="mt-8 text-center text-zinc-500">{dict.common.noResults}</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spots.map((spot) => (
            <SpotCard key={spot.id} spot={spot} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
