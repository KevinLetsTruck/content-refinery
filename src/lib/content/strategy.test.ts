/**
 * Tests for content strategy system
 */

import { describe, it, expect } from "vitest";
import {
  OBJECTIVE_PRIORITY,
  OBJECTIVE_CTAS,
  PILLAR_CONFIG,
  FORMULA_TEMPLATES,
  PLATFORM_CONFIG,
  HOOK_TEMPLATES,
  RED_FLAGS,
  scoreContent,
  checkRedFlags,
  getRandomCta,
  getPillarHashtags,
  suggestFormula,
  type BusinessObjective,
  type ContentPillar,
  type ContentFormula,
  type Platform,
} from "./strategy";

describe("Business Objectives", () => {
  it("has objectives in priority order", () => {
    expect(OBJECTIVE_PRIORITY).toEqual([
      "email_list",
      "coaching",
      "product_sales",
      "audience_growth",
      "podcast",
    ]);
  });

  it("has CTAs for each objective", () => {
    for (const objective of OBJECTIVE_PRIORITY) {
      expect(OBJECTIVE_CTAS[objective]).toBeDefined();
      expect(OBJECTIVE_CTAS[objective].length).toBeGreaterThan(0);
    }
  });

  it("email_list CTAs include keyword placeholder", () => {
    const emailCtas = OBJECTIVE_CTAS.email_list;
    const hasKeywordCta = emailCtas.some(cta => cta.includes("{KEYWORD}"));
    expect(hasKeywordCta).toBe(true);
  });
});

describe("Content Pillars", () => {
  const pillars: ContentPillar[] = [
    "proper_human_diet",
    "gut_health",
    "sleep_recovery",
    "detox_environment",
    "mental_performance",
  ];

  it("has all pillars configured", () => {
    for (const pillar of pillars) {
      expect(PILLAR_CONFIG[pillar]).toBeDefined();
    }
  });

  it("pillar percentages sum to 100", () => {
    const total = Object.values(PILLAR_CONFIG).reduce((sum, config) => sum + config.percentage, 0);
    expect(total).toBe(100);
  });

  it("each pillar has required fields", () => {
    for (const pillar of pillars) {
      const config = PILLAR_CONFIG[pillar];
      expect(config.name).toBeDefined();
      expect(config.percentage).toBeGreaterThan(0);
      expect(config.keyMessage).toBeDefined();
      expect(config.hashtags.length).toBeGreaterThan(0);
    }
  });

  it("proper_human_diet is the primary pillar at 30%", () => {
    expect(PILLAR_CONFIG.proper_human_diet.percentage).toBe(30);
  });
});

describe("Content Formulas", () => {
  const formulas: ContentFormula[] = [
    "data_bomb",
    "tough_love",
    "transformation",
    "contrarian",
    "protocol",
    "myth_buster",
    "insider_secret",
  ];

  it("has all formulas configured", () => {
    for (const formula of formulas) {
      expect(FORMULA_TEMPLATES[formula]).toBeDefined();
    }
  });

  it("each formula has structure and examples", () => {
    for (const formula of formulas) {
      const config = FORMULA_TEMPLATES[formula];
      expect(config.name).toBeDefined();
      expect(config.structure.length).toBeGreaterThan(0);
      expect(config.bestFor.length).toBeGreaterThan(0);
      expect(config.example).toBeDefined();
    }
  });

  it("data_bomb structure starts with shocking number", () => {
    expect(FORMULA_TEMPLATES.data_bomb.structure[0]).toContain("Shocking");
  });

  it("transformation structure includes before/after", () => {
    const structure = FORMULA_TEMPLATES.transformation.structure.join(" ");
    expect(structure.toLowerCase()).toContain("before");
    expect(structure.toLowerCase()).toContain("after");
  });
});

describe("Platform Configuration", () => {
  const platforms: Platform[] = ["twitter", "facebook", "instagram", "linkedin", "tiktok"];

  it("has all platforms configured", () => {
    for (const platform of platforms) {
      expect(PLATFORM_CONFIG[platform]).toBeDefined();
    }
  });

  it("each platform has required fields", () => {
    for (const platform of platforms) {
      const config = PLATFORM_CONFIG[platform];
      expect(config.charLimit).toBeGreaterThan(0);
      expect(config.hashtagLimit).toBeGreaterThan(0);
      expect(config.bestTimes.length).toBeGreaterThan(0);
      expect(config.frequency).toBeDefined();
      expect(config.bestContent.length).toBeGreaterThan(0);
      expect(config.rules.length).toBeGreaterThan(0);
    }
  });

  it("Twitter has 280 char limit", () => {
    expect(PLATFORM_CONFIG.twitter.charLimit).toBe(280);
  });

  it("Instagram allows up to 30 hashtags", () => {
    expect(PLATFORM_CONFIG.instagram.hashtagLimit).toBe(30);
  });

  it("TikTok rules mention hook timing", () => {
    const rules = PLATFORM_CONFIG.tiktok.rules.join(" ");
    expect(rules).toContain("1 second");
  });
});

