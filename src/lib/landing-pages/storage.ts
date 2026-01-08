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
        url: "https://apps.apple.com/us/app/letstruck/id1613223362",
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
        url: "https://apps.apple.com/us/app/letstruck/id1613223362",
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

// Berberine Product Page
const berberinePage: LandingPageData & { product: any } = {
  slug: "berberine",
  template: "product_launch",
  status: "published",
  
  title: "Berberine Blood Sugar Support | Let's Truck Shop",
  metaDescription: "Clinically-studied berberine for healthy blood sugar levels. Made for drivers, by drivers.",
  
  headline: "Take Control of Your Blood Sugar",
  subheadline: "Clinically-studied berberine that works as hard as you do. No prescription required.",
  
  benefits: [
    "Supports healthy blood sugar already in normal range",
    "Promotes metabolic health and energy levels",
    "Works synergistically with the NDK Protocol",
    "Third-party tested for purity and potency"
  ],
  
  trustElements: [
    "500+ drivers using it",
    "60-day money-back guarantee",
    "Ships free over $50",
    "Third-party tested"
  ],
  
  testimonials: [
    {
      quote: "My A1C dropped from 6.2 to 5.4 in three months. Combined with NDK, this stuff actually works.",
      author: "Mike T.",
      role: "Owner-operator, 12 years OTR"
    },
    {
      quote: "No more afternoon crashes. I take it before my biggest meal and my energy stays steady all day.",
      author: "James R.",
      role: "Regional driver"
    },
    {
      quote: "My doctor was surprised at my numbers. I told him about berberine and NDK. He said keep doing whatever you're doing.",
      author: "Carlos M.",
      role: "Team driver"
    }
  ],
  
  ctaText: "Add to Cart",
  
  formFields: [],
  
  thankYou: {
    headline: "Order Confirmed!",
    message: "Your berberine is on its way.",
    ctas: []
  },
  
  utmCampaign: "berberine-launch",
  
  primaryColor: "#1e40af",
  accentColor: "#f59e0b",
  darkMode: false,
  
  createdAt: "2026-01-07T00:00:00Z",
  updatedAt: "2026-01-07T00:00:00Z",
  views: 0,
  conversions: 0,
  
  // Product-specific fields
  product: {
    price: "$34.99",
    originalPrice: "$44.99",
    priceSubtext: "60 capsules • 30-day supply",
    buyUrl: "https://shop.letstruck.com/products/berberine",
    buyButtonText: "Add to Cart",
    productImage: "", // Add product image URL
    
    problem: {
      headline: "The Blood Sugar Struggle Is Real on the Road",
      points: [
        "You eat what's available at truck stops — and your body pays the price",
        "Energy crashes hit hardest when you need to stay alert behind the wheel",
        "Your doctor keeps warning you about your numbers, but nothing seems to work",
        "Prescription options come with side effects that make driving harder",
        "Diets fail because they don't account for life on the road"
      ]
    },
    
    solution: {
      headline: "Ancient Wisdom Meets Modern Science",
      description: "Berberine has been used for thousands of years in traditional medicine. Modern research shows it supports healthy blood sugar metabolism through multiple pathways — activating AMPK, supporting insulin sensitivity, and promoting healthy glucose uptake. Combined with the NDK Protocol, it's the one-two punch your metabolism needs."
    },
    
    features: [
      {
        title: "500mg Per Capsule",
        description: "Clinical-strength dosing. Most studies showing benefits used 500mg doses."
      },
      {
        title: "97% Pure Berberine HCl",
        description: "Extracted from Berberis aristata root. No fillers, no junk."
      },
      {
        title: "Third-Party Tested",
        description: "Every batch tested for purity, potency, and contaminants."
      },
      {
        title: "No Prescription Needed",
        description: "Natural supplement you can add to your routine today."
      },
      {
        title: "Made in USA",
        description: "Manufactured in a GMP-certified facility right here in America."
      },
      {
        title: "Driver-Tested",
        description: "Recommended by Kevin Rutherford and used by 500+ drivers in the Tribe."
      }
    ],
    
    specs: [
      { label: "Berberine HCl", value: "500mg per capsule" },
      { label: "Servings Per Container", value: "60 capsules" },
      { label: "Suggested Use", value: "1 capsule with meals, 1-2x daily" },
      { label: "Source", value: "Berberis aristata root extract" },
      { label: "Other Ingredients", value: "Vegetable cellulose capsule" },
      { label: "Allergens", value: "None" }
    ],
    
    howItWorks: [
      {
        step: 1,
        title: "Take With Your Biggest Meal",
        description: "One capsule 15-30 minutes before eating helps prepare your body for glucose processing."
      },
      {
        step: 2,
        title: "Activates AMPK Pathway",
        description: "Berberine activates your metabolic master switch, telling your body to use glucose for energy instead of storing it."
      },
      {
        step: 3,
        title: "Supports Steady Energy",
        description: "Better glucose metabolism means fewer spikes and crashes. Stay alert when it matters most."
      }
    ],
    
    faq: [
      {
        question: "How is this different from metformin?",
        answer: "Berberine is a natural compound that works through similar pathways as metformin but is available without a prescription. Some studies show comparable effects on blood sugar markers. Always consult your doctor before making changes to your health routine, especially if you're on medication."
      },
      {
        question: "When will I notice results?",
        answer: "Most people notice improved energy and fewer crashes within 1-2 weeks. Blood sugar marker improvements typically show up in lab work after 8-12 weeks of consistent use combined with dietary changes."
      },
      {
        question: "Can I take this with other supplements?",
        answer: "Yes, berberine works well alongside the NDK Protocol. It pairs especially well with magnesium and omega-3s. If you're on prescription medications, check with your doctor first."
      },
      {
        question: "Why 500mg?",
        answer: "Clinical studies showing blood sugar benefits typically used 500mg doses taken 2-3 times daily with meals. We use the clinically-studied dose so you know exactly what you're getting."
      },
      {
        question: "Any side effects?",
        answer: "Some people experience mild GI discomfort when starting. Taking with food minimizes this. Start with one capsule daily and work up to two if desired."
      }
    ],
    
    guarantee: {
      title: "60-Day Money-Back Guarantee",
      description: "Try it risk-free. If you don't notice a difference in your energy and how you feel, send it back for a full refund. No questions asked.",
      duration: "60 days to decide"
    },
    
    urgency: {
      type: "limited_stock",
      message: "Limited stock — next shipment arrives in 2 weeks"
    }
  }
};

