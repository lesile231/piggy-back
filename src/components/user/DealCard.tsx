import Image from "next/image";
import { localize } from "@/types/common";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { DealRecord } from "@/services/deal/types";

interface DealCardProps {
  deal: DealRecord;
  locale: string;
  dictDeals: {
    provider: string;
    validUntil: string;
    getOffer: string;
    expired: string;
  };
}

function isExpired(deal: DealRecord): boolean {
  if (!deal.validUntil) return false;
  return new Date() > deal.validUntil;
}

const categoryIcons: Record<string, string> = {
  general: "🎫",
  attraction: "🏛️",
  food: "🍽️",
  shopping: "🛍️",
  transport: "🚌",
};

export function DealCard({ deal, locale, dictDeals }: DealCardProps) {
  const name = localize(deal.names, locale) || deal.nameKo;
  const discountText = localize(deal.discount, locale);
  const location = localize(deal.locationName, locale);
  const expired = isExpired(deal);

  const inner = (
    <Card className={expired ? "opacity-60" : undefined}>
      <div className="relative aspect-[16/9] overflow-hidden bg-[#EBF4FA]">
        {deal.imageUrl ? (
          <Image
            src={deal.imageUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#0077B6] to-[#005F92]">
            <span className="text-4xl">{categoryIcons[deal.category] ?? "🎫"}</span>
          </div>
        )}
        {discountText && (
          <Badge variant="success" className="absolute left-2 top-2">
            {discountText}
          </Badge>
        )}
        {expired && (
          <Badge variant="neutral" className="absolute right-2 top-2">
            {dictDeals.expired}
          </Badge>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium text-[#1B3A4B]">{name}</h3>
        <p className="mt-1 text-xs text-zinc-500">
          {dictDeals.provider} {deal.providerName}
        </p>
        {location && (
          <p className="mt-0.5 text-xs text-zinc-400">{location}</p>
        )}
        {deal.validUntil && !expired && (
          <p className="mt-1 text-xs text-zinc-400">
            {dictDeals.validUntil}{" "}
            {deal.validUntil.toLocaleDateString(locale, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        )}
        {deal.linkUrl && !expired && (
          <span className="mt-2 inline-block text-xs font-medium text-[#0077B6]">
            {dictDeals.getOffer} &rarr;
          </span>
        )}
      </div>
    </Card>
  );

  if (deal.linkUrl && !expired) {
    return (
      <a
        href={deal.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group block transition-transform hover:-translate-y-0.5"
      >
        {inner}
      </a>
    );
  }

  return <div>{inner}</div>;
}
