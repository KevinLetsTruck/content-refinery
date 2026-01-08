/**
 * Tests for core utility functions
 */

import { describe, it, expect } from "vitest";
import { cn, formatDate, formatTime, formatDuration, truncate, slugify } from "./utils";

describe("cn (class name utility)", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", true && "active", false && "hidden")).toBe("base active");
  });

  it("handles undefined and null", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });

  it("merges tailwind classes correctly", () => {
    // tailwind-merge should dedupe conflicting classes
    expect(cn("px-4", "px-6")).toBe("px-6");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles arrays of classes", () => {
    expect(cn(["foo", "bar"], "baz")).toBe("foo bar baz");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
    expect(cn("")).toBe("");
  });
});

describe("formatDate", () => {
  it("formats Date object", () => {
    // Use a date with explicit time to avoid timezone issues
    const date = new Date("2024-01-15T12:00:00");
    const result = formatDate(date);
    expect(result).toContain("Jan");
    expect(result).toContain("2024");
    // Date might vary by 1 day depending on timezone
    expect(result).toMatch(/Jan 1[45], 2024/);
  });

  it("formats date string", () => {
    const result = formatDate("2024-06-20T12:00:00");
    expect(result).toContain("Jun");
    expect(result).toContain("2024");
    expect(result).toMatch(/Jun (19|20), 2024/);
  });

  it("formats ISO date string", () => {
    const result = formatDate("2024-12-25T12:30:00Z");
    expect(result).toContain("Dec");
    expect(result).toContain("2024");
    expect(result).toMatch(/Dec 2[45], 2024/);
  });
});

describe("formatTime", () => {
  it("formats time from Date object", () => {
    const date = new Date("2024-01-15T14:30:00");
    const result = formatTime(date);
    // Should be in format like "2:30 PM"
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it("formats time from string", () => {
    const result = formatTime("2024-01-15T09:05:00");
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe("formatDuration", () => {
  it("formats seconds only", () => {
    expect(formatDuration(45)).toBe("0:45");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(125)).toBe("2:05");
  });

  it("formats hours, minutes, and seconds", () => {
    expect(formatDuration(3661)).toBe("1:01:01");
  });

  it("pads minutes and seconds correctly", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(3605)).toBe("1:00:05");
  });

  it("handles zero", () => {
    expect(formatDuration(0)).toBe("0:00");
  });

  it("handles large numbers", () => {
    expect(formatDuration(7200)).toBe("2:00:00"); // 2 hours
    expect(formatDuration(86400)).toBe("24:00:00"); // 24 hours
  });
});

describe("truncate", () => {
  it("returns original string if under limit", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates string at limit and adds ellipsis", () => {
    expect(truncate("hello world", 5)).toBe("hello...");
  });

  it("handles exact length", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });

  it("handles empty string", () => {
    expect(truncate("", 5)).toBe("");
  });

  it("handles single character truncation", () => {
    expect(truncate("abc", 1)).toBe("a...");
  });

  it("handles long text", () => {
    const longText = "This is a very long piece of text that should be truncated";
    const result = truncate(longText, 20);
    expect(result.length).toBe(23); // 20 chars + "..."
    expect(result.endsWith("...")).toBe(true);
  });
});

describe("slugify", () => {
  it("converts to lowercase", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugify("hello world test")).toBe("hello-world-test");
  });

  it("removes special characters", () => {
    expect(slugify("hello! world?")).toBe("hello-world");
    expect(slugify("test@example#content")).toBe("testexamplecontent");
  });

  it("handles multiple spaces/hyphens", () => {
    expect(slugify("hello   world")).toBe("hello-world");
    expect(slugify("hello---world")).toBe("hello-world");
    expect(slugify("hello - - world")).toBe("hello-world");
  });

  it("removes leading/trailing hyphens", () => {
    expect(slugify("-hello world-")).toBe("hello-world");
    expect(slugify("  hello world  ")).toBe("hello-world");
  });

  it("handles underscores", () => {
    expect(slugify("hello_world")).toBe("hello-world");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("handles string with only special characters", () => {
    expect(slugify("!@#$%")).toBe("");
  });

  it("handles numbers", () => {
    expect(slugify("Episode 123")).toBe("episode-123");
  });

  it("handles typical episode titles", () => {
    expect(slugify("TBB Episode 2847: Health Tips")).toBe("tbb-episode-2847-health-tips");
  });
});
