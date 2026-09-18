import type { Dictionary } from "@/app/[lang]/dictionaries";
import { WhatsAppIcon, LineIcon } from "@/components/ui/icons";

const WHATSAPP_URL = process.env.NEXT_PUBLIC_WHATSAPP_URL;
const LINE_URL = process.env.NEXT_PUBLIC_LINE_URL;

export function Footer({ dict }: { dict: Dictionary }) {
  const hasMessenger = !!WHATSAPP_URL || !!LINE_URL;

  return (
    <footer className="border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-zinc-500">
          &copy; {new Date().getFullYear()} VIA BUSAN
        </span>
        {hasMessenger && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500">{dict.home.startChat}</span>
            {WHATSAPP_URL && (
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-[#25D366] p-2 text-white transition-opacity hover:opacity-80"
                aria-label={dict.messenger.chatOnWhatsApp}
              >
                <WhatsAppIcon size={16} />
              </a>
            )}
            {LINE_URL && (
              <a
                href={LINE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-[#06C755] p-2 text-white transition-opacity hover:opacity-80"
                aria-label={dict.messenger.chatOnLine}
              >
                <LineIcon size={16} />
              </a>
            )}
          </div>
        )}
      </div>
    </footer>
  );
}
