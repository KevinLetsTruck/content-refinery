import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getVideoProject, updateVideoProject } from "@/lib/video/storage";
import {
  uploadVideo as uploadYouTubeVideo,
  isConfigured as isYouTubeConfigured,
} from "@/lib/social/youtube";
import { parseAndValidate, notFound, badRequest } from "@/lib/utils/api";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for video upload

const PublishSchema = z.object({
  privacyStatus: z.enum(["public", "unlisted", "private"]).default("public"),
  playlistId: z.string().optional(),
});

/**
 * POST /api/video/[id]/publish-youtube
 *
 * Publish a completed video project to YouTube Shorts
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check YouTube is configured
    if (!isYouTubeConfigured()) {
      return NextResponse.json(
        {
          error: "YouTube not configured",
          message:
            "Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN",
        },
        { status: 503 }
      );
    }

    // Get the video project
    const project = getVideoProject(id);
    if (!project) {
      return notFound("Video project");
    }

    // Check project is complete
    if (project.status !== "complete") {
      return badRequest(
        `Video must be complete before publishing. Current status: ${project.status}`
      );
    }

    // Check we have an output video
    if (!project.outputUrl) {
      return badRequest("No output video found. Generate the video first.");
    }

    // Parse options
    const { data, error } = await parseAndValidate(request, PublishSchema);
    if (error) return error;

    const { privacyStatus, playlistId } = data || { privacyStatus: "public" };

    console.log(`[YouTube] Publishing project ${id} as Short...`);

    // Read the video file
    const fs = await import("fs/promises");
    let videoBuffer: Buffer;

    try {
      // If it's a local file path
      if (project.outputUrl.startsWith("/") || project.outputUrl.startsWith("./")) {
        videoBuffer = await fs.readFile(project.outputUrl);
      } else if (project.outputUrl.startsWith("http")) {
        // If it's a URL (R2 or other remote storage)
        const response = await fetch(project.outputUrl);
        if (!response.ok) {
          throw new Error(`Failed to download video: ${response.status}`);
        }
        videoBuffer = Buffer.from(await response.arrayBuffer());
      } else {
        // Assume it's a local path without leading slash
        videoBuffer = await fs.readFile(project.outputUrl);
      }
    } catch (err) {
      console.error("[YouTube] Failed to read video file:", err);
      return badRequest(`Cannot read video file: ${project.outputUrl}`);
    }

    // Read thumbnail if available
    let thumbnailBuffer: Buffer | undefined;
    if (project.thumbnailUrl) {
      try {
        if (project.thumbnailUrl.startsWith("http")) {
          const response = await fetch(project.thumbnailUrl);
          if (response.ok) {
            thumbnailBuffer = Buffer.from(await response.arrayBuffer());
          }
        } else {
          thumbnailBuffer = await fs.readFile(project.thumbnailUrl);
        }
      } catch {
        console.warn("[YouTube] Failed to read thumbnail, continuing without");
      }
    }

    // Build title and description
    const title = project.youtubeTitle || project.title || `Let's Truck - ${project.topic}`;
    const description =
      project.youtubeDescription ||
      project.script?.hook ||
      `${project.topic}\n\nLet's Truck Health Coaching - Helping professional drivers live longer, healthier lives.`;

    const tags = project.youtubeTags || [
      "trucking",
      "truck driver health",
      "owner operator",
      "lets truck",
      "kevin rutherford",
    ];

    // Upload to YouTube
    const result = await uploadYouTubeVideo({
      title,
      description,
      tags,
      videoBuffer,
      thumbnailBuffer,
      isShort: true, // Always upload as Short from this endpoint
      privacyStatus,
      playlistId,
    });

    console.log(`[YouTube] Published successfully: ${result.url}`);

    // Update project with YouTube info
    updateVideoProject(id, {
      youtubeVideoId: result.id,
      youtubeShortUrl: result.url,
    });

    return NextResponse.json({
      success: true,
      projectId: id,
      youtube: {
        videoId: result.id,
        url: result.url,
        title: result.title,
        isShort: true,
      },
    });
  } catch (error) {
    console.error("[YouTube] Publish error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Publishing failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/video/[id]/publish-youtube
 *
 * Check YouTube publish status for a video project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const project = getVideoProject(id);
  if (!project) {
    return notFound("Video project");
  }

  return NextResponse.json({
    projectId: id,
    status: project.status,
    youtubeConfigured: isYouTubeConfigured(),
    hasOutputVideo: !!project.outputUrl,
    youtube: project.youtubeVideoId
      ? {
          videoId: project.youtubeVideoId,
          url: project.youtubeShortUrl,
          published: true,
        }
      : {
          published: false,
        },
    metadata: {
      title: project.youtubeTitle || project.title,
      description: project.youtubeDescription,
      tags: project.youtubeTags,
    },
  });
}
