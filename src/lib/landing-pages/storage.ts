/**
 * Landing Page Storage
 * For now, file-based. Can migrate to database later.
 */

import { LandingPageData } from "./types";

// In-memory store for landing pages
// In production, this would be database-backed
const landingPages: Map<string, LandingPageData> = new Map();

// Initialize with Blood Sugar campaign
const bloodSugarPage: LandingPageData = {
  slug: "blood-sugar-guide",
  template: "lead_magnet",
  status: "published",
  
  title: "The Driver's Guide to Stable Blood Sugar | Let's Truck",
  metaDescription: "Free guide: Stop the energy crashes, brain fog, and weight gain. The NDK Protocol for truck drivers.",
  
  headline: "Why You're Exhausted by 2pm",
  subheadline: "The free guide that challenges everything you've been told about \"healthy eating\" on the road",
  
  benefits: [
    "Why salads and whole grains are actually making you WORSE",
    "The exact foods to order at Pilot, Love's, and TA",
    "The 7-day NDK Reset Protocol that stabilizes energy",
    "Which supplements actually work (and which are scams)",
    "The 30-day action plan you can follow on the road"
  ],
  
  trustElements: [
    "Join 4,000+ drivers already on this journey",
    "Created by Kevin Rutherford, host of Let's Truck",
    "Based on ancestral health science, not food industry propaganda"
  ],
  
  leadMagnet: {
    title: "The Driver's Guide to Stable Blood Sugar",
    description: "The NDK Protocol: 70-80% fat, animal-based, very low carb. This is how humans are designed to eat.",
    downloadUrl: "https://gamma.app/docs/The-Drivers-Guide-to-Stable-Blood-Sugar-9neq3bnqh6fpl5i"
  },
  
  ctaText: "Get My Free Guide",
  ctaSubtext: "No spam. Unsubscribe anytime.",
  
  formFields: ["email", "firstName"],
  constantContactListId: "", // To be configured
  
  thankYou: {
    headline: "Your Guide Is On The Way!",
    message: "Check your email in the next 5 minutes. While you wait...",
    ctas: [
      {
        text: "Download the AudioRoad App",
        url: "https://letstruck.com/download",
        style: "primary"
      },
      {
        text: "Join the Let's Truck Tribe",
        url: "https://letstrucktribe.com",
        style: "secondary"
      }
    ]
  },
  
  utmCampaign: "blood-sugar-guide-jan26",
  
  primaryColor: "#1e40af", // Blue
  accentColor: "#f59e0b", // Amber
  darkMode: false,
  
  createdAt: "2026-01-06T00:00:00Z",
  updatedAt: "2026-01-06T00:00:00Z",
  views: 0,
  conversions: 0
};

// Initialize with default pages
landingPages.set("blood-sugar-guide", bloodSugarPage);

// 7-Day NDK Reset Challenge
const ndkResetChallenge: LandingPageData & { challenge: any } = {
  slug: "7-day-ndk-reset",
  template: "challenge",
  status: "published",
  
  title: "7-Day NDK Reset Challenge | Let's Truck",
  metaDescription: "Reset your metabolism in 7 days with the NDK Protocol. Free challenge for truck drivers.",
  
  headline: "Reset Your Metabolism in 7 Days",
  subheadline: "The free challenge that breaks your sugar addiction and gives you all-day energy behind the wheel",
  
  benefits: [
    "Break free from carb cravings in the first 72 hours",
    "Wake up with energy instead of reaching for caffeine",
    "Stop the 2pm crash that makes driving dangerous",
    "Learn exactly what to eat at every major truck stop",
    "Build habits that stick for the long haul"
  ],
  
  trustElements: [
    "4,000+ drivers completed",
    "Free - no credit card required",
    "Daily email guidance"
  ],
  
  ctaText: "Join the Free Challenge",
  ctaSubtext: "Starts Monday. Limited spots.",
  
  formFields: ["email", "firstName"],
  constantContactListId: "",
  
  thankYou: {
    headline: "You're In!",
    message: "Check your email for your Day 1 instructions. The challenge starts Monday.",
    ctas: [
      {
        text: "Download the AudioRoad App",
        url: "https://letstruck.com/download",
        style: "primary"
      },
      {
        text: "Join the Let's Truck Tribe",
        url: "https://letstrucktribe.com",
        style: "secondary"
      }
    ]
  },
  
  utmCampaign: "ndk-reset-challenge",
  
  primaryColor: "#7c3aed",
  accentColor: "#f59e0b",
  darkMode: true,
  
  createdAt: "2026-01-07T00:00:00Z",
  updatedAt: "2026-01-07T00:00:00Z",
  views: 0,
  conversions: 0,
  
  // Challenge-specific fields
  challenge: {
    duration: "7 days",
    startDate: "2026-01-13T00:00:00Z", // Next Monday
    dailyBreakdown: [
      {
        day: 1,
        title: "Elimination Day",
        description: "Remove all carbs, sugar, and seed oils. Beef, eggs, salt, water only."
      },
      {
        day: 2,
        title: "Push Through",
        description: "Cravings peak today. Stay strong. Your body is switching fuel sources."
      },
      {
        day: 3,
        title: "The Turn",
        description: "Energy starts returning. Brain fog lifts. You're becoming fat-adapted."
      },
      {
        day: 4,
        title: "Add Fats",
        description: "Introduce butter, bacon, bone broth. Increase salt intake."
      },
      {
        day: 5,
        title: "Expand Proteins",
        description: "Add pork, lamb, seafood. Start feeling the steady energy."
      },
      {
        day: 6,
        title: "Test Dairy",
        description: "Try A2 dairy if desired. Notice how your body responds."
      },
      {
        day: 7,
        title: "Lock It In",
        description: "Build your sustainable NDK routine. Plan your next 30 days."
      }
    ],
    whatYouGet: [
      "Daily email with exactly what to eat",
      "Truck stop meal guide for each phase",
      "Private community access during the challenge",
      "Live Q&A with Kevin on Day 4",
      "NDK Quick Reference Card (printable)"
    ],
    whoItsFor: [
      "You crash hard every afternoon behind the wheel",
      "You've tried diets before but nothing sticks on the road",
      "You're pre-diabetic or worried about your health",
      "You're tired of feeling tired all the time",
      "You want to lose weight but hate feeling hungry"
    ],
    bonuses: [
      { title: "Truck Stop Survival Cheat Sheet", value: "$27 value" },
      { title: "7-Day Meal Plan", value: "$47 value" },
      { title: "Private Community Access", value: "Priceless" }
    ]
  }
};

landingPages.set("7-day-ndk-reset", ndkResetChallenge as LandingPageData);

export function getLandingPage(slug: string): LandingPageData | null {
  return landingPages.get(slug) || null;
}

export function getAllLandingPages(): LandingPageData[] {
  return Array.from(landingPages.values());
}

export function getPublishedLandingPages(): LandingPageData[] {
  return Array.from(landingPages.values()).filter(p => p.status === "published");
}

export function saveLandingPage(page: LandingPageData): void {
  page.updatedAt = new Date().toISOString();
  landingPages.set(page.slug, page);
}

export function deleteLandingPage(slug: string): boolean {
  return landingPages.delete(slug);
}

export function incrementViews(slug: string): void {
  const page = landingPages.get(slug);
  if (page) {
    page.views = (page.views || 0) + 1;
    landingPages.set(slug, page);
  }
}

export function incrementConversions(slug: string): void {
  const page = landingPages.get(slug);
  if (page) {
    page.conversions = (page.conversions || 0) + 1;
    landingPages.set(slug, page);
  }
}
