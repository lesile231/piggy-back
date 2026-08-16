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

      <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 space-y-2">
        <p className="font-medium text-zinc-800">플로우란?</p>
        <p>
          플로우는 챗봇에서 사용자를 단계별로 안내하는 <strong>대화 시나리오</strong>입니다.
          코드 수정 없이 이 화면에서 대화 흐름을 만들고 관리할 수 있습니다.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>활성화된 플로우는 챗봇 메인 메뉴에 버튼으로 자동 노출됩니다.</li>
          <li>각 플로우는 여러 <strong>스텝</strong>(메시지 단계)으로 구성되며, 스텝마다 <strong>옵션</strong>(선택 버튼)을 추가할 수 있습니다.</li>
          <li>마지막 스텝을 <code className="rounded bg-zinc-200 px-1">api_call</code> 타입으로 설정하면, 누적된 사용자 입력을 바탕으로 백엔드 API를 호출합니다.</li>
          <li><strong>순서(sortOrder)</strong> 값이 작을수록 메뉴 상단에 표시됩니다.</li>
        </ul>
      </div>

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
