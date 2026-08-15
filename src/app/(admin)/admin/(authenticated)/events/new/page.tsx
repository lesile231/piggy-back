import { EventForm } from "@/components/admin/EventForm";
import { createEventAction } from "@/actions/event.actions";

export const dynamic = "force-dynamic";

export default function NewEventPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">행사 등록</h1>
      <div className="mt-6">
        <EventForm action={createEventAction} />
      </div>
    </div>
  );
}
