import Link from "next/link";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { events } from "@/lib/db/schema";
import { deleteEventAction } from "@/actions/event.actions";
import { DeleteButton } from "@/components/admin/DeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);

  const allEvents = await db
    .select({
      id: events.id,
      nameKo: events.nameKo,
      category: events.category,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      isActive: events.isActive,
    })
    .from(events)
    .orderBy(events.startsAt);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">행사 관리</h1>
        <Link
          href="/admin/events/new"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        >
          새로 만들기
        </Link>
      </div>
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b text-left text-zinc-500">
            <th className="pb-2">이름</th>
            <th className="pb-2">카테고리</th>
            <th className="pb-2">기간</th>
            <th className="pb-2">상태</th>
            <th className="pb-2">액션</th>
          </tr>
        </thead>
        <tbody>
          {allEvents.map((evt) => (
            <tr key={evt.id} className="border-b">
              <td className="py-2">{evt.nameKo}</td>
              <td className="py-2">{evt.category}</td>
              <td className="py-2 text-xs">
                {evt.startsAt.toLocaleDateString("ko")} – {evt.endsAt.toLocaleDateString("ko")}
              </td>
              <td className="py-2">
                <span className={evt.isActive ? "text-green-600" : "text-zinc-400"}>
                  {evt.isActive ? "활성" : "비활성"}
                </span>
              </td>
              <td className="flex gap-2 py-2">
                <Link href={`/admin/events/${evt.id}/edit`} className="text-blue-600 hover:underline">수정</Link>
                <DeleteButton action={deleteEventAction} id={evt.id}>
                  삭제
                </DeleteButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
