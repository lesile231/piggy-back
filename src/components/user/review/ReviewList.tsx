import type { Dictionary } from "@/app/[lang]/dictionaries";
import { ReviewCard } from "./ReviewCard";
import { StarRating } from "./StarRating";
import { SectionLabel } from "@/components/ui/SectionLabel";
import type { ReviewRow, ReviewStats } from "@/services/review/review.repository";

interface ReviewListProps {
  reviews: ReviewRow[];
  stats: ReviewStats;
  locale: string;
  dict: Dictionary["review"];
}

export function ReviewList({ reviews, stats, locale, dict }: ReviewListProps) {
  return (
    <section className="mt-8">
      <SectionLabel>{dict.reviews}</SectionLabel>

      {/* Average rating summary */}
      {stats.totalCount > 0 && stats.averageRating != null && (
        <div className="mt-3 flex items-center gap-3">
          <span className="text-3xl font-bold text-[#1B3A4B]">
            {stats.averageRating.toFixed(1)}
          </span>
          <div>
            <StarRating value={Math.round(stats.averageRating)} size="sm" readonly />
            <p className="mt-0.5 text-xs text-zinc-500">
              {dict.basedOn.replace("{count}", String(stats.totalCount))}
            </p>
          </div>
        </div>
      )}

      {/* Review list */}
      {reviews.length > 0 ? (
        <div className="mt-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={{ ...review, createdAt: review.createdAt.toISOString() }}
              locale={locale}
            />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-400">{dict.noReviews}</p>
      )}
    </section>
  );
}
