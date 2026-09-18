import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { deals } from "@/lib/db/schema";
import { DealForm } from "@/components/admin/DealForm";
import { updateDealAction } from "@/actions/deal.actions";
import type { LocalizedText } from "@/types/common";

export const dynamic = "force-dynamic";

export default async function EditDealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);

  const rows = await db.select().from(deals).where(eq(deals.id, id)).limit(1);
  const deal = rows[0];
  if (!deal) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold">혜택 수정</h1>
      <div className="mt-6">
        <DealForm
          action={updateDealAction}
          defaultValues={{
            id: deal.id,
            nameKo: deal.nameKo,
            names: deal.names as LocalizedText,
            description: deal.description as LocalizedText,
            discount: (deal.discount ?? {}) as LocalizedText,
            providerName: deal.providerName,
            locationName: (deal.locationName ?? {}) as LocalizedText,
            addressKo: deal.addressKo,
            imageUrl: deal.imageUrl,
            linkUrl: deal.linkUrl,
            category: deal.category,
            validFrom: deal.validFrom,
            validUntil: deal.validUntil,
            sortOrder: deal.sortOrder,
            isActive: deal.isActive,
          }}
        />
      </div>
    </div>
  );
}
