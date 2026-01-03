import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

interface PublishRequest {
  content: {
    text: string;
    hashtags: string[];
    platforms: string[];
  };
  visuals: {
    platform: string;
    gammaUrl?: string;
    generationId?: string;
  }[];
  publishOption: "now" | "schedule" | "queue" | "draft";
  scheduledTime?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PublishRequest = await request.json();
    const { content, visuals, publishOption, scheduledTime } = body;

    if (!content || !content.text) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    // Determine status based on publish option
    let status: string;
    switch (publishOption) {
      case "now":
        status = "publishing";
        break;
      case "schedule":
        status = "scheduled";
        break;
      case "queue":
        status = "pending";
        break;
      case "draft":
        status = "draft";
        break;
      default:
        status = "draft";
    }

    // Create generated content records for each platform
    const createdContent = await Promise.all(
      content.platforms.map(async (platform) => {
        const visual = visuals.find((v) => v.platform === platform);

        return prisma.generatedContent.create({
          data: {
            platform,
            text: content.text,
            hashtags: content.hashtags,
            status,
            scheduledFor: scheduledTime ? new Date(scheduledTime) : null,
            mediaUrl: visual?.gammaUrl || null,
            metadata: {
              gammaGenerationId: visual?.generationId,
              createdVia: "wizard",
              publishOption,
            },
          },
        });
      })
    );

    // If publishing now, trigger the actual publish (placeholder for MVP)
    if (publishOption === "now") {
      // In production, this would call social media APIs
      // For MVP, we just mark as published after a delay
      setTimeout(async () => {
        await Promise.all(
          createdContent.map((c) =>
            prisma.generatedContent.update({
              where: { id: c.id },
              data: {
                status: "published",
                publishedAt: new Date(),
              },
            })
          )
        );
      }, 2000);
    }

    return NextResponse.json({
      success: true,
      message: `Content ${publishOption === "now" ? "published" : publishOption === "schedule" ? "scheduled" : publishOption === "queue" ? "queued" : "saved"}`,
      contentIds: createdContent.map((c) => c.id),
      platforms: content.platforms,
      scheduledFor: scheduledTime || null,
    });
  } catch (error) {
    console.error("[Create/Publish] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
