import Link from "next/link";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { deals } from "@/lib/db/schema";
import { deleteDealAction } from "@/actions/deal.actions";
import { DeleteButton } from "@/components/admin/DeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminDealsPage() {
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);

  const allDeals = await db
    .select({
      id: deals.id,
      nameKo: deals.nameKo,
      providerName: deals.providerName,
      category: deals.category,
      validFrom: deals.validFrom,
      validUntil: deals.validUntil,
      isActive: deals.isActive,
    })
    .from(deals)
    .orderBy(deals.sortOrder, deals.createdAt);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">혜택 관리</h1>
        <Link
          href="/admin/deals/new"
          className="rounded bg-[#0077B6] px-4 py-2 text-sm font-medium text-white hover:bg-[#005F92]"
        >
          새로 만들기
        </Link>
      </div>
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b text-left text-zinc-500">
            <th className="pb-2">이름</th>
            <th className="pb-2">제공처</th>
            <th className="pb-2">카테고리</th>
            <th className="pb-2">유효기간</th>
            <th className="pb-2">상태</th>
            <th className="pb-2">액션</th>
          </tr>
        </thead>
        <tbody>
          {allDeals.map((deal) => (
            <tr key={deal.id} className="border-b">
              <td className="py-2">{deal.nameKo}</td>
              <td className="py-2">{deal.providerName}</td>
              <td className="py-2">{deal.category}</td>
              <td className="py-2 text-xs">
                {deal.validFrom
                  ? deal.validFrom.toLocaleDateString("ko")
                  : "—"}
                {" – "}
                {deal.validUntil
                  ? deal.validUntil.toLocaleDateString("ko")
                  : "—"}
              </td>
              <td className="py-2">
                <span className={deal.isActive ? "text-green-600" : "text-zinc-400"}>
                  {deal.isActive ? "활성" : "비활성"}
                </span>
              </td>
              <td className="flex gap-2 py-2">
                <Link href={`/admin/deals/${deal.id}/edit`} className="text-blue-600 hover:underline">수정</Link>
                <DeleteButton action={deleteDealAction} id={deal.id}>
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
