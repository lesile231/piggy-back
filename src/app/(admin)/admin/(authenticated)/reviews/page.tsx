import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { ReviewRepository } from "@/services/review/review.repository";
import { tourismSpots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ReviewModerateButton } from "./ReviewModerateButton";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);
  const repo = new ReviewRepository(db);

  const reviewRows = await repo.getAllForAdmin(100);

  // Fetch spot names for display
  const spotIds = [...new Set(reviewRows.map((r) => r.spotId))];
  const spotNames = new Map<string, string>();
  for (const spotId of spotIds) {
    const [spot] = await db
      .select({ nameKo: tourismSpots.nameKo })
      .from(tourismSpots)
      .where(eq(tourismSpots.id, spotId))
      .limit(1);
    if (spot) spotNames.set(spotId, spot.nameKo);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">리뷰 관리</h1>
      <p className="mt-1 text-sm text-zinc-500">
        총 {reviewRows.length}개의 리뷰
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left text-zinc-500">
              <th className="pb-2 pr-4">장소</th>
              <th className="pb-2 pr-4">작성자</th>
              <th className="pb-2 pr-4">평점</th>
              <th className="pb-2 pr-4">내용</th>
              <th className="pb-2 pr-4">사진</th>
              <th className="pb-2 pr-4">상태</th>
              <th className="pb-2 pr-4">날짜</th>
              <th className="pb-2">관리</th>
            </tr>
          </thead>
          <tbody>
            {reviewRows.map((review) => (
              <tr key={review.id} className="border-b">
                <td className="py-3 pr-4 font-medium">
                  {spotNames.get(review.spotId) ?? review.spotId.slice(0, 8)}
                </td>
                <td className="py-3 pr-4 text-zinc-600">{review.displayName}</td>
                <td className="py-3 pr-4">
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </td>
                <td className="max-w-xs truncate py-3 pr-4 text-zinc-600">
                  {review.comment || "-"}
                </td>
                <td className="py-3 pr-4">{review.images.length}장</td>
                <td className="py-3 pr-4">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      review.status === "published"
                        ? "bg-green-100 text-green-700"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {review.status}
                  </span>
                </td>
                <td className="py-3 pr-4 text-zinc-500">
                  {review.createdAt.toLocaleDateString("ko")}
                </td>
                <td className="py-3">
                  <ReviewModerateButton
                    reviewId={review.id}
                    currentStatus={review.status}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {reviewRows.length === 0 && (
          <p className="mt-8 text-center text-zinc-400">아직 리뷰가 없습니다</p>
        )}
      </div>
    </div>
  );
}
