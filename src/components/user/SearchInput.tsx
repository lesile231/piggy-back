"use client";

interface SearchInputProps {
  placeholder: string;
  action: string;
  defaultValue?: string;
}

export function SearchInput({ placeholder, action, defaultValue }: SearchInputProps) {
  return (
    <form action={action} method="get" className="w-full max-w-md">
      <input
        type="text"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
      />
    </form>
  );
}
