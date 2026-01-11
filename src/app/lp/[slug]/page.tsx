import { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { getLandingPage, incrementViews } from "@/lib/landing-pages/storage";
import { LandingPageData } from "@/lib/landing-pages/types";
import { LeadMagnetTemplate } from "./templates/LeadMagnetTemplate";
import { ChallengeTemplate } from "./templates/ChallengeTemplate";
import { ProductLaunchTemplate } from "./templates/ProductLaunchTemplate";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Convert database landing page to LandingPageData format
function dbToLandingPageData(dbPage: any): LandingPageData {
  return {
    slug: dbPage.slug,
    template: dbPage.template as LandingPageData["template"],
    status: dbPage.status as "draft" | "published",
    title: dbPage.title,
    metaDescription: dbPage.metaDescription || undefined,
    ogImage: dbPage.ogImage || undefined,
    headline: dbPage.headline,
    subheadline: dbPage.subheadline || undefined,
    heroImage: dbPage.heroImage || undefined,
    benefits: dbPage.benefits || [],
    trustElements: dbPage.trustElements || [],
    leadMagnet: dbPage.leadMagnet ? {
      title: dbPage.leadMagnet.title,
      description: dbPage.leadMagnet.description || undefined,
      downloadUrl: dbPage.downloadUrl || dbPage.leadMagnet.fileUrl,
    } : dbPage.downloadUrl ? {
      title: dbPage.title,
      downloadUrl: dbPage.downloadUrl,
    } : undefined,
    ctaText: dbPage.ctaText,
    ctaSubtext: dbPage.ctaSubtext || undefined,
    formFields: dbPage.formFields || ["email", "firstName"],
    constantContactListId: dbPage.ccListId || undefined,
    thankYou: {
      headline: dbPage.thankYouHeadline,
      message: dbPage.thankYouMessage,
      ctas: (dbPage.thankYouCtas as any[]) || [],
    },
    utmCampaign: dbPage.utmCampaign || undefined,
    primaryColor: dbPage.primaryColor || "#FF4500",
    accentColor: dbPage.accentColor || "#f59e0b",
    darkMode: dbPage.darkMode ?? true,
    createdAt: dbPage.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: dbPage.updatedAt?.toISOString() || new Date().toISOString(),
    views: dbPage.views || 0,
    conversions: dbPage.conversions || 0,
  };
}

// Get landing page from database first, then fall back to in-memory
async function getPage(slug: string): Promise<LandingPageData | null> {
  // Try database first
  try {
    const dbPage = await prisma.landingPage.findUnique({
      where: { slug },
      include: { leadMagnet: true },
    });

    if (dbPage) {
      return dbToLandingPageData(dbPage);
    }
  } catch (error) {
    console.error("[Landing Page] Database error:", error);
  }

  // Fall back to in-memory storage
  return getLandingPage(slug);
}

// Increment views (database or in-memory)
async function trackView(slug: string) {
  try {
    await prisma.landingPage.update({
      where: { slug },
      data: { views: { increment: 1 } },
    });
  } catch {
    // Fall back to in-memory
    incrementViews(slug);
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);

  if (!page) {
    return { title: "Not Found" };
  }

  return {
    title: page.title,
    description: page.metaDescription,
    openGraph: {
      title: page.headline,
      description: page.subheadline || page.metaDescription,
      images: page.ogImage ? [page.ogImage] : undefined,
    },
  };
}

export default async function LandingPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const utmParams = await searchParams;
  const page = await getPage(slug);

  if (!page || page.status !== "published") {
    notFound();
  }

  // Track view (fire and forget)
  trackView(slug);

  // Extract UTM params for tracking
  const tracking = {
    utm_source: utmParams.utm_source as string || "",
    utm_medium: utmParams.utm_medium as string || "",
    utm_campaign: utmParams.utm_campaign as string || page.utmCampaign || "",
    utm_content: utmParams.utm_content as string || "",
  };

  // Render based on template
  switch (page.template) {
    case "lead_magnet":
      return <LeadMagnetTemplate page={page} tracking={tracking} />;
    case "challenge":
      return <ChallengeTemplate page={page} tracking={tracking} />;
    case "product_launch":
      return <ProductLaunchTemplate page={page} tracking={tracking} />;
    default:
      return <LeadMagnetTemplate page={page} tracking={tracking} />;
  }
}
