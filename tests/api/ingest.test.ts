/**
 * Tests for the Ingest API route
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Prisma before importing the route
vi.mock("@/lib/db/prisma", () => ({
  default: {
    sourceApp: {
      findUnique: vi.fn(),
    },
    source: {
      create: vi.fn(),
      update: vi.fn(),
    },
    transcript: {
      create: vi.fn(),
    },
  },
}));

// Mock fetch for processing trigger
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("POST /api/ingest", () => {
  let mockPrisma: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPrisma = (await import("@/lib/db/prisma")).default;

    // Reset fetch mock
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  const createRequest = (body: unknown, authHeader?: string) => {
    const headers = new Headers();
    if (authHeader) {
      headers.set("Authorization", authHeader);
    }
    headers.set("Content-Type", "application/json");

    return new NextRequest("http://localhost:3000/api/ingest", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  };

  describe("Authentication", () => {
    it("returns 401 when authorization header is missing", async () => {
      const { POST } = await import("@/app/api/ingest/route");
      const request = createRequest({ source: "audioroad", contentType: "episode", title: "Test" });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain("authorization");
    });

    it("returns 401 when authorization header format is invalid", async () => {
      const { POST } = await import("@/app/api/ingest/route");
      const request = createRequest(
        { source: "audioroad", contentType: "episode", title: "Test" },
        "InvalidFormat token123"
      );

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("returns 401 when API key is not found", async () => {
      mockPrisma.sourceApp.findUnique.mockResolvedValue(null);

      const { POST } = await import("@/app/api/ingest/route");
      const request = createRequest(
        { source: "audioroad", contentType: "episode", title: "Test" },
        "Bearer invalid_api_key"
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain("Invalid API key");
    });

    it("returns 403 when source app is disabled", async () => {
      mockPrisma.sourceApp.findUnique.mockResolvedValue({
        id: "app-1",
        name: "audioroad",
        isActive: false,
        voiceProfile: "kevin-health",
      });

      const { POST } = await import("@/app/api/ingest/route");
      const request = createRequest(
        { source: "audioroad", contentType: "episode", title: "Test" },
        "Bearer valid_api_key"
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("disabled");
    });
  });

  describe("Payload Validation", () => {
    beforeEach(() => {
      mockPrisma.sourceApp.findUnique.mockResolvedValue({
        id: "app-1",
        name: "audioroad",
        displayName: "AudioRoad",
        isActive: true,
        voiceProfile: "kevin-health",
      });
    });

    it("returns 400 for missing source field", async () => {
      const { POST } = await import("@/app/api/ingest/route");
      const request = createRequest(
        { contentType: "episode", title: "Test" },
        "Bearer valid_api_key"
      );

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("returns 400 for missing contentType field", async () => {
      const { POST } = await import("@/app/api/ingest/route");
      const request = createRequest(
        { source: "audioroad", title: "Test" },
        "Bearer valid_api_key"
      );

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("returns 400 for missing title field", async () => {
      const { POST } = await import("@/app/api/ingest/route");
      const request = createRequest(
        { source: "audioroad", contentType: "episode" },
        "Bearer valid_api_key"
      );

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("returns 400 for invalid audioUrl format", async () => {
      const { POST } = await import("@/app/api/ingest/route");
      const request = createRequest(
        {
          source: "audioroad",
          contentType: "episode",
          title: "Test",
          audioUrl: "not-a-valid-url",
        },
        "Bearer valid_api_key"
      );

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("returns 403 when source doesnt match API key", async () => {
      const { POST } = await import("@/app/api/ingest/route");
      const request = createRequest(
        { source: "trucktales", contentType: "chapter_teaser", title: "Test" },
        "Bearer valid_api_key"
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("audioroad");
      expect(data.error).toContain("trucktales");
    });
  });

  describe("Successful Ingestion", () => {
    beforeEach(() => {
      mockPrisma.sourceApp.findUnique.mockResolvedValue({
        id: "app-1",
        name: "audioroad",
        displayName: "AudioRoad",
        isActive: true,
        voiceProfile: "kevin-health",
      });

      mockPrisma.source.create.mockResolvedValue({
        id: "source-123",
        status: "pending",
        needsTranscription: true,
        needsExtraction: true,
      });

      mockPrisma.source.update.mockResolvedValue({
        id: "source-123",
        status: "transcribed",
      });

      mockPrisma.transcript.create.mockResolvedValue({
        id: "transcript-123",
      });
    });

    it("creates source for episode content type", async () => {
      const { POST } = await import("@/app/api/ingest/route");
      const request = createRequest(
        {
          source: "audioroad",
          contentType: "episode",
          title: "TBB Episode 2847",
          audioUrl: "https://example.com/audio.mp3",
        },
        "Bearer valid_api_key"
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.sourceId).toBe("source-123");
      expect(mockPrisma.source.create).toHaveBeenCalled();
    });

    it("sets correct processing config for episode", async () => {
      const { POST } = await import("@/app/api/ingest/route");
      const request = createRequest(
        {
          source: "audioroad",
          contentType: "episode",
          title: "TBB Episode 2847",
          audioUrl: "https://example.com/audio.mp3",
        },
        "Bearer valid_api_key"
      );

      await POST(request);

      const createCall = mockPrisma.source.create.mock.calls[0][0];
      expect(createCall.data.sourceType).toBe("audio");
      expect(createCall.data.needsTranscription).toBe(true);
      expect(createCall.data.needsExtraction).toBe(true);
    });

    it("creates transcript record when transcript is provided", async () => {
      const { POST } = await import("@/app/api/ingest/route");
      const request = createRequest(
        {
          source: "audioroad",
          contentType: "episode",
          title: "TBB Episode 2847",
          transcript: "This is the episode transcript text.",
        },
        "Bearer valid_api_key"
      );

      await POST(request);

      expect(mockPrisma.transcript.create).toHaveBeenCalled();
      expect(mockPrisma.source.update).toHaveBeenCalled();
    });

    it("skips transcription when transcript provided", async () => {
      mockPrisma.source.create.mockResolvedValue({
        id: "source-123",
        status: "pending",
        needsTranscription: false, // Should be false when transcript provided
        needsExtraction: true,
      });

      const { POST } = await import("@/app/api/ingest/route");
      const request = createRequest(
        {
          source: "audioroad",
          contentType: "episode",
          title: "TBB Episode 2847",
          audioUrl: "https://example.com/audio.mp3",
          transcript: "Transcript provided",
        },
        "Bearer valid_api_key"
      );

      await POST(request);

      const createCall = mockPrisma.source.create.mock.calls[0][0];
      expect(createCall.data.needsTranscription).toBe(false);
    });

    it("triggers processing when autoProcess is true", async () => {
      const { POST } = await import("@/app/api/ingest/route");
      const request = createRequest(
        {
          source: "audioroad",
          contentType: "episode",
          title: "Test",
          text: "Content",
          autoProcess: true,
        },
        "Bearer valid_api_key"
      );

      await POST(request);

      // Give time for async processing trigger
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFetch).toHaveBeenCalled();
    });

    it("does not trigger processing when autoProcess is false", async () => {
      const { POST } = await import("@/app/api/ingest/route");
      const request = createRequest(
        {
          source: "audioroad",
          contentType: "episode",
          title: "Test",
          text: "Content",
          autoProcess: false,
        },
        "Bearer valid_api_key"
      );

      await POST(request);

      // Give time for any potential async calls
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns processing config in response", async () => {
      const { POST } = await import("@/app/api/ingest/route");
      const request = createRequest(
        {
          source: "audioroad",
          contentType: "episode",
          title: "Test",
          audioUrl: "https://example.com/audio.mp3",
        },
        "Bearer valid_api_key"
      );

      const response = await POST(request);
      const data = await response.json();

      expect(data.processingConfig).toBeDefined();
      expect(data.processingConfig.voiceProfile).toBe("kevin-health");
      expect(data.processingConfig.autoProcess).toBe(true);
    });
  });

  describe("Content Type Configurations", () => {
    beforeEach(() => {
      mockPrisma.sourceApp.findUnique.mockImplementation(({ where }: any) => {
        // Return appropriate source app based on query
        return Promise.resolve({
          id: "app-1",
          name: "audioroad",
          displayName: "AudioRoad",
          isActive: true,
          voiceProfile: "kevin-health",
        });
      });

      mockPrisma.source.create.mockResolvedValue({
        id: "source-123",
        status: "pending",
        needsTranscription: false,
        needsExtraction: true,
      });
    });

    it("handles success_story content type as structured", async () => {
      mockPrisma.sourceApp.findUnique.mockResolvedValue({
        id: "app-2",
        name: "health-coaching",
        displayName: "Health Coaching",
        isActive: true,
        voiceProfile: "kevin-health",
      });

      const { POST } = await import("@/app/api/ingest/route");
      const request = createRequest(
        {
          source: "health-coaching",
          contentType: "success_story",
          title: "Client Success",
          data: { name: "John", before: "340 lbs", after: "220 lbs" },
        },
        "Bearer valid_api_key"
      );

      await POST(request);

      const createCall = mockPrisma.source.create.mock.calls[0][0];
      expect(createCall.data.sourceType).toBe("structured");
      expect(createCall.data.needsTranscription).toBe(false);
    });

    it("handles chapter_teaser content type as text", async () => {
      mockPrisma.sourceApp.findUnique.mockResolvedValue({
        id: "app-3",
        name: "trucktales",
        displayName: "TruckTales",
        isActive: true,
        voiceProfile: "trucktales-storyteller",
      });

      const { POST } = await import("@/app/api/ingest/route");
      const request = createRequest(
        {
          source: "trucktales",
          contentType: "chapter_teaser",
          title: "Chapter 5 Teaser",
          text: "The lights of the truck stop flickered...",
        },
        "Bearer valid_api_key"
      );

      await POST(request);

      const createCall = mockPrisma.source.create.mock.calls[0][0];
      expect(createCall.data.sourceType).toBe("text");
    });

    it("uses default config for unknown content types", async () => {
      const { POST } = await import("@/app/api/ingest/route");
      const request = createRequest(
        {
          source: "audioroad",
          contentType: "unknown_type",
          title: "Test",
          text: "Content",
        },
        "Bearer valid_api_key"
      );

      await POST(request);

      const createCall = mockPrisma.source.create.mock.calls[0][0];
      expect(createCall.data.sourceType).toBe("text");
      expect(createCall.data.needsTranscription).toBe(false);
    });
  });
});

describe("GET /api/ingest", () => {
  let mockPrisma: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPrisma = (await import("@/lib/db/prisma")).default;
  });

  const createGetRequest = (sourceId?: string) => {
    const url = sourceId
      ? `http://localhost:3000/api/ingest?sourceId=${sourceId}`
      : "http://localhost:3000/api/ingest";

    return new NextRequest(url, { method: "GET" });
  };

  it("returns 400 when sourceId is missing", async () => {
    const { GET } = await import("@/app/api/ingest/route");
    const request = createGetRequest();

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("sourceId");
  });

  it("returns 404 when source not found", async () => {
    mockPrisma.source = {
      findUnique: vi.fn().mockResolvedValue(null),
    };

    const { GET } = await import("@/app/api/ingest/route");
    const request = createGetRequest("nonexistent-id");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain("not found");
  });

  it("returns source status when found", async () => {
    mockPrisma.source = {
      findUnique: vi.fn().mockResolvedValue({
        id: "source-123",
        title: "Test Episode",
        contentType: "episode",
        status: "processed",
        needsTranscription: false,
        needsExtraction: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        sourceApp: {
          name: "audioroad",
          displayName: "AudioRoad",
        },
        transcripts: [{ id: "t-1", createdAt: new Date() }],
        extractions: [
          { id: "e-1", type: "quote", createdAt: new Date() },
          { id: "e-2", type: "stat", createdAt: new Date() },
        ],
      }),
    };

    const { GET } = await import("@/app/api/ingest/route");
    const request = createGetRequest("source-123");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sourceId).toBe("source-123");
    expect(data.title).toBe("Test Episode");
    expect(data.status).toBe("processed");
    expect(data.sourceApp).toBe("AudioRoad");
    expect(data.transcriptCount).toBe(1);
    expect(data.extractionCount).toBe(2);
  });
});
