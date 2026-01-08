import { NextRequest, NextResponse } from "next/server";
import { getFunnel, updateFunnel } from "@/lib/funnels/storage";
import { FunnelPost } from "@/lib/funnels/types";

/**
 * GET /api/funnels/[id]/posts
 * Return just the social posts for a funnel
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

    return NextResponse.json({
      platforms: funnel.socialCampaign.platforms,
      postsPerDay: funnel.socialCampaign.postsPerDay,
      durationDays: funnel.socialCampaign.durationDays,
      startDate: funnel.socialCampaign.startDate,
      posts: funnel.socialCampaign.posts,
    });
  } catch (error) {
    console.error("[API] Funnel posts get error:", error);
    return NextResponse.json(
      { error: "Failed to get posts" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/funnels/[id]/posts
 * Update social posts for a funnel
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

    // Validate posts array
    if (!Array.isArray(body.posts)) {
      return NextResponse.json(
        { error: "Request body must contain a 'posts' array" },
        { status: 400 }
      );
    }

    // Validate each post has required fields
    for (const post of body.posts) {
      if (!post.id || !post.platform || !post.content) {
        return NextResponse.json(
          { error: "Each post must have id, platform, and content" },
          { status: 400 }
        );
      }
    }

    // Update the posts
    const updatedPosts: FunnelPost[] = body.posts.map((post: Partial<FunnelPost>) => ({
      id: post.id || `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      platform: post.platform || "twitter",
      content: post.content || "",
      hashtags: post.hashtags || [],
      dayNumber: post.dayNumber ?? 1,
      scheduledFor: post.scheduledFor,
      landingPageUrl: post.landingPageUrl || funnel.socialCampaign.posts[0]?.landingPageUrl || "",
      status: post.status || "draft",
    }));

    const updated = updateFunnel(id, {
      socialCampaign: {
        ...funnel.socialCampaign,
        posts: updatedPosts,
      },
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update posts" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      posts: updated.socialCampaign.posts,
    });
  } catch (error) {
    console.error("[API] Funnel posts update error:", error);
    return NextResponse.json(
      { error: "Failed to update posts" },
      { status: 500 }
    );
  }
}
