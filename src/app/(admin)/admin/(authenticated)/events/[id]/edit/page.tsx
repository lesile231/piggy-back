import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { events } from "@/lib/db/schema";
import { EventForm } from "@/components/admin/EventForm";
import { updateEventAction } from "@/actions/event.actions";
import type { LocalizedText } from "@/types/common";

export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);

  const rows = await db.select().from(events).where(eq(events.id, id)).limit(1);
  const event = rows[0];
  if (!event) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold">행사 수정</h1>
      <div className="mt-6">
        <EventForm
          action={updateEventAction}
          defaultValues={{
            id: event.id,
            nameKo: event.nameKo,
            names: event.names as LocalizedText,
            description: event.description as LocalizedText,
            category: event.category,
            venueName: (event.venueName ?? {}) as LocalizedText,
            addressKo: event.addressKo,
            latitude: event.latitude ? Number(event.latitude) : null,
            longitude: event.longitude ? Number(event.longitude) : null,
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            recurrence: event.recurrence,
            priceInfo: (event.priceInfo ?? {}) as LocalizedText,
            bookingUrl: event.bookingUrl,
            images: (event.images ?? []) as string[],
            isActive: event.isActive,
          }}
        />
      </div>
    </div>
  );
}
