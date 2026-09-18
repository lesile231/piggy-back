import { lang } from "next/root-params";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { DealRepository } from "@/services/deal/deal.repository";
import { getDictionary } from "../dictionaries";
import { DealCard } from "@/components/user/DealCard";

export const revalidate = 3600;

export async function generateMetadata() {
  const dict = await getDictionary();
  return { title: dict.deals.title };
}

export default async function DealsPage() {
  const locale = (await lang()) ?? "en";
  const dict = await getDictionary();
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);
  const dealRepo = new DealRepository(db);

  const activeDeals = await dealRepo.getActive(30);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">{dict.deals.title}</h1>

      {activeDeals.length === 0 && (
        <p className="mt-8 text-center text-zinc-500">
          {dict.deals.noDeals}
        </p>
      )}

      {activeDeals.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeDeals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              locale={locale}
              dictDeals={dict.deals}
            />
          ))}
        </div>
      )}
    </div>
  );
}
