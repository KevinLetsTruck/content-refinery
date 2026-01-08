import { NextRequest, NextResponse } from "next/server";
import { getFunnel, updateFunnel, deleteFunnel } from "@/lib/funnels/storage";
import { deleteLandingPage } from "@/lib/landing-pages/storage";
import { Funnel } from "@/lib/funnels/types";

/**
 * GET /api/funnels/[id]
 * Return single funnel by ID with all details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const funnel = getFunnel(id);

    if (!funnel) {
      return NextResponse.json(
        { error: "Funnel not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ funnel });
  } catch (error) {
    console.error("[API] Funnel get error:", error);
    return NextResponse.json(
      { error: "Failed to get funnel" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/funnels/[id]
 * Update funnel fields
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const funnel = getFunnel(id);
    if (!funnel) {
      return NextResponse.json(
        { error: "Funnel not found" },
        { status: 404 }
      );
    }

    const updated = updateFunnel(id, body);
    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update funnel" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      funnel: updated,
    });
  } catch (error) {
    console.error("[API] Funnel update error:", error);
    return NextResponse.json(
      { error: "Failed to update funnel" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/funnels/[id]
 * Delete funnel and associated landing page
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const funnel = getFunnel(id);
    if (!funnel) {
      return NextResponse.json(
        { error: "Funnel not found" },
        { status: 404 }
      );
    }

    // Delete associated landing page
    if (funnel.landingPage?.slug) {
      deleteLandingPage(funnel.landingPage.slug);
    }

    // Delete the funnel
    const deleted = deleteFunnel(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Failed to delete funnel" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Funnel delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete funnel" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/funnels/[id]?action=launch|pause
 * Handle funnel actions: launch or pause
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    const funnel = getFunnel(id);
    if (!funnel) {
      return NextResponse.json(
        { error: "Funnel not found" },
        { status: 404 }
      );
    }

    let updated: Funnel | null = null;

    if (action === "launch") {
      // Change status to active and set launchedAt
      updated = updateFunnel(id, {
        status: "active",
        launchedAt: new Date().toISOString(),
      });
    } else if (action === "pause") {
      // Change status to paused
      updated = updateFunnel(id, {
        status: "paused",
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use ?action=launch or ?action=pause" },
        { status: 400 }
      );
    }

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update funnel status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      funnel: updated,
    });
  } catch (error) {
    console.error("[API] Funnel action error:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}