landingPages.set("berberine", berberinePage as LandingPageData);

// The Great Nutrition Lie Campaign - Proper Human Diet Guide
const nutritionLiePage: LandingPageData = {
  slug: "nutrition-lie",
  template: "lead_magnet",
  status: "published",

  title: "The Great Nutrition Lie: What They Don't Want Drivers to Know | Let's Truck",
  metaDescription: "Free guide reveals the truth about nutrition for professional drivers. Stop following advice designed to keep you sick and tired.",

  headline: "The Great Nutrition Lie",
  subheadline: "What the food industry, big pharma, and even your doctor don't want professional drivers to know about eating right on the road",

  benefits: [
    "Why the 'heart healthy' diet advice is actually KILLING drivers",
    "The 3 foods you've been told are healthy that are destroying your gut",
    "How the food pyramid was designed by grain lobbyists, not scientists",
    "The simple eating pattern that eliminates brain fog, crashes, and cravings",
    "What to order at ANY truck stop that supports your health instead of wrecking it",
    "The truth about supplements - which ones actually work and which are scams"
  ],

  trustElements: [
    "4,000+ drivers in the Let's Truck Tribe",
    "15+ years of trucking industry health expertise",
    "Based on ancestral health science, not corporate propaganda",
    "Created by Kevin Rutherford, FNTP - America's Trucking Health Coach"
  ],

  leadMagnet: {
    title: "The Proper Human Diet Guide for Drivers",
    description: "The no-BS roadmap to taking back your health. Stop following advice from people who have never spent a night in a truck.",
    downloadUrl: "" // User will add PDF URL here
  },

  ctaText: "Get My Free Guide Now",
  ctaSubtext: "Instant download. No spam. Unsubscribe anytime.",

  formFields: ["email", "firstName"],
  constantContactListId: "423c262c-ec19-11f0-8667-0242b4ca28b6",

  thankYou: {
    headline: "Your Guide Is Ready!",
    message: "Check your email for the download link. While you wait, here's what to do next...",
    ctas: [
      {
        text: "Join the Let's Truck Tribe",
        url: "https://letstrucktribe.com",
        style: "primary"
      },
      {
        text: "Listen to Let's Truck Radio",
        url: "https://letstruck.com/radio",
        style: "secondary"
      }
    ]
  },

  utmCampaign: "nutrition-lie-guide-jan26",

  primaryColor: "#dc2626", // Red - signals "warning/truth revealed"
  accentColor: "#f59e0b", // Amber - Let's Truck brand
  darkMode: true,

  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  views: 0,
  conversions: 0
};

landingPages.set("nutrition-lie", nutritionLiePage);

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
