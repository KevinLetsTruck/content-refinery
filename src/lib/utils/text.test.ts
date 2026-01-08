/**
 * Tests for text processing utilities
 */

import { describe, it, expect } from "vitest";
import {
  PLATFORM_LIMITS,
  smartTruncate,
  formatForTwitter,
  getCharacterStatus,
} from "./text";

describe("PLATFORM_LIMITS", () => {
  it("has correct Twitter limits", () => {
    expect(PLATFORM_LIMITS.twitter).toEqual({
      charLimit: 280,
      hashtagLimit: 3,
    });
  });

  it("has correct Instagram limits", () => {
    expect(PLATFORM_LIMITS.instagram_feed.charLimit).toBe(2200);
    expect(PLATFORM_LIMITS.instagram_feed.hashtagLimit).toBe(30);
  });

  it("has correct LinkedIn limits", () => {
    expect(PLATFORM_LIMITS.linkedin.charLimit).toBe(3000);
    expect(PLATFORM_LIMITS.linkedin.hashtagLimit).toBe(5);
  });

  it("has correct Facebook limits", () => {
    expect(PLATFORM_LIMITS.facebook.charLimit).toBe(63206);
    expect(PLATFORM_LIMITS.facebook.hashtagLimit).toBe(5);
  });

  it("has correct TikTok limits", () => {
    expect(PLATFORM_LIMITS.tiktok.charLimit).toBe(2200);
    expect(PLATFORM_LIMITS.tiktok.hashtagLimit).toBe(5);
  });
});

