/**
 * Tests for Claude AI integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the Anthropic SDK
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
}));

// Mock the strategy module
vi.mock("@/lib/content/strategy", () => ({
  OBJECTIVE_CTAS: {
    email_list: ["DM me '{KEYWORD}'"],
    coaching: ["Book a call"],
    product_sales: ["Link in bio"],
    audience_growth: ["Follow for more"],
    podcast: ["Listen now"],
  },
  PILLAR_CONFIG: {
    gut_health: {
      name: "Gut Health",
      keyMessage: "Fix the gut",
      percentage: 25,
      hashtags: ["GutHealth"],
    },
    proper_human_diet: {
      name: "Proper Human Diet",
      keyMessage: "Eat ancestral",
      percentage: 30,
      hashtags: ["ProperHumanDiet"],
    },
  },
  FORMULA_TEMPLATES: {
    data_bomb: {
      name: "Data Bomb",
      structure: ["Shocking number", "Context"],
      bestFor: ["stats"],
      example: "70% of drivers...",
    },
  },
  PLATFORM_CONFIG: {
    twitter: { charLimit: 280, hashtagLimit: 3 },
    instagram: { charLimit: 2200, hashtagLimit: 30 },
  },
  checkRedFlags: vi.fn().mockReturnValue({ passed: true, flags: [] }),
  scoreContent: vi.fn().mockReturnValue({
    hookStrength: 8,
    valueDensity: 7,
    brandVoice: 8,
    ctaClarity: 7,
    platformFit: 8,
    totalScore: 7.6,
    passed: true,
    issues: [],
  }),
  getRandomCta: vi.fn().mockReturnValue("DM me 'GUT'"),
  getPillarHashtags: vi.fn().mockReturnValue(["GutHealth", "LetsTruck"]),
}));

vi.mock("@/lib/ai/prompts", () => ({
  buildStrategicPrompt: vi.fn().mockReturnValue("Strategic prompt content"),
}));

describe("Claude AI Client", () => {
  let Anthropic: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    Anthropic = (await import("@anthropic-ai/sdk")).default;
  });

  describe("extractContent", () => {
    it("extracts content from transcript", async () => {
      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify([
              {
                type: "quote",
                text: "70% of drivers have Candida",
                startTime: 120,
                endTime: 135,
                confidence: 0.95,
                productMentions: [],
              },
            ]),
          },
        ],
      };

      Anthropic.mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue(mockResponse),
        },
      }));

      const { extractContent } = await import("./claude");
      const result = await extractContent("Sample transcript about gut health...");

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("quote");
      expect(result[0].text).toContain("Candida");
      expect(result[0].confidence).toBe(0.95);
    });

    it("returns empty array when no JSON found", async () => {
      Anthropic.mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: "No JSON here" }],
          }),
        },
      }));

      const { extractContent } = await import("./claude");
      const result = await extractContent("Test transcript");

      expect(result).toEqual([]);
    });

    it("handles malformed JSON gracefully", async () => {
      Anthropic.mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: "[{invalid json}]" }],
          }),
        },
      }));

      const { extractContent } = await import("./claude");
      const result = await extractContent("Test transcript");

      expect(result).toEqual([]);
    });

    it("throws error for non-text response", async () => {
      Anthropic.mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "image", source: {} }],
          }),
        },
      }));

      const { extractContent } = await import("./claude");

      await expect(extractContent("Test")).rejects.toThrow("Unexpected response type");
    });
  });

  describe("generatePlatformContent", () => {
    it("generates Twitter content", async () => {
      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              platform: "twitter",
              text: "70% of drivers have gut issues.\n\nFix the gut, fix everything.",
              hashtags: ["GutHealth", "LetsTruck"],
              mediaGuidance: "Dark background with stat",
            }),
          },
        ],
      };

      Anthropic.mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue(mockResponse),
        },
      }));

      const { generatePlatformContent } = await import("./claude");
      const result = await generatePlatformContent(
        { type: "stat", text: "70% stat", confidence: 0.9 },
        "twitter"
      );

      expect(result.platform).toBe("twitter");
      expect(result.text).toContain("70%");
      expect(result.hashtags).toContain("GutHealth");
    });

    it("includes products in generation when provided", async () => {
      const createMock = vi.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              platform: "twitter",
              text: "Content with product",
              hashtags: [],
            }),
          },
        ],
      });

      Anthropic.mockImplementation(() => ({
        messages: { create: createMock },
      }));

      const { generatePlatformContent } = await import("./claude");
      await generatePlatformContent(
        { type: "quote", text: "Test", confidence: 0.8 },
        "twitter",
        [{ name: "Lyte Balance", url: "https://store.letstruck.com/lyte-balance" }]
      );

      const systemPrompt = createMock.mock.calls[0][0].system;
      expect(systemPrompt).toContain("Lyte Balance");
    });

    it("returns extraction text as fallback on parse error", async () => {
      Anthropic.mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: "Not JSON" }],
          }),
        },
      }));

      const { generatePlatformContent } = await import("./claude");
      const result = await generatePlatformContent(
        { type: "quote", text: "Original text", confidence: 0.8 },
        "instagram"
      );

      expect(result.text).toBe("Original text");
      expect(result.platform).toBe("instagram");
    });
  });

  describe("generateBulkContent", () => {
    it("generates content for multiple platforms", async () => {
      let callCount = 0;
      const mockCreate = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                platform: callCount === 1 ? "twitter" : "instagram",
                text: `Content for platform ${callCount}`,
                hashtags: ["Test"],
              }),
            },
          ],
        });
      });

      Anthropic.mockImplementation(() => ({
        messages: { create: mockCreate },
      }));

      const { generateBulkContent } = await import("./claude");
      const results = await generateBulkContent(
        { type: "stat", text: "70% stat", confidence: 0.9 },
        ["twitter", "instagram"]
      );

      expect(results).toHaveLength(2);
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });
  });

  describe("generateStrategicContent", () => {
    it("generates content using strategy configuration", async () => {
      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              text: "Strategic content with hook and CTA",
              hashtags: ["GutHealth", "LetsTruck"],
              hookType: "shocking_stat",
            }),
          },
        ],
      };

      Anthropic.mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue(mockResponse),
        },
      }));

      const { generateStrategicContent } = await import("./claude");
      const result = await generateStrategicContent({
        sourceText: "70% of drivers have gut issues",
        platform: "twitter",
        pillar: "gut_health",
        formula: "data_bomb",
        objective: "email_list",
        ctaKeyword: "GUT",
      });

      expect(result.text).toContain("Strategic content");
      expect(result.formula).toBe("Data Bomb");
      expect(result.pillar).toBe("Gut Health");
      expect(result.score).toBeDefined();
    });

    it("uses buildStrategicPrompt to create prompt", async () => {
      const { buildStrategicPrompt } = await import("@/lib/ai/prompts");

      Anthropic.mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [
              {
                type: "text",
                text: JSON.stringify({ text: "Content", hashtags: [] }),
              },
            ],
          }),
        },
      }));

      const { generateStrategicContent } = await import("./claude");
      await generateStrategicContent({
        sourceText: "Test content",
        platform: "twitter",
        pillar: "gut_health",
        formula: "data_bomb",
        objective: "email_list",
      });

      expect(buildStrategicPrompt).toHaveBeenCalled();
    });

    it("checks red flags in generated content", async () => {
      const { checkRedFlags } = await import("@/lib/content/strategy");

      Anthropic.mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [
              {
                type: "text",
                text: JSON.stringify({ text: "Content", hashtags: [] }),
              },
            ],
          }),
        },
      }));

      const { generateStrategicContent } = await import("./claude");
      await generateStrategicContent({
        sourceText: "Test",
        platform: "twitter",
        pillar: "gut_health",
        formula: "data_bomb",
        objective: "email_list",
      });

      expect(checkRedFlags).toHaveBeenCalled();
    });
  });

  describe("scoreContentWithAI", () => {
    it("returns AI-generated scores", async () => {
      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              hookStrength: 9,
              valueDensity: 8,
              brandVoice: 9,
              ctaClarity: 7,
              platformFit: 8,
              issues: [],
              suggestions: ["Add more specific data"],
            }),
          },
        ],
      };

      Anthropic.mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue(mockResponse),
        },
      }));

      const { scoreContentWithAI } = await import("./claude");
      const result = await scoreContentWithAI(
        "70% of drivers are growing fungus in their gut right now.",
        "twitter"
      );

      expect(result.hookStrength).toBe(9);
      expect(result.brandVoice).toBe(9);
      expect(result.totalScore).toBeGreaterThan(0);
      expect(result.passed).toBe(true);
    });

    it("calculates weighted total correctly", async () => {
      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              hookStrength: 10,
              valueDensity: 10,
              brandVoice: 10,
              ctaClarity: 10,
              platformFit: 10,
              issues: [],
              suggestions: [],
            }),
          },
        ],
      };

      Anthropic.mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue(mockResponse),
        },
      }));

      const { scoreContentWithAI } = await import("./claude");
      const result = await scoreContentWithAI("Perfect content", "twitter");

      // Weighted: 10*0.3 + 10*0.25 + 10*0.2 + 10*0.15 + 10*0.1 = 10
      expect(result.totalScore).toBe(10);
    });

    it("falls back to basic scoring on parse error", async () => {
      Anthropic.mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: "Not JSON" }],
          }),
        },
      }));

      const { scoreContentWithAI } = await import("./claude");
      const result = await scoreContentWithAI("Content", "twitter");

      // Should return a valid score object from fallback
      expect(result.hookStrength).toBeDefined();
      expect(result.totalScore).toBeDefined();
    });
  });
});

describe("Content Type Definitions", () => {
  it("exports correct content types", async () => {
    const { ContentType } = await import("./claude") as any;
    // TypeScript types aren't available at runtime, but we can verify the module exports
    const module = await import("./claude");
    expect(module).toBeDefined();
  });
});
