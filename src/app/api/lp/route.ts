import { NextRequest, NextResponse } from "next/server";
import { 
  getAllLandingPages, 
  getLandingPage, 
  saveLandingPage, 
  deleteLandingPage 
} from "@/lib/landing-pages/storage";
import { LandingPageData } from "@/lib/landing-pages/types";

// GET - List all landing pages or get one by slug
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  
  if (slug) {
    const page = getLandingPage(slug);
    if (!page) {
      return NextResponse.json({ error: "Landing page not found" }, { status: 404 });
    }
    return NextResponse.json(page);
  }
  
  const pages = getAllLandingPages();
  return NextResponse.json({
    total: pages.length,
    pages: pages.map(p => ({
      slug: p.slug,
      title: p.title,
      template: p.template,
      status: p.status,
      views: p.views || 0,
      conversions: p.conversions || 0,
      conversionRate: p.views ? ((p.conversions || 0) / p.views * 100).toFixed(1) + "%" : "0%",
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
  });
}

// POST - Create new landing page
export async function POST(request: NextRequest) {
  try {
    const body: Partial<LandingPageData> = await request.json();
    
    if (!body.slug || !body.headline || !body.template) {
      return NextResponse.json(
        { error: "slug, headline, and template are required" },
        { status: 400 }
      );
    }
    
    // Check if slug already exists
    if (getLandingPage(body.slug)) {
      return NextResponse.json(
        { error: "Landing page with this slug already exists" },
        { status: 409 }
      );
    }
    
    const page: LandingPageData = {
      slug: body.slug,
      template: body.template,
      status: body.status || "draft",
      title: body.title || body.headline,
      headline: body.headline,
      subheadline: body.subheadline,
      benefits: body.benefits || [],
      trustElements: body.trustElements || [],
      leadMagnet: body.leadMagnet,
      ctaText: body.ctaText || "Get Access",
      ctaSubtext: body.ctaSubtext,
      formFields: body.formFields || ["email"],
      constantContactListId: body.constantContactListId,
      thankYou: body.thankYou || {
        headline: "Success!",
        message: "Check your email.",
        ctas: [],
      },
      utmCampaign: body.utmCampaign,
      primaryColor: body.primaryColor,
      accentColor: body.accentColor,
      darkMode: body.darkMode ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      views: 0,
      conversions: 0,
    };
    
    saveLandingPage(page);
    
    return NextResponse.json({
      success: true,
      page,
      url: `/lp/${page.slug}`,
    });
    
  } catch (error) {
    console.error("[Landing Pages] Create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update existing landing page
export async function PUT(request: NextRequest) {
  try {
    const body: Partial<LandingPageData> & { slug: string } = await request.json();
    
    if (!body.slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }
    
    const existing = getLandingPage(body.slug);
    if (!existing) {
      return NextResponse.json({ error: "Landing page not found" }, { status: 404 });
    }
    
    const updated: LandingPageData = {
      ...existing,
      ...body,
      updatedAt: new Date().toISOString(),
    };
    
    saveLandingPage(updated);
    
    return NextResponse.json({
      success: true,
      page: updated,
    });
    
  } catch (error) {
    console.error("[Landing Pages] Update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete landing page
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }
  
  const deleted = deleteLandingPage(slug);
  
  if (!deleted) {
    return NextResponse.json({ error: "Landing page not found" }, { status: 404 });
  }
  
  return NextResponse.json({ success: true, deleted: slug });
}
