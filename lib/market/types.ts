// Shape of data/market.json (produced by the research pipeline).
export type Support = "yes" | "partial" | "no" | "unknown";

export interface MarketFile {
  generatedAt: string;
  segments: { slug: string; name: string; description: string }[];
  features: { slug: string; name: string; category: string; description: string }[];
  products: {
    slug: string;
    name: string;
    vendor: string;
    segmentSlug: string;
    summary: string;
    pricingModel: string;
    openSource: boolean;
    website: string;
    sourceUrls: string[];
    confidence: string | number;
  }[];
  productFeatures: {
    productSlug: string;
    featureSlug: string;
    support: Support;
    note: string;
    sourceUrl: string;
  }[];
  swot: {
    scope: "product" | "segment";
    refSlug: string;
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
    sourceUrls: string[];
  }[];
}