describe("smartTruncate", () => {
  it("returns original text if under limit", () => {
    const text = "Short text";
    expect(smartTruncate(text, 100)).toBe(text);
  });

  it("cuts at sentence boundary when possible", () => {
    const text = "First sentence here. Second sentence follows. Third sentence ends.";
    const result = smartTruncate(text, 50);
    // Should cut at a sentence boundary and be under limit
    expect(result.length).toBeLessThanOrEqual(50);
    // Result should end with sentence punctuation or ellipsis
    expect(result.endsWith(".") || result.endsWith("...")).toBe(true);
  });

  it("cuts at exclamation mark", () => {
    const text = "Wow! This is amazing! More content here that goes on.";
    const result = smartTruncate(text, 30);
    // Should cut at a sentence boundary
    expect(result.endsWith("!") || result.endsWith("...")).toBe(true);
  });

  it("cuts at question mark", () => {
    const text = "Why is this important? Let me tell you the reason.";
    const result = smartTruncate(text, 30);
    // Should either cut at the question mark or truncate with ellipsis
    expect(result.length).toBeLessThanOrEqual(30);
    expect(result.endsWith("?") || result.endsWith("...")).toBe(true);
  });

  it("cuts at word boundary when no sentence break available", () => {
    const text = "This is a longer sentence without any breaks that needs truncation";
    const result = smartTruncate(text, 40);
    expect(result.endsWith("...")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(40);
  });

  it("handles line breaks as potential cut points", () => {
    const text = "Line one content here\nLine two content here\nLine three content";
    const result = smartTruncate(text, 35);
    expect(result).toContain("Line one");
  });

  it("handles very short limit with hard cut", () => {
    const text = "Verylongwordwithoutspaces and more";
    const result = smartTruncate(text, 15);
    expect(result.length).toBe(15);
    expect(result.endsWith("...")).toBe(true);
  });

  it("preserves text under limit exactly", () => {
    const text = "Exactly at limit";
    expect(smartTruncate(text, 16)).toBe(text);
  });
});

describe("formatForTwitter", () => {
  it("returns text unchanged if within limit without hashtags", () => {
    const text = "Short tweet without hashtags";
    expect(formatForTwitter(text, [])).toBe(text);
  });

  it("adds hashtags when there is room", () => {
    const text = "Short tweet";
    const hashtags = ["LetsTruck", "DriverHealth"];
    const result = formatForTwitter(text, hashtags);
    expect(result).toContain("#LetsTruck");
    expect(result).toContain("#DriverHealth");
    expect(result.length).toBeLessThanOrEqual(280);
  });

  it("adds # prefix to hashtags that dont have it", () => {
    const text = "Test content";
    const hashtags = ["LetsTruck"];
    const result = formatForTwitter(text, hashtags);
    expect(result).toContain("#LetsTruck");
  });

  it("does not double # prefix", () => {
    const text = "Test content";
    const hashtags = ["#AlreadyHashed"];
    const result = formatForTwitter(text, hashtags);
    expect(result).toContain("#AlreadyHashed");
    expect(result).not.toContain("##");
  });

  it("limits hashtags to platform maximum", () => {
    const text = "Test content";
    const hashtags = ["One", "Two", "Three", "Four", "Five"];
    const result = formatForTwitter(text, hashtags);
    // Twitter limit is 3 hashtags
    const hashtagCount = (result.match(/#/g) || []).length;
    expect(hashtagCount).toBeLessThanOrEqual(3);
  });

  it("truncates text to fit one hashtag when space is tight", () => {
    // Create text that's close to limit
    const text = "A".repeat(270);
    const hashtags = ["Test"];
    const result = formatForTwitter(text, hashtags);
    expect(result.length).toBeLessThanOrEqual(280);
    expect(result).toContain("#Test");
  });

  it("truncates long text even without hashtags", () => {
    const text = "A".repeat(300);
    const result = formatForTwitter(text, []);
    expect(result.length).toBeLessThanOrEqual(280);
  });

  it("handles empty hashtags array", () => {
    const text = "Just text, no hashtags";
    const result = formatForTwitter(text, []);
    expect(result).toBe(text);
  });

  it("separates hashtags with double newline", () => {
    const text = "Content here";
    const hashtags = ["Tag1"];
    const result = formatForTwitter(text, hashtags);
    expect(result).toContain("\n\n#");
  });
});

describe("getCharacterStatus", () => {
  describe("basic functionality", () => {
    it("returns correct count for simple text", () => {
      const result = getCharacterStatus("Hello world", "twitter");
      expect(result.count).toBe(11);
      expect(result.limit).toBe(280);
      expect(result.isOverLimit).toBe(false);
    });

    it("calculates count including hashtags", () => {
      const result = getCharacterStatus("Hello", "twitter", ["Test"]);
      // "Hello\n\n#Test" = 5 + 2 + 5 = 12
      expect(result.count).toBe(12);
    });
  });

  describe("status determination", () => {
    it("returns good status when well under limit", () => {
      const result = getCharacterStatus("Short text", "twitter");
      expect(result.status).toBe("good");
    });

    it("returns warning status when over 90% of limit", () => {
      // 90% of 280 = 252
      const text = "A".repeat(260);
      const result = getCharacterStatus(text, "twitter");
      expect(result.status).toBe("warning");
      expect(result.message).toContain("Getting close");
    });

    it("returns error status when over limit", () => {
      const text = "A".repeat(300);
      const result = getCharacterStatus(text, "twitter");
      expect(result.status).toBe("error");
      expect(result.isOverLimit).toBe(true);
      expect(result.message).toContain("over limit");
    });
  });

  describe("platform-specific limits", () => {
    it("uses Twitter limit for twitter platform", () => {
      const result = getCharacterStatus("Test", "twitter");
      expect(result.limit).toBe(280);
    });

    it("uses Instagram limit for instagram_feed", () => {
      const result = getCharacterStatus("Test", "instagram_feed");
      expect(result.limit).toBe(2200);
    });

    it("uses LinkedIn limit for linkedin", () => {
      const result = getCharacterStatus("Test", "linkedin");
      expect(result.limit).toBe(3000);
    });

    it("defaults to Twitter limits for unknown platform", () => {
      const result = getCharacterStatus("Test", "unknown_platform");
      expect(result.limit).toBe(280);
    });
  });

  describe("hashtag handling", () => {
    it("respects platform hashtag limits", () => {
      // Instagram allows 30 hashtags
      const manyHashtags = Array(35).fill("Tag").map((t, i) => `${t}${i}`);
      const result = getCharacterStatus("Test", "instagram_feed", manyHashtags);
      // Should only count first 30 hashtags
      const expectedTags = manyHashtags.slice(0, 30);
      const hashtagStr = expectedTags.map(t => `#${t}`).join(" ");
      const expectedLength = `Test\n\n${hashtagStr}`.length;
      expect(result.count).toBe(expectedLength);
    });

    it("adds # prefix when calculating", () => {
      const result = getCharacterStatus("Hi", "twitter", ["Tag"]);
      // "Hi\n\n#Tag" = 2 + 2 + 4 = 8
      expect(result.count).toBe(8);
    });

    it("does not double # prefix in calculation", () => {
      const result = getCharacterStatus("Hi", "twitter", ["#Tag"]);
      // "Hi\n\n#Tag" = 2 + 2 + 4 = 8
      expect(result.count).toBe(8);
    });
  });

  describe("message formatting", () => {
    it("shows count/limit in message for good status", () => {
      const result = getCharacterStatus("Test", "twitter");
      expect(result.message).toBe("4/280");
    });

    it("shows how much over limit in error message", () => {
      const text = "A".repeat(300);
      const result = getCharacterStatus(text, "twitter");
      expect(result.message).toContain("20 over limit");
    });
  });
});
