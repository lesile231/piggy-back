import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { tourismSpots } from "@/lib/db/schema";
import { SpotForm } from "@/components/admin/SpotForm";
import { updateSpotAction } from "@/actions/spot.actions";
import type { LocalizedText } from "@/types/common";

export const dynamic = "force-dynamic";

export default async function EditSpotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);

  const rows = await db
    .select()
    .from(tourismSpots)
    .where(eq(tourismSpots.id, id))
    .limit(1);

  const spot = rows[0];
  if (!spot) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold">관광지 수정</h1>
      <div className="mt-6">
        <SpotForm
          action={updateSpotAction}
          defaultValues={{
            id: spot.id,
            nameKo: spot.nameKo,
            names: spot.names as LocalizedText,
            description: spot.description as LocalizedText,
            addresses: (spot.addresses ?? {}) as LocalizedText,
            latitude: spot.latitude ? Number(spot.latitude) : null,
            longitude: spot.longitude ? Number(spot.longitude) : null,
            phone: spot.phone,
            website: spot.website,
            rating: spot.rating ? Number(spot.rating) : null,
            images: (spot.images ?? []) as string[],
            isActive: spot.isActive,
          }}
        />
      </div>
    </div>
  );
}