describe("Hook Templates", () => {
  it("has templates for all hook types", () => {
    const hookTypes = [
      "shocking_stat",
      "contrarian",
      "challenge",
      "curiosity_gap",
      "story_tease",
      "direct_command",
      "us_vs_them",
      "bold_promise",
    ];

    for (const hookType of hookTypes) {
      expect(HOOK_TEMPLATES[hookType as keyof typeof HOOK_TEMPLATES]).toBeDefined();
    }
  });

  it("each hook type has formula and examples", () => {
    for (const [, template] of Object.entries(HOOK_TEMPLATES)) {
      expect(template.formula).toBeDefined();
      expect(template.examples.length).toBeGreaterThan(0);
    }
  });
});

describe("Red Flags", () => {
  it("includes trucker terminology flags", () => {
    const patterns = RED_FLAGS.map(f => f.pattern.source);
    expect(patterns.some(p => p.toLowerCase().includes("trucker"))).toBe(true);
  });

  it("includes wishy-washy language flags", () => {
    const messages = RED_FLAGS.map(f => f.message);
    expect(messages.some(m => m.includes("Wishy-washy"))).toBe(true);
  });

  it("includes corporate speak flags", () => {
    const messages = RED_FLAGS.map(f => f.message);
    expect(messages.some(m => m.includes("Corporate speak"))).toBe(true);
  });
});

describe("scoreContent", () => {
  it("scores basic content correctly", () => {
    const score = scoreContent(
      "This is test content for drivers",
      "twitter",
      true,
      true,
      "gut_health"
    );

    expect(score.hookStrength).toBeDefined();
    expect(score.valueDensity).toBeDefined();
    expect(score.brandVoice).toBeDefined();
    expect(score.ctaClarity).toBeDefined();
    expect(score.platformFit).toBeDefined();
    expect(score.totalScore).toBeGreaterThan(0);
  });

  it("flags content with banned terms", () => {
    const score = scoreContent(
      "Hey truckers, here is some advice",
      "twitter",
      true,
      true,
      "gut_health"
    );

    expect(score.issues.length).toBeGreaterThan(0);
    expect(score.issues[0]).toContain("trucker");
    expect(score.passed).toBe(false);
  });

  it("flags content over character limit", () => {
    const longText = "A".repeat(300);
    const score = scoreContent(longText, "twitter", true, true, "gut_health");

    expect(score.issues.some(i => i.includes("character limit"))).toBe(true);
    expect(score.platformFit).toBeLessThan(8);
  });

  it("gives lower scores without hook", () => {
    const withHook = scoreContent("Test", "twitter", true, true, "gut_health");
    const withoutHook = scoreContent("Test", "twitter", false, true, "gut_health");

    expect(withHook.hookStrength).toBeGreaterThan(withoutHook.hookStrength);
  });

  it("gives lower scores without CTA", () => {
    const withCta = scoreContent("Test", "twitter", true, true, "gut_health");
    const withoutCta = scoreContent("Test", "twitter", true, false, "gut_health");

    expect(withCta.ctaClarity).toBeGreaterThan(withoutCta.ctaClarity);
  });

  it("calculates weighted total correctly", () => {
    const score = scoreContent(
      "Valid content for drivers",
      "twitter",
      true,
      true,
      "gut_health"
    );

    // Verify weighting: hook 30%, value 25%, brand 20%, cta 15%, platform 10%
    const expectedTotal =
      (score.hookStrength * 0.3) +
      (score.valueDensity * 0.25) +
      (score.brandVoice * 0.2) +
      (score.ctaClarity * 0.15) +
      (score.platformFit * 0.1);

    expect(score.totalScore).toBeCloseTo(expectedTotal, 1);
  });

  it("passes when score >= 7 and no issues", () => {
    const score = scoreContent(
      "Valid content for drivers with good length and no banned terms",
      "twitter",
      true,
      true,
      "gut_health"
    );

    if (score.totalScore >= 7 && score.issues.length === 0) {
      expect(score.passed).toBe(true);
    }
  });
});

