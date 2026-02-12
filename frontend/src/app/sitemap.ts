import type { MetadataRoute } from "next";
import { blogPosts } from "@/lib/blog";

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

  // Static pages
  entries.push(
    {
      url: "https://bankread.ai/privacy",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: "https://bankread.ai/terms",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: "https://bankread.ai/blog",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  );

  // Blog posts
  for (const post of blogPosts) {
    entries.push({
      url: `https://bankread.ai/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  return entries;
}
