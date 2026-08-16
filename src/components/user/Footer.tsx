import type { Dictionary } from "@/app/[lang]/dictionaries";

export function Footer({ dict }: { dict: Dictionary }) {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-[rgba(0,119,182,0.12)] dark:bg-[#EBF4FA]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 text-sm text-zinc-500">
        <span>&copy; {new Date().getFullYear()} PiggyBack</span>
        <span>{dict.home.startChat}</span>
      </div>
    </footer>
  );
}
