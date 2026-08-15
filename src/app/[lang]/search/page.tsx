import { lang } from "next/root-params";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { SpotRepository } from "@/services/tourism/spot.repository";
import { getDictionary } from "../dictionaries";
import { SpotCard } from "@/components/user/SpotCard";
import { SearchInput } from "@/components/user/SearchInput";

export async function generateMetadata() {
  const dict = await getDictionary();
  return { title: `${dict.search.title} | PiggyBack` };
}

export default async function SearchPage({
  searchParams,
}: PageProps<"/[lang]/search">) {
  const locale = (await lang()) ?? "en";
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const dict = await getDictionary();

  const env = getEnv();
  const db = createDb(env.DATABASE_URL);
  const spotRepo = new SpotRepository(db);

  const spots = query ? await spotRepo.searchByName(query, 10) : [];
  // TODO[MVP]: Add EventRepository name search when method is available

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">{dict.search.title}</h1>
      <div className="mt-4">
        <SearchInput
          placeholder={dict.search.placeholder}
          action={`/${locale}/search`}
          defaultValue={query}
        />
      </div>

      {query && spots.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">{dict.search.spotsSection}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {spots.map((spot) => (
              <SpotCard key={spot.id} spot={spot} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {query && spots.length === 0 && (
        <p className="mt-8 text-center text-zinc-500">
          {dict.common.noResults}
        </p>
      )}
    </div>
  );
}
