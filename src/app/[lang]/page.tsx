import { getDictionary } from "./dictionaries";

export default async function HomePage() {
  const dict = await getDictionary();

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold">{dict.home.title}</h1>
      <p className="mt-4 text-lg text-zinc-600">{dict.home.subtitle}</p>
    </main>
  );
}
