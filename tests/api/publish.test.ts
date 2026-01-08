/**
 * Tests for the Publish API route
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Prisma
vi.mock("@/lib/db/prisma", () => ({
  default: {
    generatedContent: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    extraction: {
      update: vi.fn(),
    },
  },
}));

// Mock Twitter client
vi.mock("@/lib/social/twitter", () => ({
  postTweet: vi.fn(),
  uploadMedia: vi.fn(),
  isConfigured: vi.fn(),
}));

// Mock Meta client
vi.mock("@/lib/social/meta", () => ({
  postToFacebook: vi.fn(),
  postToInstagram: vi.fn(),
  isConfigured: vi.fn(),
}));

// Mock analytics
vi.mock("@/lib/analytics/track-performance", () => ({
  trackPublish: vi.fn(),
}));

describe("POST /api/publish", () => {
  let mockPrisma: any;
  let mockTwitter: any;
  let mockMeta: any;
  let mockTrack: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPrisma = (await import("@/lib/db/prisma")).default;
    mockTwitter = await import("@/lib/social/twitter");
    mockMeta = await import("@/lib/social/meta");
    mockTrack = await import("@/lib/analytics/track-performance");
  });

  const createRequest = (body: unknown) => {
    return new NextRequest("http://localhost:3000/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  describe("Validation", () => {
    it("returns 400 when contentId is missing", async () => {
      const { POST } = await import("@/app/api/publish/route");
      const request = createRequest({});

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("contentId");
    });

    it("returns 404 when content not found", async () => {
      mockPrisma.generatedContent.findUnique.mockResolvedValue(null);

      const { POST } = await import("@/app/api/publish/route");
      const request = createRequest({ contentId: "nonexistent" });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("not found");
    });

    it("returns 400 when content already published", async () => {
      mockPrisma.generatedContent.findUnique.mockResolvedValue({
        id: "content-1",
        status: "published",
        platformPostUrl: "https://x.com/post/123",
      });

      const { POST } = await import("@/app/api/publish/route");
      const request = createRequest({ contentId: "content-1" });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("already published");
      expect(data.platformPostUrl).toBe("https://x.com/post/123");
    });

    it("returns 400 when content not approved", async () => {
      mockPrisma.generatedContent.findUnique.mockResolvedValue({
        id: "content-1",
        status: "pending_review",
        platform: "twitter",
      });

      const { POST } = await import("@/app/api/publish/route");
      const request = createRequest({ contentId: "content-1" });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("approved");
      expect(data.error).toContain("pending_review");
    });

    it("returns 400 when scheduled for future without immediate flag", async () => {
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow
      mockPrisma.generatedContent.findUnique.mockResolvedValue({
        id: "content-1",
        status: "scheduled",
        platform: "twitter",
        scheduledFor: futureDate,
      });

      const { POST } = await import("@/app/api/publish/route");
      const request = createRequest({ contentId: "content-1", immediate: false });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("scheduled");
      expect(data.error).toContain("immediate");
    });
  });

  describe("Twitter Publishing", () => {
    beforeEach(() => {
      mockTwitter.isConfigured.mockReturnValue(true);
      mockTwitter.postTweet.mockResolvedValue({
        id: "tweet-123",
        text: "Published tweet",
        url: "https://x.com/lets_truck/status/tweet-123",
      });
      mockPrisma.generatedContent.update.mockResolvedValue({});
      mockPrisma.extraction.update.mockResolvedValue({});
      mockTrack.trackPublish.mockResolvedValue({});
    });

    it("publishes to Twitter successfully", async () => {
      mockPrisma.generatedContent.findUnique.mockResolvedValue({
        id: "content-1",
        status: "approved",
        platform: "twitter",
        text: "Test tweet content",
        hashtags: ["LetsTruck", "DriverHealth"],
        extractionId: "extract-1",
        extraction: { type: "quote", source: {} },
        metadata: {},
      });

      const { POST } = await import("@/app/api/publish/route");
      const request = createRequest({ contentId: "content-1" });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.platform).toBe("twitter");
      expect(data.postId).toBe("tweet-123");
      expect(data.postUrl).toContain("x.com");
    });

    it("updates content status to published", async () => {
      mockPrisma.generatedContent.findUnique.mockResolvedValue({
        id: "content-1",
        status: "approved",
        platform: "twitter",
        text: "Test tweet",
        hashtags: [],
        extractionId: "extract-1",
        extraction: { type: "quote", source: {} },
        metadata: {},
      });

      const { POST } = await import("@/app/api/publish/route");
      await POST(createRequest({ contentId: "content-1" }));

      expect(mockPrisma.generatedContent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "content-1" },
          data: expect.objectContaining({
            status: "published",
            platformPostId: "tweet-123",
          }),
        })
      );
    });

    it("marks extraction as used", async () => {
      mockPrisma.generatedContent.findUnique.mockResolvedValue({
        id: "content-1",
        status: "approved",
        platform: "twitter",
        text: "Test tweet",
        hashtags: [],
        extractionId: "extract-1",
        extraction: { type: "quote", source: {} },
        metadata: {},
      });

      const { POST } = await import("@/app/api/publish/route");
      await POST(createRequest({ contentId: "content-1" }));

      expect(mockPrisma.extraction.update).toHaveBeenCalledWith({
        where: { id: "extract-1" },
        data: { isUsed: true },
      });
    });

    it("tracks publish for analytics", async () => {
      mockPrisma.generatedContent.findUnique.mockResolvedValue({
        id: "content-1",
        status: "approved",
        platform: "twitter",
        text: "Test tweet",
        hashtags: [],
        extractionId: "extract-1",
        extraction: { type: "quote", source: {} },
        metadata: { formula: "data_bomb", pillar: "gut_health" },
      });

      const { POST } = await import("@/app/api/publish/route");
      await POST(createRequest({ contentId: "content-1" }));

      expect(mockTrack.trackPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          generatedContentId: "content-1",
          platform: "twitter",
          formula: "data_bomb",
          pillar: "gut_health",
        })
      );
    });

    it("includes hashtags in tweet if room permits", async () => {
      mockPrisma.generatedContent.findUnique.mockResolvedValue({
        id: "content-1",
        status: "approved",
        platform: "twitter",
        text: "Short tweet",
        hashtags: ["LetsTruck", "DriverHealth"],
        extractionId: null,
        metadata: {},
      });

      const { POST } = await import("@/app/api/publish/route");
      await POST(createRequest({ contentId: "content-1" }));

      const tweetCall = mockTwitter.postTweet.mock.calls[0][0];
      expect(tweetCall.text).toContain("#LetsTruck");
      expect(tweetCall.text).toContain("#DriverHealth");
    });

    it("uploads media when mediaUrl is present", async () => {
      mockTwitter.uploadMedia.mockResolvedValue("media-id-123");

      mockPrisma.generatedContent.findUnique.mockResolvedValue({
        id: "content-1",
        status: "approved",
        platform: "twitter",
        text: "Tweet with image",
        hashtags: [],
        mediaUrl: "https://example.com/image.png",
        extractionId: null,
        metadata: {},
      });

      const { POST } = await import("@/app/api/publish/route");
      await POST(createRequest({ contentId: "content-1" }));

      expect(mockTwitter.uploadMedia).toHaveBeenCalledWith("https://example.com/image.png");
      expect(mockTwitter.postTweet).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaIds: ["media-id-123"],
        })
      );
    });

    it("continues without media if upload fails", async () => {
      mockTwitter.uploadMedia.mockRejectedValue(new Error("Upload failed"));

      mockPrisma.generatedContent.findUnique.mockResolvedValue({
        id: "content-1",
        status: "approved",
        platform: "twitter",
        text: "Tweet with failed image",
        hashtags: [],
        mediaUrl: "https://example.com/image.png",
        extractionId: null,
        metadata: {},
      });

      const { POST } = await import("@/app/api/publish/route");
      const response = await POST(createRequest({ contentId: "content-1" }));

      expect(response.status).toBe(200);
      expect(mockTwitter.postTweet).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaIds: undefined,
        })
      );
    });

    it("returns error when Twitter not configured", async () => {
      mockTwitter.isConfigured.mockReturnValue(false);

      mockPrisma.generatedContent.findUnique.mockResolvedValue({
        id: "content-1",
        status: "approved",
        platform: "twitter",
        text: "Test tweet",
        hashtags: [],
        extractionId: null,
        metadata: {},
      });

      const { POST } = await import("@/app/api/publish/route");
      const response = await POST(createRequest({ contentId: "content-1" }));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain("Twitter credentials not configured");
    });
  });

  describe("Platform Routing", () => {
    beforeEach(() => {
      mockMeta.isConfigured.mockReturnValue({ instagram: true, facebook: true });
      mockPrisma.generatedContent.update.mockResolvedValue({});
      mockTrack.trackPublish.mockResolvedValue({});
    });

    it("returns 501 for LinkedIn (not implemented)", async () => {
      mockPrisma.generatedContent.findUnique.mockResolvedValue({
        id: "content-1",
        status: "approved",
        platform: "linkedin",
        text: "LinkedIn post",
        hashtags: [],
        metadata: {},
      });

      const { POST } = await import("@/app/api/publish/route");
      const response = await POST(createRequest({ contentId: "content-1" }));
      const data = await response.json();

      expect(response.status).toBe(501);
      expect(data.error).toContain("LinkedIn");
      expect(data.error).toContain("not yet implemented");
    });

    it("returns 501 for TikTok (not implemented)", async () => {
      mockPrisma.generatedContent.findUnique.mockResolvedValue({
        id: "content-1",
        status: "approved",
        platform: "tiktok",
        text: "TikTok post",
        hashtags: [],
        metadata: {},
      });

      const { POST } = await import("@/app/api/publish/route");
      const response = await POST(createRequest({ contentId: "content-1" }));
      const data = await response.json();

      expect(response.status).toBe(501);
      expect(data.error).toContain("TikTok");
    });

    it("returns 400 for unknown platform", async () => {
      mockPrisma.generatedContent.findUnique.mockResolvedValue({
        id: "content-1",
        status: "approved",
        platform: "unknown_platform",
        text: "Unknown",
        hashtags: [],
        metadata: {},
      });

      const { POST } = await import("@/app/api/publish/route");
      const response = await POST(createRequest({ contentId: "content-1" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Unknown platform");
    });

    it("publishes to Instagram with required image", async () => {
      mockMeta.postToInstagram.mockResolvedValue({
        id: "ig-post-123",
        url: "https://instagram.com/p/123",
      });

      mockPrisma.generatedContent.findUnique.mockResolvedValue({
        id: "content-1",
        status: "approved",
        platform: "instagram",
        text: "Instagram caption",
        hashtags: ["LetsTruck"],
        mediaUrl: "https://example.com/image.jpg",
        extractionId: null,
        metadata: {},
      });

      const { POST } = await import("@/app/api/publish/route");
      const response = await POST(createRequest({ contentId: "content-1" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.platform).toBe("instagram");
      expect(mockMeta.postToInstagram).toHaveBeenCalled();
    });

    it("returns error for Instagram without image", async () => {
      mockPrisma.generatedContent.findUnique.mockResolvedValue({
        id: "content-1",
        status: "approved",
        platform: "instagram",
        text: "Instagram caption",
        hashtags: [],
        mediaUrl: null,
        extractionId: null,
        metadata: {},
      });

      const { POST } = await import("@/app/api/publish/route");
      const response = await POST(createRequest({ contentId: "content-1" }));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain("require");
      expect(data.error).toContain("image");
    });

    it("publishes to Facebook", async () => {
      mockMeta.postToFacebook.mockResolvedValue({
        id: "fb-post-123",
        url: "https://facebook.com/post/123",
      });

      mockPrisma.generatedContent.findUnique.mockResolvedValue({
        id: "content-1",
        status: "approved",
        platform: "facebook",
        text: "Facebook post",
        hashtags: ["LetsTruck"],
        mediaUrl: null,
        extractionId: null,
        metadata: {},
      });

      const { POST } = await import("@/app/api/publish/route");
      const response = await POST(createRequest({ contentId: "content-1" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.platform).toBe("facebook");
      expect(mockMeta.postToFacebook).toHaveBeenCalled();
    });
  });

  describe("Immediate Publishing", () => {
    beforeEach(() => {
      mockTwitter.isConfigured.mockReturnValue(true);
      mockTwitter.postTweet.mockResolvedValue({
        id: "tweet-123",
        url: "https://x.com/lets_truck/status/tweet-123",
      });
      mockPrisma.generatedContent.update.mockResolvedValue({});
      mockTrack.trackPublish.mockResolvedValue({});
    });

    it("allows publishing scheduled content with immediate=true", async () => {
      const futureDate = new Date(Date.now() + 86400000);
      mockPrisma.generatedContent.findUnique.mockResolvedValue({
        id: "content-1",
        status: "scheduled",
        platform: "twitter",
        text: "Scheduled tweet",
        hashtags: [],
        scheduledFor: futureDate,
        extractionId: null,
        metadata: {},
      });

      const { POST } = await import("@/app/api/publish/route");
      const response = await POST(createRequest({ contentId: "content-1", immediate: true }));

      expect(response.status).toBe(200);
    });
  });
});

describe("GET /api/publish", () => {
  let mockTwitter: any;
  let mockMeta: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockTwitter = await import("@/lib/social/twitter");
    mockMeta = await import("@/lib/social/meta");
  });

  it("returns platform configuration status", async () => {
    mockTwitter.isConfigured.mockReturnValue(true);
    mockMeta.isConfigured.mockReturnValue({ instagram: true, facebook: false });

    const { GET } = await import("@/app/api/publish/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.platforms).toBeDefined();
    expect(data.platforms.twitter.configured).toBe(true);
    expect(data.platforms.instagram.configured).toBe(true);
    expect(data.platforms.facebook.configured).toBe(false);
    expect(data.platforms.linkedin.configured).toBe(false);
    expect(data.platforms.tiktok.configured).toBe(false);
  });

  it("indicates Instagram requires image", async () => {
    mockTwitter.isConfigured.mockReturnValue(true);
    mockMeta.isConfigured.mockReturnValue({ instagram: true, facebook: true });

    const { GET } = await import("@/app/api/publish/route");
    const response = await GET();
    const data = await response.json();

    expect(data.platforms.instagram.requiresImage).toBe(true);
  });
});
