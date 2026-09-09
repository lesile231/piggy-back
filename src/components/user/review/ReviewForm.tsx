"use client";

import { useState } from "react";
import { StarRating } from "./StarRating";
import { ImageUpload } from "./ImageUpload";
import { Button } from "@/components/ui/Button";
import type { Dictionary } from "@/app/[lang]/dictionaries";

interface ReviewFormProps {
  token: string;
  spotName: string;
  dict: Dictionary["review"];
}

export function ReviewForm({ token, spotName, dict }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, rating, comment: comment || undefined, images }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to submit review");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl bg-[#EBF4FA] px-6 py-10 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0077B6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <p className="text-lg font-semibold text-[#1B3A4B]">{dict.success}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1B3A4B]">{dict.title}</h1>
      <p className="text-sm text-[#5A8296]">{spotName}</p>

      {/* Rating */}
      <div>
        <label className="text-sm font-medium text-[#1B3A4B]">{dict.rating}</label>
        <div className="mt-2">
          <StarRating value={rating} onChange={setRating} size="lg" />
        </div>
      </div>

      {/* Comment */}
      <div>
        <label htmlFor="comment" className="text-sm font-medium text-[#1B3A4B]">
          {dict.comment}
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={500}
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm
                     focus:border-[#0077B6] focus:outline-none focus:ring-1 focus:ring-[#0077B6]"
        />
      </div>

      {/* Photos */}
      <ImageUpload
        images={images}
        onImagesChange={setImages}
        dict={dict}
      />

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* Submit */}
      <Button
        type="submit"
        variant="primary"
        disabled={rating === 0 || submitting}
      >
        {submitting ? dict.submitting : dict.submit}
      </Button>
    </form>
  );
}
