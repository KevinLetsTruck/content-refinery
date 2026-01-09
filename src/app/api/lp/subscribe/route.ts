import { NextRequest, NextResponse } from "next/server";
import { getLandingPage, incrementConversions } from "@/lib/landing-pages/storage";
import { getConstantContactClient } from "@/lib/constant-contact/client";

interface SubscribeRequest {
  slug: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
}

// In-memory store for subscribers (backup/fallback)
const subscribers: Array<{
  email: string;
  firstName?: string;
  lastName?: string;
  slug: string;
  timestamp: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  addedToCC: boolean;
}> = [];

export async function POST(request: NextRequest) {
  try {
    const body: SubscribeRequest = await request.json();
    
    // Validate required fields
    if (!body.email || !body.slug) {
      return NextResponse.json(
        { error: "Email and slug are required" },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }
    
    // Get the landing page
    const page = getLandingPage(body.slug);
    if (!page) {
      return NextResponse.json(
        { error: "Landing page not found" },
        { status: 404 }
      );
    }
    
    // Track conversion
    incrementConversions(body.slug);
    
    // Try to add to Constant Contact
    let addedToCC = false;
    let ccError: string | null = null;
    
    try {
      const ccClient = getConstantContactClient();
      const isAuth = await ccClient.isAuthenticated();

      if (isAuth && page.constantContactListId) {
        await ccClient.upsertContact({
          email: body.email,
          firstName: body.firstName,
          lastName: body.lastName,
          listIds: [page.constantContactListId],
        });
        addedToCC = true;
        console.log(`[Subscribe] Added ${body.email} to CC list ${page.constantContactListId}`);
      } else if (!isAuth) {
        console.log("[Subscribe] CC not authenticated, storing locally only");
      } else if (!page.constantContactListId) {
        console.log("[Subscribe] No CC list configured for this page");
      }
    } catch (error) {
      ccError = error instanceof Error ? error.message : "CC error";
      console.error("[Subscribe] Constant Contact error:", error);
      // Don't fail the request if CC fails - we still have local storage
    }
    
    // Store subscriber locally (backup)
    subscribers.push({
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      slug: body.slug,
      timestamp: new Date().toISOString(),
      utm_source: body.utm_source,
      utm_medium: body.utm_medium,
      utm_campaign: body.utm_campaign,
      addedToCC,
    });
    
    console.log(`[Subscribe] New subscriber: ${body.email} for ${body.slug} (CC: ${addedToCC})`);
    
    return NextResponse.json({
      success: true,
      message: "Subscription successful",
      downloadUrl: page.leadMagnet?.downloadUrl,
      addedToCC,
      ...(ccError && { ccWarning: "Email saved but Constant Contact sync failed" }),
    });
    
  } catch (error) {
    console.error("[Subscribe] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve subscribers (admin only)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  
  let results = subscribers;
  
  if (slug) {
    results = subscribers.filter(s => s.slug === slug);
  }
  
  return NextResponse.json({
    total: results.length,
    subscribers: results,
  });
}
