import Link from "next/link";

interface CategoryFilterProps {
  categories: { slug: string; label: string }[];
  current: string | undefined;
  basePath: string;
  allLabel: string;
}

export function CategoryFilter({
  categories,
  current,
  basePath,
  allLabel,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={basePath}
        className={`rounded-full px-3 py-1 text-sm ${
          !current
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
        }`}
      >
        {allLabel}
      </Link>
      {categories.map((cat) => (
        <Link
          key={cat.slug}
          href={`${basePath}?category=${cat.slug}`}
          className={`rounded-full px-3 py-1 text-sm ${
            current === cat.slug
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          {cat.label}
        </Link>
      ))}
    </div>
  );
}
