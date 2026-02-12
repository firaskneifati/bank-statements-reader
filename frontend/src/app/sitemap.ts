import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const registrationOpen = process.env.NEXT_PUBLIC_REGISTRATION_OPEN === "true";

  const entries: MetadataRoute.Sitemap = [
    {
      url: "https://bankread.ai",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://bankread.ai/sign-in",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  if (registrationOpen) {
    entries.push({
      url: "https://bankread.ai/sign-up",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    });
  }

  return entries;
}
