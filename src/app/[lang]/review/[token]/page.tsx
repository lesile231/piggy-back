import { lang } from "next/root-params";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { ReviewTokenService } from "@/services/review/review-token.service";
import { SpotRepository } from "@/services/tourism/spot.repository";
import { getDictionary } from "../../dictionaries";
import { localize } from "@/types/common";
import { ReviewForm } from "@/components/user/review/ReviewForm";
import Link from "next/link";

export async function generateMetadata() {
  const dict = await getDictionary();
  return {
    title: dict.review.title,
    robots: { index: false, follow: false },
  };
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const locale = (await lang()) ?? "en";
  const dict = await getDictionary();
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);

  const tokenService = new ReviewTokenService(db);
  const validation = await tokenService.validate(token);

  // Invalid or expired token — show error
  if (!validation.valid) {
    const message =
      validation.reason === "expired"
        ? dict.review.expired
        : validation.reason === "used"
          ? dict.review.used
          : dict.review.invalid;

    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-lg font-semibold text-[#1B3A4B]">{message}</p>
        <Link
          href={`/${locale}`}
          className="mt-4 inline-block text-sm text-[#0077B6] hover:underline"
        >
          {dict.common.home}
        </Link>
      </div>
    );
  }

  // Fetch spot name for display
  const spotRepo = new SpotRepository(db);
  const spot = await spotRepo.getById(validation.spotId!);
  const spotName = spot
    ? localize(spot.names, locale) || spot.nameKo
    : "";

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <ReviewForm token={token} spotName={spotName} dict={dict.review} />
    </div>
  );
}
