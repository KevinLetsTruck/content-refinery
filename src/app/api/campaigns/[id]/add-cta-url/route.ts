import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

/**
 * POST /api/campaigns/[id]/add-cta-url
 *
 * Add or update the landing page URL in all campaign posts.
 * This is useful when a landing page was generated after the campaign posts were created.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { ctaUrl } = body;

    if (!ctaUrl) {
      return NextResponse.json(
        { error: "ctaUrl is required" },
        { status: 400 }
      );
    }

    // Get the campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        posts: {
          where: {
            status: { in: ["draft", "scheduled"] }, // Only update unpublished posts
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Update campaign's CTA URL
    await prisma.campaign.update({
      where: { id },
      data: {
        ctaUrl,
        productUrl: ctaUrl, // Also update productUrl for consistency
      },
    });

    // CTA phrases that indicate a post should have a URL
    const ctaPhrases = [
      "get the",
      "grab the",
      "download",
      "sign up",
      "join",
      "learn more",
      "check out",
      "discover",
      "take control",
      "start your",
      "free guide",
      "get your",
      "claim",
    ];

    let updatedCount = 0;
    let skippedCount = 0;

    for (const post of campaign.posts) {
      const contentLower = post.content.toLowerCase();

      // Check if post already has a URL
      if (post.content.includes("http://") || post.content.includes("https://")) {
        skippedCount++;
        continue;
      }

      // Check if post has CTA language
      const hasCtaPhrase = ctaPhrases.some(phrase => contentLower.includes(phrase));

      if (hasCtaPhrase) {
        // Add the URL to the post content
        let newContent = post.content;

        // For Twitter, keep it short - just append the URL
        if (post.platform === "twitter") {
          // Check if adding URL would exceed Twitter's character limit
          const hashtagLength = post.hashtags.reduce((sum, tag) => sum + tag.length + 2, 0);
          const totalLength = post.content.length + hashtagLength + ctaUrl.length + 2;

          if (totalLength > 280) {
            // Truncate content to fit
            const maxContentLength = 275 - hashtagLength - ctaUrl.length;
            if (maxContentLength > 50) {
              newContent = post.content.substring(0, maxContentLength - 3) + "...\n\n" + ctaUrl;
            } else {
              // Can't fit URL, skip
              skippedCount++;
              continue;
            }
          } else {
            newContent = post.content + "\n\n" + ctaUrl;
          }
        } else {
          // For other platforms, add URL at the end
          newContent = post.content + "\n\n" + ctaUrl;
        }

        await prisma.campaignPost.update({
          where: { id: post.id },
          data: { content: newContent },
        });

        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      ctaUrl,
      totalPosts: campaign.posts.length,
      updatedPosts: updatedCount,
      skippedPosts: skippedCount,
      message: `Added landing page URL to ${updatedCount} posts. ${skippedCount} posts were skipped (already have URL or no CTA language).`,
    });

  } catch (error) {
    console.error("[Campaign] Add CTA URL error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add CTA URL" },
      { status: 500 }
    );
  }
}
