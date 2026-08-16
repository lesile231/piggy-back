import Link from "next/link";
import { sql, eq, desc } from "drizzle-orm";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { resolutionLogs, tourismSpots } from "@/lib/db/schema";
import { dismissMissedAction } from "@/actions/missed.actions";
import { DeleteButton } from "@/components/admin/DeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminMissedPage() {
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);

  // Failed searches: success=false, grouped by normalizedQuery+language, ordered by count desc
  const missed = await db
    .select({
      normalizedQuery: resolutionLogs.normalizedQuery,
      query: resolutionLogs.query,
      language: resolutionLogs.language,
      count: sql<number>`count(*)::int`.as("count"),
      lastSeen: sql<string>`max(${resolutionLogs.createdAt})`.as("last_seen"),
    })
    .from(resolutionLogs)
    .where(eq(resolutionLogs.success, false))
    .groupBy(resolutionLogs.normalizedQuery, resolutionLogs.query, resolutionLogs.language)
    .orderBy(sql`count(*) desc`, sql`max(${resolutionLogs.createdAt}) desc`)
    .limit(200);

  // Low-confidence searches: success=true but confidence < 0.7 (Stage 5 guesses)
  const lowConfidence = await db
    .select({
      normalizedQuery: resolutionLogs.normalizedQuery,
      query: resolutionLogs.query,
      language: resolutionLogs.language,
      resolvedStage: resolutionLogs.resolvedStage,
      confidence: resolutionLogs.confidence,
      spotNameKo: tourismSpots.nameKo,
      count: sql<number>`count(*)::int`.as("count"),
      lastSeen: sql<string>`max(${resolutionLogs.createdAt})`.as("last_seen"),
    })
    .from(resolutionLogs)
    .leftJoin(tourismSpots, eq(resolutionLogs.resolvedSpotId, tourismSpots.id))
    .where(
      sql`${resolutionLogs.success} = true AND cast(${resolutionLogs.confidence} as numeric) < 0.7`,
    )
    .groupBy(
      resolutionLogs.normalizedQuery,
      resolutionLogs.query,
      resolutionLogs.language,
      resolutionLogs.resolvedStage,
      resolutionLogs.confidence,
      tourismSpots.nameKo,
    )
    .orderBy(sql`count(*) desc`)
    .limit(100);

  return (
    <div>
      <h1 className="text-2xl font-bold">미매칭 검색어</h1>
      <p className="mt-1 text-sm text-zinc-500">
        검색했으나 결과가 없었던 단어들입니다. 자주 나오는 것부터 검색 사전에 추가하세요.
      </p>

      {/* ── Failed searches ── */}
      <h2 className="mt-8 text-lg font-semibold">결과 없음 ({missed.length}건)</h2>

      {missed.length === 0 ? (
        <p className="mt-4 text-center text-zinc-400">미매칭 검색어가 없습니다.</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-zinc-500">
              <th className="px-4 pb-2 pt-3">검색어</th>
              <th className="px-4 pb-2 pt-3">언어</th>
              <th className="px-4 pb-2 pt-3 text-right">횟수</th>
              <th className="px-4 pb-2 pt-3">마지막</th>
              <th className="px-4 pb-2 pt-3">액션</th>
            </tr>
          </thead>
          <tbody>
            {missed.map((m) => {
              const key = `${m.normalizedQuery}-${m.language}`;
              return (
                <tr key={key} className="border-b last:border-b-0">
                  <td className="px-4 py-2">
                    <span className="font-mono">{m.query}</span>
                    {m.normalizedQuery !== m.query && (
                      <span className="ml-2 text-xs text-zinc-400">
                        → {m.normalizedQuery}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">{m.language}</td>
                  <td className="px-4 py-2 text-right font-medium">
                    {m.count}
                  </td>
                  <td className="px-4 py-2 text-zinc-400">
                    {formatDate(m.lastSeen)}
                  </td>
                  <td className="flex gap-2 px-4 py-2">
                    <Link
                      href={`/admin/aliases/new?alias=${encodeURIComponent(m.query)}&language=${m.language}`}
                      className="text-blue-600 hover:underline"
                    >
                      사전 등록
                    </Link>
                    <DeleteButton action={dismissMissedAction} id={`${m.normalizedQuery}|${m.language}`}>
                      무시
                    </DeleteButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* ── Low-confidence searches ── */}
      {lowConfidence.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-semibold">
            낮은 확신도 ({lowConfidence.length}건)
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            결과는 나왔지만 확신도가 낮은 검색입니다. 맞다면 사전 등록으로 확정하세요.
          </p>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-zinc-500">
                <th className="px-4 pb-2 pt-3">검색어</th>
                <th className="px-4 pb-2 pt-3">언어</th>
                <th className="px-4 pb-2 pt-3">매칭 장소</th>
                <th className="px-4 pb-2 pt-3">확신도</th>
                <th className="px-4 pb-2 pt-3 text-right">횟수</th>
                <th className="px-4 pb-2 pt-3">액션</th>
              </tr>
            </thead>
            <tbody>
              {lowConfidence.map((m) => {
                const key = `${m.normalizedQuery}-${m.language}-${m.spotNameKo}`;
                return (
                  <tr key={key} className="border-b last:border-b-0">
                    <td className="px-4 py-2 font-mono">{m.query}</td>
                    <td className="px-4 py-2">{m.language}</td>
                    <td className="px-4 py-2">{m.spotNameKo ?? "-"}</td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          Number(m.confidence) < 0.5
                            ? "text-red-500"
                            : "text-yellow-600"
                        }
                      >
                        {Number(m.confidence).toFixed(1)}
                      </span>
                      <span className="ml-1 text-xs text-zinc-400">
                        (S{m.resolvedStage})
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      {m.count}
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/admin/aliases/new?alias=${encodeURIComponent(m.query)}&language=${m.language}`}
                        className="text-blue-600 hover:underline"
                      >
                        사전 등록
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}
