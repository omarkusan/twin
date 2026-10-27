import type { MetadataRoute } from "next";
import { profile } from "@/lib/profile";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${profile.links.site}/sitemap.xml`,
  };
}
