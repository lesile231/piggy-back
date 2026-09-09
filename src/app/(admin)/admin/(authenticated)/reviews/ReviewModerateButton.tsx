"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface ReviewModerateButtonProps {
  reviewId: string;
  currentStatus: string;
}

export function ReviewModerateButton({
  reviewId,
  currentStatus,
}: ReviewModerateButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const targetStatus = currentStatus === "published" ? "hidden" : "published";
  const label = currentStatus === "published" ? "숨기기" : "게시";

  const handleClick = async () => {
    setLoading(true);
    try {
      await fetch(`/api/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });
      router.refresh();
    } catch {
      // TODO[MVP]: Show error toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
        currentStatus === "published"
          ? "bg-red-50 text-red-600 hover:bg-red-100"
          : "bg-green-50 text-green-600 hover:bg-green-100"
      } disabled:opacity-50`}
    >
      {loading ? "..." : label}
    </button>
  );
}
