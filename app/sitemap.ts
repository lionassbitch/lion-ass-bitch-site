import type { MetadataRoute } from "next";
import { dossiers } from "./content/characters";
import { transmissions } from "./content/frequency";
import { fallbackRelics } from "./lib/catalog";

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://lionassbitch.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/archive",
    "/mythos",
    "/creed",
    "/dossiers",
    "/frequency",
    "/exsuvera",
    "/founder",
    "/contact",
    "/labrynth",
    "/voguejitsu",
  ].map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const dossierRoutes = dossiers.map((dossier) => ({
    url: `${BASE}/dossiers/${dossier.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const transmissionRoutes = transmissions.map((entry) => ({
    url: `${BASE}/frequency/${entry.slug}`,
    lastModified: new Date(entry.date),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  const relicRoutes = fallbackRelics.map((relic) => ({
    url: `${BASE}/archive/${relic.handle}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...dossierRoutes, ...transmissionRoutes, ...relicRoutes];
}
