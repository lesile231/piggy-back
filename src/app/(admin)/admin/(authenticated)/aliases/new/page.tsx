import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { tourismSpots } from "@/lib/db/schema";
import { AliasForm } from "@/components/admin/AliasForm";
import { createAliasAction } from "@/actions/alias.actions";

export const dynamic = "force-dynamic";

export default async function NewAliasPage({
  searchParams,
}: {
  searchParams: Promise<{ alias?: string; language?: string }>;
}) {
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);
  const params = await searchParams;

  const spots = await db
    .select({ id: tourismSpots.id, nameKo: tourismSpots.nameKo })
    .from(tourismSpots)
    .orderBy(tourismSpots.nameKo);

  return (
    <div>
      <h1 className="text-2xl font-bold">검색어 등록</h1>
      <div className="mt-6">
        <AliasForm
          action={createAliasAction}
          spots={spots}
          defaultValues={{
            alias: params.alias,
            language: params.language,
          }}
        />
      </div>
    </div>
  );
}
