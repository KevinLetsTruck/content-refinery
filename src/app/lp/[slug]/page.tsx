import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLandingPage, incrementViews } from "@/lib/landing-pages/storage";
import { LeadMagnetTemplate } from "./templates/LeadMagnetTemplate";
import { ChallengeTemplate } from "./templates/ChallengeTemplate";
import { ProductLaunchTemplate } from "./templates/ProductLaunchTemplate";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getLandingPage(slug);
  
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
  const page = getLandingPage(slug);
  
  if (!page || page.status !== "published") {
    notFound();
  }
  
  // Track view
  incrementViews(slug);
  
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
