/**
 * Mock Anthropic SDK for testing AI content generation
 */

import { vi } from "vitest";

// Sample AI responses for different scenarios
export const sampleExtractionResponse = {
  content: [
    {
      type: "text",
      text: JSON.stringify([
        {
          type: "quote",
          text: "70% of professional drivers test positive for Candida overgrowth.",
          startTime: 120,
          endTime: 135,
          confidence: 0.95,
          productMentions: [],
        },
        {
          type: "stat",
          text: "Drivers average 4.78 hours of sleep per night.",
          startTime: 250,
          endTime: 265,
          confidence: 0.92,
          productMentions: [],
        },
        {
          type: "hot_take",
          text: "Your doctor spent 20 minutes on nutrition in med school. Total.",
          startTime: 480,
          endTime: 495,
          confidence: 0.88,
          productMentions: [],
        },
      ]),
    },
  ],
};

export const samplePlatformContentResponse = {
  content: [
    {
      type: "text",
      text: JSON.stringify({
        platform: "twitter",
        text: "70% of professional drivers are growing fungus in their gut right now.\n\nGeneral population? 13%.\n\nThat's 5x higher.\n\nFix the gut, fix everything.",
        hashtags: ["GutHealth", "LetsTruck", "DriverHealth"],
        mediaGuidance: "Use dark background with orange accent showing the 70% stat prominently",
      }),
    },
  ],
};

export const sampleStrategicContentResponse = {
  content: [
    {
      type: "text",
      text: JSON.stringify({
        text: "70% of professional drivers test positive for Candida.\n\nGeneral population? 13%.\n\nYour gut is being attacked by:\n→ Sugar at truck stops\n→ Energy drinks\n→ Lack of sleep\n→ Stress\n\nFix the gut, fix EVERYTHING.\n\nDM me 'GUT' for my free protocol.",
        hashtags: ["GutHealth", "LetsTruck", "DriverHealth"],
        hookType: "shocking_stat",
      }),
    },
  ],
};

export const sampleScoreResponse = {
  content: [
    {
      type: "text",
      text: JSON.stringify({
        hookStrength: 9,
        valueDensity: 8,
        brandVoice: 9,
        ctaClarity: 8,
        platformFit: 9,
        issues: [],
        suggestions: ["Consider adding a specific timeframe for results"],
      }),
    },
  ],
};

// Create mock Anthropic client
export const createMockAnthropicClient = () => ({
  messages: {
    create: vi.fn().mockResolvedValue(sampleExtractionResponse),
  },
});

// Mock the entire Anthropic module
export const mockAnthropicModule = () => {
  vi.mock("@anthropic-ai/sdk", () => ({
    default: vi.fn().mockImplementation(() => createMockAnthropicClient()),
  }));
};
