/**
 * Tests for database operations and Prisma integration
 *
 * These tests verify the database client configuration and mock factory functions.
 * For production use, you'd run these against a test database.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockSourceApp,
  createMockSource,
  createMockTranscript,
  createMockExtraction,
  createMockGeneratedContent,
  createMockPrismaClient,
} from "../mocks/prisma";

describe("Mock Factories", () => {
  describe("createMockSourceApp", () => {
    it("creates default source app", () => {
      const app = createMockSourceApp();

      expect(app.id).toBe("test-source-app-id");
      expect(app.name).toBe("audioroad");
      expect(app.displayName).toBe("AudioRoad");
      expect(app.apiKey).toMatch(/^cr_/);
      expect(app.voiceProfile).toBe("kevin-health");
      expect(app.isActive).toBe(true);
      expect(app.createdAt).toBeInstanceOf(Date);
      expect(app.updatedAt).toBeInstanceOf(Date);
    });

    it("allows overriding defaults", () => {
      const app = createMockSourceApp({
        name: "trucktales",
        displayName: "TruckTales",
        voiceProfile: "trucktales-storyteller",
        isActive: false,
      });

      expect(app.name).toBe("trucktales");
      expect(app.displayName).toBe("TruckTales");
      expect(app.voiceProfile).toBe("trucktales-storyteller");
      expect(app.isActive).toBe(false);
    });
  });

  describe("createMockSource", () => {
    it("creates default source", () => {
      const source = createMockSource();

      expect(source.id).toBe("test-source-id");
      expect(source.sourceAppId).toBe("test-source-app-id");
      expect(source.title).toBe("Test Episode");
      expect(source.sourceType).toBe("audio");
      expect(source.contentType).toBe("episode");
      expect(source.fileUrl).toContain("http");
      expect(source.status).toBe("pending");
      expect(source.needsTranscription).toBe(true);
      expect(source.needsExtraction).toBe(true);
    });

    it("allows overriding status and processing flags", () => {
      const source = createMockSource({
        status: "processed",
        needsTranscription: false,
        needsExtraction: false,
      });

      expect(source.status).toBe("processed");
      expect(source.needsTranscription).toBe(false);
      expect(source.needsExtraction).toBe(false);
    });

    it("supports different content types", () => {
      const textSource = createMockSource({
        sourceType: "text",
        contentType: "chapter_teaser",
        fileUrl: null,
      });

      expect(textSource.sourceType).toBe("text");
      expect(textSource.contentType).toBe("chapter_teaser");
      expect(textSource.fileUrl).toBeNull();
    });
  });

  describe("createMockTranscript", () => {
    it("creates default transcript", () => {
      const transcript = createMockTranscript();

      expect(transcript.id).toBe("test-transcript-id");
      expect(transcript.sourceId).toBe("test-source-id");
      expect(transcript.fullText).toContain("test transcript");
      expect(transcript.speakers).toBeNull();
      expect(transcript.timestamps).toBeNull();
    });

    it("allows adding speaker diarization", () => {
      const transcript = createMockTranscript({
        speakers: [
          { id: "speaker-1", name: "Kevin" },
          { id: "speaker-2", name: "Caller" },
        ],
      });

      expect(transcript.speakers).toHaveLength(2);
    });
  });

  describe("createMockExtraction", () => {
    it("creates default extraction", () => {
      const extraction = createMockExtraction();

      expect(extraction.id).toBe("test-extraction-id");
      expect(extraction.sourceId).toBe("test-source-id");
      expect(extraction.type).toBe("quote");
      expect(extraction.text).toContain("test");
      expect(extraction.startTime).toBe(0);
      expect(extraction.endTime).toBe(30);
      expect(extraction.confidence).toBe(0.9);
      expect(extraction.productMentions).toEqual([]);
    });

    it("supports different extraction types", () => {
      const statExtraction = createMockExtraction({
        type: "stat",
        text: "70% of drivers have Candida",
        confidence: 0.95,
      });

      expect(statExtraction.type).toBe("stat");
      expect(statExtraction.confidence).toBe(0.95);
    });

    it("supports product mentions", () => {
      const extraction = createMockExtraction({
        productMentions: ["Lyte Balance", "Cardio Miracle"],
      });

      expect(extraction.productMentions).toHaveLength(2);
      expect(extraction.productMentions).toContain("Lyte Balance");
    });
  });

  describe("createMockGeneratedContent", () => {
    it("creates default generated content", () => {
      const content = createMockGeneratedContent();

      expect(content.id).toBe("test-content-id");
      expect(content.extractionId).toBe("test-extraction-id");
      expect(content.platform).toBe("twitter");
      expect(content.text).toContain("Test tweet");
      expect(content.hashtags).toContain("LetsTruck");
      expect(content.status).toBe("pending_review");
      expect(content.publishedAt).toBeNull();
      expect(content.publishedUrl).toBeNull();
    });

    it("supports different platforms", () => {
      const instagramContent = createMockGeneratedContent({
        platform: "instagram",
        hashtags: ["DriverHealth", "GutHealth", "ProperHumanDiet"],
      });

      expect(instagramContent.platform).toBe("instagram");
      expect(instagramContent.hashtags).toHaveLength(3);
    });

    it("supports published state", () => {
      const publishedContent = createMockGeneratedContent({
        status: "published",
        publishedAt: new Date(),
        publishedUrl: "https://x.com/lets_truck/status/123456789",
      });

      expect(publishedContent.status).toBe("published");
      expect(publishedContent.publishedAt).toBeInstanceOf(Date);
      expect(publishedContent.publishedUrl).toContain("x.com");
    });
  });
});

describe("Mock Prisma Client", () => {
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;

  beforeEach(() => {
    mockPrisma = createMockPrismaClient();
  });

  it("has all required model methods", () => {
    // Source App
    expect(mockPrisma.sourceApp.findUnique).toBeDefined();
    expect(mockPrisma.sourceApp.findMany).toBeDefined();
    expect(mockPrisma.sourceApp.create).toBeDefined();
    expect(mockPrisma.sourceApp.update).toBeDefined();
    expect(mockPrisma.sourceApp.delete).toBeDefined();

    // Source
    expect(mockPrisma.source.findUnique).toBeDefined();
    expect(mockPrisma.source.findMany).toBeDefined();
    expect(mockPrisma.source.create).toBeDefined();
    expect(mockPrisma.source.update).toBeDefined();
    expect(mockPrisma.source.delete).toBeDefined();

    // Transcript
    expect(mockPrisma.transcript.findUnique).toBeDefined();
    expect(mockPrisma.transcript.findMany).toBeDefined();
    expect(mockPrisma.transcript.create).toBeDefined();
    expect(mockPrisma.transcript.update).toBeDefined();
    expect(mockPrisma.transcript.delete).toBeDefined();

    // Extraction
    expect(mockPrisma.extraction.findUnique).toBeDefined();
    expect(mockPrisma.extraction.findMany).toBeDefined();
    expect(mockPrisma.extraction.create).toBeDefined();
    expect(mockPrisma.extraction.update).toBeDefined();
    expect(mockPrisma.extraction.delete).toBeDefined();

    // Generated Content
    expect(mockPrisma.generatedContent.findUnique).toBeDefined();
    expect(mockPrisma.generatedContent.findMany).toBeDefined();
    expect(mockPrisma.generatedContent.create).toBeDefined();
    expect(mockPrisma.generatedContent.update).toBeDefined();
    expect(mockPrisma.generatedContent.delete).toBeDefined();
  });

  it("has connection methods", () => {
    expect(mockPrisma.$connect).toBeDefined();
    expect(mockPrisma.$disconnect).toBeDefined();
    expect(mockPrisma.$transaction).toBeDefined();
  });

  it("methods are mock functions", () => {
    expect(vi.isMockFunction(mockPrisma.sourceApp.findUnique)).toBe(true);
    expect(vi.isMockFunction(mockPrisma.source.create)).toBe(true);
  });

  it("can mock return values", async () => {
    const mockApp = createMockSourceApp();
    mockPrisma.sourceApp.findUnique.mockResolvedValue(mockApp);

    const result = await mockPrisma.sourceApp.findUnique({ where: { id: "test" } });

    expect(result).toEqual(mockApp);
    expect(mockPrisma.sourceApp.findUnique).toHaveBeenCalledWith({ where: { id: "test" } });
  });

  it("can track calls", async () => {
    mockPrisma.source.create.mockResolvedValue(createMockSource());

    await mockPrisma.source.create({
      data: {
        title: "Test",
        sourceType: "audio",
        contentType: "episode",
        status: "pending",
      },
    });

    expect(mockPrisma.source.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.source.create.mock.calls[0][0].data.title).toBe("Test");
  });
});

describe("Database Integration Patterns", () => {
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;

  beforeEach(() => {
    mockPrisma = createMockPrismaClient();
  });

  describe("Create and Query Flow", () => {
    it("simulates creating a source and finding it", async () => {
      const mockSource = createMockSource({ title: "New Episode" });

      mockPrisma.source.create.mockResolvedValue(mockSource);
      mockPrisma.source.findUnique.mockResolvedValue(mockSource);

      // Create
      const created = await mockPrisma.source.create({
        data: { title: "New Episode", sourceType: "audio", contentType: "episode", status: "pending" },
      });

      // Find
      const found = await mockPrisma.source.findUnique({
        where: { id: created.id },
      });

      expect(found).toEqual(created);
    });
  });

  describe("Relationship Queries", () => {
    it("simulates finding source with related data", async () => {
      const mockSource = createMockSource();
      const mockTranscript = createMockTranscript({ sourceId: mockSource.id });
      const mockExtractions = [
        createMockExtraction({ id: "e-1", sourceId: mockSource.id, type: "quote" }),
        createMockExtraction({ id: "e-2", sourceId: mockSource.id, type: "stat" }),
      ];

      const sourceWithRelations = {
        ...mockSource,
        transcripts: [mockTranscript],
        extractions: mockExtractions,
      };

      mockPrisma.source.findUnique.mockResolvedValue(sourceWithRelations);

      const result = await mockPrisma.source.findUnique({
        where: { id: mockSource.id },
        include: { transcripts: true, extractions: true },
      });

      expect(result?.transcripts).toHaveLength(1);
      expect(result?.extractions).toHaveLength(2);
    });
  });

  describe("Update Operations", () => {
    it("simulates updating source status", async () => {
      const originalSource = createMockSource({ status: "pending" });
      const updatedSource = { ...originalSource, status: "processed" };

      mockPrisma.source.update.mockResolvedValue(updatedSource);

      const result = await mockPrisma.source.update({
        where: { id: originalSource.id },
        data: { status: "processed" },
      });

      expect(result.status).toBe("processed");
    });
  });

  describe("Error Handling", () => {
    it("simulates not found error", async () => {
      mockPrisma.source.findUnique.mockResolvedValue(null);

      const result = await mockPrisma.source.findUnique({
        where: { id: "nonexistent" },
      });

      expect(result).toBeNull();
    });

    it("simulates database error", async () => {
      mockPrisma.source.create.mockRejectedValue(
        new Error("Unique constraint violation")
      );

      await expect(
        mockPrisma.source.create({
          data: { title: "Duplicate", sourceType: "audio", contentType: "episode", status: "pending" },
        })
      ).rejects.toThrow("Unique constraint violation");
    });
  });
});