describe("checkRedFlags", () => {
  it("passes clean content", () => {
    const result = checkRedFlags("Content for professional drivers about gut health");
    expect(result.passed).toBe(true);
    expect(result.flags).toHaveLength(0);
  });

  it("flags trucker term", () => {
    const result = checkRedFlags("Hey trucker, listen up");
    expect(result.passed).toBe(false);
    expect(result.flags.length).toBeGreaterThan(0);
    expect(result.flags[0]).toContain("trucker");
  });

  it("flags truckers (plural)", () => {
    const result = checkRedFlags("All truckers need to hear this");
    expect(result.passed).toBe(false);
    expect(result.flags.some(f => f.includes("truckers"))).toBe(true);
  });

  it("flags wishy-washy language", () => {
    const result = checkRedFlags("You might want to consider trying this");
    expect(result.passed).toBe(false);
    expect(result.flags.some(f => f.includes("Wishy-washy"))).toBe(true);
  });

  it("flags perhaps", () => {
    const result = checkRedFlags("Perhaps you should eat better");
    expect(result.passed).toBe(false);
  });

  it("flags corporate speak", () => {
    const result = checkRedFlags("Let's leverage these synergies to optimize your health");
    expect(result.passed).toBe(false);
    expect(result.flags.some(f => f.includes("Corporate speak"))).toBe(true);
  });

  it("flags gym bro language", () => {
    const result = checkRedFlags("Get shredded and make gains bro");
    expect(result.passed).toBe(false);
    expect(result.flags.some(f => f.includes("Gym bro"))).toBe(true);
  });

  it("detects multiple flags", () => {
    const result = checkRedFlags("Truckers might want to consider optimizing their diet");
    expect(result.passed).toBe(false);
    expect(result.flags.length).toBeGreaterThan(1);
  });
});

describe("getRandomCta", () => {
  it("returns a CTA for email_list objective", () => {
    const cta = getRandomCta("email_list", "GUT");
    expect(cta).toBeDefined();
    expect(typeof cta).toBe("string");
  });

  it("replaces keyword placeholder", () => {
    const cta = getRandomCta("email_list", "GUT");
    expect(cta).not.toContain("{KEYWORD}");
    // At least some email CTAs should include the keyword
    const allCtas = Array.from({ length: 20 }, () => getRandomCta("email_list", "GUT"));
    expect(allCtas.some(c => c.includes("GUT"))).toBe(true);
  });

  it("uses default GUIDE when no keyword provided", () => {
    const allCtas = Array.from({ length: 20 }, () => getRandomCta("email_list"));
    expect(allCtas.some(c => c.includes("GUIDE"))).toBe(true);
  });

  it("returns CTAs for all objectives", () => {
    for (const objective of OBJECTIVE_PRIORITY) {
      const cta = getRandomCta(objective);
      expect(cta).toBeDefined();
      expect(cta.length).toBeGreaterThan(0);
    }
  });
});

describe("getPillarHashtags", () => {
  it("returns pillar-specific hashtags plus common ones", () => {
    const hashtags = getPillarHashtags("gut_health");
    expect(hashtags).toContain("GutHealth");
    expect(hashtags).toContain("LetsTruck");
    expect(hashtags).toContain("DriverHealth");
  });

  it("returns correct hashtags for each pillar", () => {
    expect(getPillarHashtags("proper_human_diet")).toContain("ProperHumanDiet");
    expect(getPillarHashtags("sleep_recovery")).toContain("DriverSleep");
    expect(getPillarHashtags("detox_environment")).toContain("Detox");
    expect(getPillarHashtags("mental_performance")).toContain("MentalClarity");
  });
});

describe("suggestFormula", () => {
  it("suggests data_bomb for stats", () => {
    expect(suggestFormula("stat")).toBe("data_bomb");
  });

  it("suggests transformation for testimonials", () => {
    expect(suggestFormula("testimonial")).toBe("transformation");
  });

  it("suggests contrarian for hot_takes", () => {
    expect(suggestFormula("hot_take")).toBe("contrarian");
  });

  it("suggests protocol for tips", () => {
    expect(suggestFormula("tip")).toBe("protocol");
  });

  it("suggests myth_buster for educational content", () => {
    expect(suggestFormula("educational")).toBe("myth_buster");
  });

  it("suggests tough_love for quotes", () => {
    expect(suggestFormula("quote")).toBe("tough_love");
  });

  it("defaults to data_bomb for unknown types", () => {
    expect(suggestFormula("unknown_type")).toBe("data_bomb");
  });
});
