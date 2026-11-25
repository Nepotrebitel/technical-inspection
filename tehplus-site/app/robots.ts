import type { MetadataRoute } from "next";

const SITE_URL = "https://xn----7sbaba2c5abgddg8b2a8j.xn--p1ai";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/privacy"],
        disallow: ["/admin", "/admin/", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}