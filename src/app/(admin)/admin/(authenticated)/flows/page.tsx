import Link from "next/link";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { flows } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import type { LocalizedText } from "@/types/common";

export const dynamic = "force-dynamic";

export default async function AdminFlowsPage() {
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);

  const allFlows = await db
    .select()
    .from(flows)
    .orderBy(asc(flows.sortOrder));

  return (
    <div>
      <h1 className="text-2xl font-bold">플로우 관리</h1>
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b text-left text-zinc-500">
            <th className="pb-2">아이콘</th>
            <th className="pb-2">이름</th>
            <th className="pb-2">표시 이름 (EN)</th>
            <th className="pb-2">순서</th>
            <th className="pb-2">상태</th>
            <th className="pb-2">액션</th>
          </tr>
        </thead>
        <tbody>
          {allFlows.map((flow) => {
            const displayNames = flow.displayNames as LocalizedText;
            return (
              <tr key={flow.id} className="border-b">
                <td className="py-2">{flow.icon}</td>
                <td className="py-2">{flow.name}</td>
                <td className="py-2">{displayNames.en ?? "-"}</td>
                <td className="py-2">{flow.sortOrder}</td>
                <td className="py-2">
                  <span className={flow.isActive ? "text-green-600" : "text-zinc-400"}>
                    {flow.isActive ? "활성" : "비활성"}
                  </span>
                </td>
                <td className="py-2">
                  <Link href={`/admin/flows/${flow.id}/edit`} className="text-blue-600 hover:underline">
                    편집
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
