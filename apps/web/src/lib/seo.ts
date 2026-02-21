import type { Metadata } from "next";

const FALLBACK_SITE_URL = "https://hermis-next.vercel.app";

const deploymentUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

const siteUrl = deploymentUrl?.startsWith("http") ? deploymentUrl : FALLBACK_SITE_URL;

export const metadataBase = new URL(siteUrl);

function absoluteUrl(pathOrUrl: string): string {
  try {
    return new URL(pathOrUrl, metadataBase).toString();
  } catch {
    return pathOrUrl;
  }
}

export const siteConfig = {
  name: "Hermis Atlas",
  title: "Hermis Atlas – Web3 Crowdsourcing Coordination Layer",
  description:
    "Coordinate Hermis on-chain missions, review pipelines, and arbitration workflows with guard-driven strategies, verifiable reputation, and transparent rewards.",
  url: siteUrl,
  ogImage: "/logo.png",
  twitterHandle: "@web3heichen",
  locale: "en_US",
  keywords: [
    "Hermis Atlas",
    "Hermis",
    "Web3 crowdsourcing",
    "Decentralized coordination",
    "On-chain missions",
    "Arbitration workflows",
    "ZK reputation",
    "Base Sepolia",
    "RainbowKit",
    "Wagmi",
  ],
  authors: [{ name: "Hermis Atlas Team" }],
  creator: "Hermis Atlas Team",
  publisher: "Hermis Atlas",
};

type GenerateMetadataInput = {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  noIndex?: boolean;
  keywords?: string[];
};

export function generateMetadata({
  title,
  description,
  image,
  url,
  noIndex = false,
  keywords,
}: GenerateMetadataInput = {}): Metadata {
  const metaTitle = title ? `${title} | ${siteConfig.name}` : siteConfig.title;
  const metaDescription = description || siteConfig.description;
  const metaImage = absoluteUrl(image || siteConfig.ogImage);
  const metaUrl = absoluteUrl(url || "/");
  const metaKeywords = keywords ? [...siteConfig.keywords, ...keywords] : siteConfig.keywords;

  return {
    metadataBase,
    title: metaTitle,
    description: metaDescription,
    keywords: metaKeywords,
    authors: siteConfig.authors,
    creator: siteConfig.creator,
    publisher: siteConfig.publisher,
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: metaUrl,
    },
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      url: metaUrl,
      siteName: siteConfig.name,
      title: metaTitle,
      description: metaDescription,
      images: [
        {
          url: metaImage,
          width: 1200,
          height: 630,
          alt: metaTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitterHandle,
      creator: siteConfig.twitterHandle,
      title: metaTitle,
      description: metaDescription,
      images: [metaImage],
    },
    category: "Technology",
    applicationName: siteConfig.name,
    referrer: "origin-when-cross-origin",
  };
}

export const defaultMetadata = generateMetadata();

export const rootLayoutMetadata: Metadata = {
  metadataBase,
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: siteConfig.authors,
  creator: siteConfig.creator,
  publisher: siteConfig.publisher,
  icons: {
    icon: [{ url: "/logo.png", type: "image/png", sizes: "any" }],
    shortcut: [{ url: "/logo.png" }],
    apple: [{ url: "/logo.png" }],
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url: absoluteUrl(siteConfig.ogImage),
        width: 1200,
        height: 630,
        alt: siteConfig.title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: siteConfig.twitterHandle,
    creator: siteConfig.twitterHandle,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [absoluteUrl(siteConfig.ogImage)],
  },
  verification: {
    other: {
      me: ["https://x.com/web3heichen"],
    },
  },
  category: "Technology",
  applicationName: siteConfig.name,
  referrer: "origin-when-cross-origin",
};

export const pageMetadata = {
  dashboard: {
    title: "Dashboard",
    description:
      "Overview your Hermis Atlas missions, contributor performance, and live submission activity across the network.",
  },
  missions: {
    title: "Missions",
    description:
      "Browse, publish, and manage Hermis missions with guard presets, staking requirements, and transparent incentives.",
  },
  reviews: {
    title: "Reviews",
    description:
      "Track submission reviews, arbitration escalations, and reputation impacts across Hermis review pipelines.",
  },
  analytics: {
    title: "Analytics",
    description:
      "Analyze Hermis Atlas performance with live metrics on mission fulfillment, reward distribution, and contributor stats.",
  },
} as const;

export const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
  inLanguage: ["en", "zh-CN"],
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteConfig.url}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export const platformStructuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
  applicationCategory: "ProductivityApplication",
  operatingSystem: "Web Browser",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Mission orchestration",
    "Guard-based workflows",
    "Reputation insights",
    "Web3 wallet onboarding",
  ],
};

export const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.publisher,
  url: siteConfig.url,
  logo: absoluteUrl("/logo.png"),
  sameAs: ["https://x.com/web3heichen"],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "Support",
    availableLanguage: ["English", "Chinese"],
  },
};

export function generateBreadcrumbStructuredData(items: Array<{ name: string; url?: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.url && { item: absoluteUrl(item.url) }),
    })),
  };
}
