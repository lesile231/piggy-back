import Link from "next/link";
import { eq } from "drizzle-orm";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { locationAliases, tourismSpots } from "@/lib/db/schema";
import { deleteAliasAction } from "@/actions/alias.actions";
import { DeleteButton } from "@/components/admin/DeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminAliasesPage() {
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);

  const aliases = await db
    .select({
      id: locationAliases.id,
      alias: locationAliases.alias,
      language: locationAliases.language,
      source: locationAliases.source,
      type: locationAliases.type,
      spotId: locationAliases.spotId,
      spotNameKo: tourismSpots.nameKo,
    })
    .from(locationAliases)
    .innerJoin(tourismSpots, eq(locationAliases.spotId, tourismSpots.id))
    .orderBy(tourismSpots.nameKo, locationAliases.alias);

  // Group by spot
  const grouped = new Map<string, { spotNameKo: string; items: typeof aliases }>();
  for (const a of aliases) {
    let group = grouped.get(a.spotId);
    if (!group) {
      group = { spotNameKo: a.spotNameKo, items: [] };
      grouped.set(a.spotId, group);
    }
    group.items.push(a);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">검색 사전 관리</h1>
        <Link
          href="/admin/aliases/new"
          className="rounded bg-[#0077B6] px-4 py-2 text-sm font-medium text-white hover:bg-[#005F92]"
        >
          새로 만들기
        </Link>
      </div>

      {grouped.size === 0 && (
        <p className="mt-8 text-center text-zinc-400">등록된 검색어가 없습니다.</p>
      )}

      <div className="mt-6 space-y-6">
        {[...grouped.entries()].map(([spotId, { spotNameKo, items }]) => (
          <div key={spotId} className="rounded border border-zinc-200">
            <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2">
              <h2 className="text-sm font-semibold">{spotNameKo}</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-zinc-500">
                  <th className="px-4 pb-2 pt-3">검색어</th>
                  <th className="px-4 pb-2 pt-3">언어</th>
                  <th className="px-4 pb-2 pt-3">출처</th>
                  <th className="px-4 pb-2 pt-3">액션</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id} className="border-b last:border-b-0">
                    <td className="px-4 py-2 font-mono">
                      {a.alias}
                      {a.type === "area" && (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                          지역
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">{a.language}</td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          a.source === "manual"
                            ? "text-blue-600"
                            : "text-zinc-400"
                        }
                      >
                        {a.source}
                      </span>
                    </td>
                    <td className="flex gap-2 px-4 py-2">
                      <Link
                        href={`/admin/aliases/${a.id}/edit`}
                        className="text-blue-600 hover:underline"
                      >
                        수정
                      </Link>
                      <DeleteButton action={deleteAliasAction} id={a.id}>
                        삭제
                      </DeleteButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
