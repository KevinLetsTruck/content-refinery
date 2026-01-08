import { NextRequest, NextResponse } from "next/server";
import { listFunnels, listFunnelsByStatus } from "@/lib/funnels/storage";
import { createFunnel } from "@/lib/funnels/funnel-builder";
import { CreateFunnelInput, FunnelStatus } from "@/lib/funnels/types";

/**
 * GET /api/funnels
 * Return list of all funnels from storage
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as FunnelStatus | null;

    // Filter by status if provided
    const funnels = status ? listFunnelsByStatus(status) : listFunnels();

    return NextResponse.json({
      total: funnels.length,
      funnels,
    });
  } catch (error) {
    console.error("[API] Funnels list error:", error);
    return NextResponse.json(
      { error: "Failed to list funnels" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/funnels
 * Create new funnel - kicks off full generation process
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateFunnelInput = await request.json();

    // Validate required fields
    if (!body.name || !body.type || !body.goal || !body.topic) {
      return NextResponse.json(
        { error: "Missing required fields: name, type, goal, topic" },
        { status: 400 }
      );
    }

    // Validate platforms
    if (!body.platforms || body.platforms.length === 0) {
      return NextResponse.json(
        { error: "At least one platform is required" },
        { status: 400 }
      );
    }

    // Set defaults
    const input: CreateFunnelInput = {
      ...body,
      postsPerDay: body.postsPerDay || { twitter: 1, facebook: 1, instagram: 1 },
      durationDays: body.durationDays || 7,
      startDate: body.startDate || new Date().toISOString(),
      emailCount: body.emailCount || 5,
      landingPage: body.landingPage || {},
    };

    console.log("[API] Creating funnel:", input.name);

    // Build the complete funnel (this generates all content)
    const funnel = await createFunnel(input);

    return NextResponse.json({
      success: true,
      funnel,
      message: "Funnel created successfully. Content has been generated.",
    });
  } catch (error) {
    console.error("[API] Funnel create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create funnel" },
      { status: 500 }
    );
  }
}
