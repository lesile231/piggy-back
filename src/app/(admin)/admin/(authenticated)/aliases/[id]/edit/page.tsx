import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { locationAliases, tourismSpots } from "@/lib/db/schema";
import { AliasForm } from "@/components/admin/AliasForm";
import { updateAliasAction } from "@/actions/alias.actions";

export const dynamic = "force-dynamic";

export default async function EditAliasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);

  const rows = await db
    .select()
    .from(locationAliases)
    .where(eq(locationAliases.id, id))
    .limit(1);

  const alias = rows[0];
  if (!alias) notFound();

  const spots = await db
    .select({ id: tourismSpots.id, nameKo: tourismSpots.nameKo })
    .from(tourismSpots)
    .orderBy(tourismSpots.nameKo);

  return (
    <div>
      <h1 className="text-2xl font-bold">검색어 수정</h1>
      <div className="mt-6">
        <AliasForm
          action={updateAliasAction}
          spots={spots}
          defaultValues={{
            id: alias.id,
            alias: alias.alias,
            language: alias.language,
            spotId: alias.spotId,
            type: alias.type,
          }}
        />
      </div>
    </div>
  );
}
