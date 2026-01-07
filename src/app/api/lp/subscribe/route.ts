import { NextRequest, NextResponse } from "next/server";
import { getLandingPage, incrementConversions } from "@/lib/landing-pages/storage";

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

// In-memory store for subscribers (replace with database in production)
const subscribers: Array<{
  email: string;
  firstName?: string;
  lastName?: string;
  slug: string;
  timestamp: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
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
    
    // Store subscriber locally
    subscribers.push({
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      slug: body.slug,
      timestamp: new Date().toISOString(),
      utm_source: body.utm_source,
      utm_medium: body.utm_medium,
      utm_campaign: body.utm_campaign,
    });
    
    // Track conversion
    incrementConversions(body.slug);
    
    // TODO: Add to Constant Contact when configured
    // if (page.constantContactListId) {
    //   await addToConstantContact({
    //     email: body.email,
    //     firstName: body.firstName,
    //     lastName: body.lastName,
    //     listId: page.constantContactListId,
    //   });
    // }
    
    console.log(`[Landing Page] New subscriber: ${body.email} for ${body.slug}`);
    
    return NextResponse.json({
      success: true,
      message: "Subscription successful",
      downloadUrl: page.leadMagnet?.downloadUrl,
    });
    
  } catch (error) {
    console.error("[Landing Page] Subscription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve subscribers (admin only, add auth later)
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
