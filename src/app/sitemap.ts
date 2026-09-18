import type { MetadataRoute } from "next";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { SpotRepository } from "@/services/tourism/spot.repository";
import { EventRepository } from "@/services/tourism/event.repository";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const LOCALES = ["en", "ja", "zh", "ko", "es", "it", "fr", "de", "id", "th"];

export const revalidate = 3600;

function buildLanguages(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l] = `${APP_URL}/${l}${path}`;
  }
  return languages;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);
  const spotRepo = new SpotRepository(db);
  const eventRepo = new EventRepository(db);

  const [spotIds, eventIds] = await Promise.all([
    spotRepo.listAllIds(),
    eventRepo.listAllIds(),
  ]);

  const staticPages = [
    { path: "", priority: 1.0, changeFrequency: "daily" as const },
    { path: "/spots", priority: 0.8, changeFrequency: "daily" as const },
    { path: "/events", priority: 0.8, changeFrequency: "daily" as const },
    { path: "/search", priority: 0.5, changeFrequency: "weekly" as const },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPages.map((page) => ({
    url: `${APP_URL}/en${page.path}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
    alternates: { languages: buildLanguages(page.path) },
  }));

  const spotEntries: MetadataRoute.Sitemap = spotIds.map((spot) => ({
    url: `${APP_URL}/en/spots/${spot.id}`,
    lastModified: spot.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
    alternates: { languages: buildLanguages(`/spots/${spot.id}`) },
  }));

  const eventEntries: MetadataRoute.Sitemap = eventIds.map((event) => ({
    url: `${APP_URL}/en/events/${event.id}`,
    lastModified: event.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
    alternates: { languages: buildLanguages(`/events/${event.id}`) },
  }));

  return [...staticEntries, ...spotEntries, ...eventEntries];
}
