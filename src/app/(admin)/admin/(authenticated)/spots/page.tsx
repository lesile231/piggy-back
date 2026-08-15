import Link from "next/link";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { tourismSpots } from "@/lib/db/schema";
import { deleteSpotAction } from "@/actions/spot.actions";

export const dynamic = "force-dynamic";

export default async function AdminSpotsPage() {
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);

  const spots = await db
    .select({
      id: tourismSpots.id,
      nameKo: tourismSpots.nameKo,
      source: tourismSpots.source,
      rating: tourismSpots.rating,
      isActive: tourismSpots.isActive,
    })
    .from(tourismSpots)
    .orderBy(tourismSpots.nameKo);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">관광지 관리</h1>
        <Link
          href="/admin/spots/new"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        >
          새로 만들기
        </Link>
      </div>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b text-left text-zinc-500">
            <th className="pb-2">이름</th>
            <th className="pb-2">소스</th>
            <th className="pb-2">별점</th>
            <th className="pb-2">상태</th>
            <th className="pb-2">액션</th>
          </tr>
        </thead>
        <tbody>
          {spots.map((spot) => (
            <tr key={spot.id} className="border-b">
              <td className="py-2">{spot.nameKo}</td>
              <td className="py-2">{spot.source}</td>
              <td className="py-2">{spot.rating ?? "-"}</td>
              <td className="py-2">
                <span className={spot.isActive ? "text-green-600" : "text-zinc-400"}>
                  {spot.isActive ? "활성" : "비활성"}
                </span>
              </td>
              <td className="flex gap-2 py-2">
                <Link
                  href={`/admin/spots/${spot.id}/edit`}
                  className="text-blue-600 hover:underline"
                >
                  수정
                </Link>
                <form action={deleteSpotAction}>
                  <input type="hidden" name="id" value={spot.id} />
                  <button
                    type="submit"
                    className="text-red-600 hover:underline"
                    onClick={(e) => {
                      if (!confirm("정말 삭제하시겠습니까?")) e.preventDefault();
                    }}
                  >
                    삭제
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
