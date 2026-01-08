/**
 * Tests for brand rules configuration
 */

import { describe, it, expect } from "vitest";
import {
  BRAND_TERMINOLOGY_RULES,
  BRAND_VOICE_CHARACTERISTICS,
  GAMMA_BRAND_INSTRUCTIONS,
  LETSTRUCK_THEME_ID,
} from "./brand-rules";

describe("Brand Terminology Rules", () => {
  it("prohibits trucker terminology", () => {
    expect(BRAND_TERMINOLOGY_RULES).toContain("NEVER");
    expect(BRAND_TERMINOLOGY_RULES.toLowerCase()).toContain("trucker");
  });

  it("provides correct replacements", () => {
    expect(BRAND_TERMINOLOGY_RULES).toContain("Driver");
    expect(BRAND_TERMINOLOGY_RULES).toContain("Professional Driver");
    expect(BRAND_TERMINOLOGY_RULES).toContain("Owner-Operator");
    expect(BRAND_TERMINOLOGY_RULES).toContain("O/O");
  });

  it("includes community terminology", () => {
    expect(BRAND_TERMINOLOGY_RULES).toContain("The Tribe");
  });

  it("prohibits big rig and 18-wheeler", () => {
    expect(BRAND_TERMINOLOGY_RULES.toLowerCase()).toContain("big rig");
    expect(BRAND_TERMINOLOGY_RULES.toLowerCase()).toContain("18-wheeler");
  });
});

describe("Brand Voice Characteristics", () => {
  it("describes direct, no-BS tone", () => {
    expect(BRAND_VOICE_CHARACTERISTICS).toContain("Direct");
    expect(BRAND_VOICE_CHARACTERISTICS).toContain("no-BS");
  });

  it("references Larry Winget style", () => {
    expect(BRAND_VOICE_CHARACTERISTICS).toContain("Larry Winget");
  });

  it("includes key phrases to use", () => {
    expect(BRAND_VOICE_CHARACTERISTICS).toContain("proper human diet");
    expect(BRAND_VOICE_CHARACTERISTICS).toContain("diesel in your blood");
    expect(BRAND_VOICE_CHARACTERISTICS).toContain("The Tribe");
  });

  it("includes phrases to avoid", () => {
    expect(BRAND_VOICE_CHARACTERISTICS).toContain("might");
    expect(BRAND_VOICE_CHARACTERISTICS).toContain("perhaps");
    expect(BRAND_VOICE_CHARACTERISTICS).toContain("optimize");
    expect(BRAND_VOICE_CHARACTERISTICS).toContain("synergy");
  });

  it("prohibits generic fitness language", () => {
    expect(BRAND_VOICE_CHARACTERISTICS).toContain("gains");
    expect(BRAND_VOICE_CHARACTERISTICS).toContain("shredded");
    expect(BRAND_VOICE_CHARACTERISTICS).toContain("beast mode");
  });
});

describe("Gamma Brand Instructions", () => {
  it("includes trucker prohibition", () => {
    expect(GAMMA_BRAND_INSTRUCTIONS).toContain("NEVER");
    expect(GAMMA_BRAND_INSTRUCTIONS.toLowerCase()).toContain("trucker");
  });

  it("includes brand color", () => {
    expect(GAMMA_BRAND_INSTRUCTIONS).toContain("#FF4500");
  });

  it("describes direct tone", () => {
    expect(GAMMA_BRAND_INSTRUCTIONS).toContain("Direct");
    expect(GAMMA_BRAND_INSTRUCTIONS).toContain("no-BS");
  });

  it("includes key phrases", () => {
    expect(GAMMA_BRAND_INSTRUCTIONS).toContain("proper human diet");
    expect(GAMMA_BRAND_INSTRUCTIONS).toContain("The Tribe");
  });

  it("mentions dark backgrounds", () => {
    expect(GAMMA_BRAND_INSTRUCTIONS.toLowerCase()).toContain("dark");
  });
});

describe("Theme Configuration", () => {
  it("has valid theme ID format", () => {
    expect(LETSTRUCK_THEME_ID).toBeDefined();
    expect(typeof LETSTRUCK_THEME_ID).toBe("string");
    expect(LETSTRUCK_THEME_ID.length).toBeGreaterThan(0);
  });

  it("theme ID is alphanumeric", () => {
    expect(LETSTRUCK_THEME_ID).toMatch(/^[a-z0-9]+$/);
  });
});

describe("Brand Rules Integration", () => {
  // Helper to check if text passes brand rules
  const checkBrandCompliance = (text: string): { passed: boolean; issues: string[] } => {
    const issues: string[] = [];
    const lowerText = text.toLowerCase();

    // Check for banned terms
    if (lowerText.includes("trucker")) {
      issues.push('Uses "trucker" - should use "driver" or "professional driver"');
    }
    if (lowerText.includes("truckers")) {
      issues.push('Uses "truckers" - should use "drivers" or "The Tribe"');
    }
    if (lowerText.includes("might want to consider")) {
      issues.push("Wishy-washy language detected");
    }
    if (lowerText.includes("perhaps")) {
      issues.push('Uses "perhaps" - be more direct');
    }
    if (lowerText.includes("optimize") || lowerText.includes("leverage") || lowerText.includes("synergy")) {
      issues.push("Corporate speak detected");
    }

    return { passed: issues.length === 0, issues };
  };

  it("accepts compliant content", () => {
    const content = "Professional drivers need to take control of their gut health. The Tribe understands this.";
    const result = checkBrandCompliance(content);
    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("rejects content with trucker", () => {
    const content = "Hey trucker, fix your diet!";
    const result = checkBrandCompliance(content);
    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.includes("trucker"))).toBe(true);
  });

  it("rejects wishy-washy language", () => {
    const content = "You might want to consider eating better";
    const result = checkBrandCompliance(content);
    expect(result.passed).toBe(false);
  });

  it("rejects corporate speak", () => {
    const content = "Let's leverage synergies to optimize your health journey";
    const result = checkBrandCompliance(content);
    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.includes("Corporate"))).toBe(true);
  });

  it("detects multiple issues", () => {
    const content = "Truckers might want to consider leveraging better nutrition";
    const result = checkBrandCompliance(content);
    expect(result.passed).toBe(false);
    expect(result.issues.length).toBeGreaterThan(1);
  });
});
