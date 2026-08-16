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
            ? "bg-[#0077B6] text-white"
            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
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
              ? "bg-[#0077B6] text-white"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
          }`}
        >
          {cat.label}
        </Link>
      ))}
    </div>
  );
}
