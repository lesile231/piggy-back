import type { Dictionary } from "@/app/[lang]/dictionaries";
import { WhatsAppIcon, LineIcon } from "@/components/ui/icons";

interface MessengerCTAProps {
  dict: Dictionary["messenger"];
  variant: "banner" | "inline";
}

const WHATSAPP_URL = process.env.NEXT_PUBLIC_WHATSAPP_URL;
const LINE_URL = process.env.NEXT_PUBLIC_LINE_URL;

export function MessengerCTA({ dict, variant }: MessengerCTAProps) {
  const hasWhatsApp = !!WHATSAPP_URL;
  const hasLine = !!LINE_URL;

  if (!hasWhatsApp && !hasLine) return null;

  if (variant === "banner") {
    return (
      <section className="mt-12 rounded-2xl bg-gradient-to-r from-[#0077B6] to-[#005F92] px-6 py-8 text-center text-white sm:px-10">
        <h2 className="text-xl font-bold sm:text-2xl">{dict.banner}</h2>
        <p className="mt-2 text-sm text-white/80">{dict.bannerSub}</p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {hasWhatsApp && (
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-5 py-2.5
                         text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <WhatsAppIcon />
              {dict.chatOnWhatsApp}
            </a>
          )}
          {hasLine && (
            <a
              href={LINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#06C755] px-5 py-2.5
                         text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <LineIcon />
              {dict.chatOnLine}
            </a>
          )}
        </div>
      </section>
    );
  }

  // inline variant
  return (
    <div className="mt-8 rounded-xl border border-[rgba(0,119,182,0.15)] bg-[#EBF4FA] px-5 py-5">
      <p className="text-sm font-medium text-[#1B3A4B]">{dict.askAboutPlace}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {hasWhatsApp && (
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2
                       text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <WhatsAppIcon />
            {dict.chatOnWhatsApp}
          </a>
        )}
        {hasLine && (
          <a
            href={LINE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[#06C755] px-4 py-2
                       text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <LineIcon />
            {dict.chatOnLine}
          </a>
        )}
      </div>
    </div>
  );
}
