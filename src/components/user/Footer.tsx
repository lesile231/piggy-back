import type { Dictionary } from "@/app/[lang]/dictionaries";

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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                </svg>
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19.365 9.864c.018 0 .049 0 .018 0C21.101 9.864 24 7.578 24 4.932 24 2.21 21.101 0 17.504 0h-11.008C2.899 0 0 2.21 0 4.932c0 2.646 2.899 4.932 6.496 4.932h.049l-.049.049c0 1.47.735 2.793 1.862 3.528-.049.098-.049.196-.049.294 0 1.568.882 2.94 2.205 3.577-.049.098-.049.196-.049.294 0 2.21 2.899 4.394 6.496 4.394s6.496-2.184 6.496-4.394c0-.098 0-.196-.049-.294 1.323-.637 2.205-2.009 2.205-3.577 0-.098 0-.196-.049-.294 1.127-.735 1.862-2.058 1.862-3.528 0-.049 0-.098-.049-.147-.018-.049-.018-.049-.018-.098z" />
                </svg>
              </a>
            )}
          </div>
        )}
      </div>
    </footer>
  );
}
