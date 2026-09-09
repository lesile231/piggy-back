import Image from "next/image";
import { StarRating } from "./StarRating";

interface ReviewCardProps {
  review: {
    id: string;
    rating: number;
    comment: string | null;
    images: string[];
    displayName: string;
    platform: string;
    createdAt: string | Date;
  };
  locale: string;
}

export function ReviewCard({ review, locale }: ReviewCardProps) {
  const date = new Date(review.createdAt).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="border-b border-[rgba(0,119,182,0.08)] py-4 last:border-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#1B3A4B]">
            {review.displayName}
          </span>
          <StarRating value={review.rating} size="sm" readonly />
        </div>
        <span className="text-xs text-zinc-400">{date}</span>
      </div>

      {review.comment && (
        <p className="mt-2 text-sm text-[#1B3A4B]">{review.comment}</p>
      )}

      {review.images.length > 0 && (
        <div className="mt-2 flex gap-2">
          {review.images.map((url) => (
            <div
              key={url}
              className="relative h-16 w-16 overflow-hidden rounded-lg bg-zinc-100"
            >
              <Image src={url} alt="" fill className="object-cover" sizes="64px" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
