import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

export function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null;

  const separator = basePath.includes("?") ? "&" : "?";

  return (
    <nav className="flex items-center justify-center gap-2 py-6">
      {currentPage > 1 && (
        <Link
          href={`${basePath}${separator}page=${currentPage - 1}`}
          className="rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Prev
        </Link>
      )}
      <span className="text-sm text-zinc-500">
        {currentPage} / {totalPages}
      </span>
      {currentPage < totalPages && (
        <Link
          href={`${basePath}${separator}page=${currentPage + 1}`}
          className="rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Next
        </Link>
      )}
    </nav>
  );
}
