import type { MetadataRoute } from "next";
import { profile } from "@/lib/profile";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: profile.links.site, changeFrequency: "monthly", priority: 1 }];
}
