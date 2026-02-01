/**
 * Let's Truck Content Strategy System
 * Rules and frameworks for world-class social media content
 */

// ============================================
// BUSINESS OBJECTIVES (Priority Order)
// ============================================

export type BusinessObjective = 
  | "email_list"      // Priority 1: Build the list
  | "coaching"        // Priority 2: Client acquisition  
  | "product_sales"   // Priority 3: Store revenue
  | "audience_growth" // Priority 4: Followers/reach
  | "podcast";        // Priority 5: Listeners

export const OBJECTIVE_PRIORITY: BusinessObjective[] = [
  "email_list",
  "coaching", 
  "product_sales",
  "audience_growth",
  "podcast",
];

export const OBJECTIVE_CTAS: Record<BusinessObjective, string[]> = {
  email_list: [
    "DM me '{KEYWORD}' and I'll send you my free guide",
    "Comment '{KEYWORD}' and I'll DM you the PDF",
    "Link in bio for the free download",
    "Join 20,000 drivers getting weekly health intel - link in bio",
  ],
  coaching: [
    "Ready to fix this for good? Link in bio to book a discovery call",
    "DM me 'HELP' if this sounds like you",
    "Taking on 3 new clients this month. DM if you're serious",
    "Want me to look at your labs? Link in bio",
  ],
  product_sales: [
    "This is what I use personally - link in bio",
    "Grab this at store.letstruck.com",
    "The Tribe gets 15% off with code DRIVER",
  ],
  audience_growth: [
    "Save this for later",
    "Share with a driver who needs to hear this",
    "Follow for more no-BS health truth",
    "Tag a driver who's running on fumes",
  ],
  podcast: [
    "Full breakdown on this week's episode - link in bio",
    "We went deep on this - search 'Let's Truck Radio'",
  ],
};

// ============================================
// CONTENT PILLARS
// ============================================

// Content category determines the overall theme
export type ContentCategory =
  | "health"           // Health coaching content
  | "business"         // Trucking business & owner-operator advice
  | "industry"         // Industry news, regulations, trends
  | "lifestyle"        // Life on the road, driver lifestyle
  | "fiction";         // TruckTales and storytelling

export type ContentPillar =
  // Health pillars
  | "proper_human_diet"
  | "gut_health"
  | "sleep_recovery"
  | "detox_environment"
  | "mental_performance"
  // Business pillars
  | "fuel_efficiency"
  | "business_operations"
  | "owner_operator"
  | "rates_revenue"
  | "equipment_maintenance"
  // Industry pillars
  | "regulations_compliance"
  | "industry_news"
  | "market_trends"
  // Lifestyle pillars
  | "life_on_road"
  | "driver_community"
  // Fiction pillars
  | "trucktales_fiction";

export const PILLAR_CATEGORY: Record<ContentPillar, ContentCategory> = {
  proper_human_diet: "health",
  gut_health: "health",
  sleep_recovery: "health",
  detox_environment: "health",
  mental_performance: "health",
  fuel_efficiency: "business",
  business_operations: "business",
  owner_operator: "business",
  rates_revenue: "business",
  equipment_maintenance: "business",
  regulations_compliance: "industry",
  industry_news: "industry",
  market_trends: "industry",
  life_on_road: "lifestyle",
  driver_community: "lifestyle",
  trucktales_fiction: "fiction",
};

export const PILLAR_CONFIG: Record<ContentPillar, {
  name: string;
  category: ContentCategory;
  keyMessage: string;
  hashtags: string[];
}> = {
  // HEALTH PILLARS
  proper_human_diet: {
    name: "Proper Human Diet",
    category: "health",
    keyMessage: "Eat like your ancestors, not like a corporation wants you to",
    hashtags: ["ProperHumanDiet", "RealFood", "AncestralHealth"],
  },
  gut_health: {
    name: "Gut Health & Candida",
    category: "health",
    keyMessage: "70% of drivers have Candida. Fix the gut, fix everything.",
    hashtags: ["GutHealth", "Candida", "Microbiome"],
  },
  sleep_recovery: {
    name: "Sleep & Recovery",
    category: "health",
    keyMessage: "4.78 hours isn't a badge of honor. It's a death sentence.",
    hashtags: ["DriverSleep", "Recovery", "RestDay"],
  },
  detox_environment: {
    name: "Detox & Environment",
    category: "health",
    keyMessage: "Diesel exhaust is in your blood. Here's how to get it out.",
    hashtags: ["Detox", "CleanLiving", "ToxinFree"],
  },
  mental_performance: {
    name: "Mental Performance",
    category: "health",
    keyMessage: "Your brain runs on fuel, not willpower.",
    hashtags: ["MentalClarity", "BrainHealth", "Focus"],
  },
  // BUSINESS PILLARS
  fuel_efficiency: {
    name: "Fuel Efficiency & Mileage",
    category: "business",
    keyMessage: "Every MPG matters. Small changes, big savings.",
    hashtags: ["FuelEfficiency", "MPG", "TruckingBusiness"],
  },
  business_operations: {
    name: "Business Operations",
    category: "business",
    keyMessage: "Run your trucking business like a business, not a hobby.",
    hashtags: ["TruckingBusiness", "SmallBusiness", "Operations"],
  },
  owner_operator: {
    name: "Owner-Operator Success",
    category: "business",
    keyMessage: "Be the owner-operator of your business, not just your truck.",
    hashtags: ["OwnerOperator", "OO", "IndependentDriver"],
  },
  rates_revenue: {
    name: "Rates & Revenue",
    category: "business",
    keyMessage: "Know your numbers. Every load, every mile, every expense.",
    hashtags: ["FreightRates", "TruckingRevenue", "LoadBoard"],
  },
  equipment_maintenance: {
    name: "Equipment & Maintenance",
    category: "business",
    keyMessage: "Preventive maintenance is cheaper than roadside breakdowns.",
    hashtags: ["TruckMaintenance", "PreventiveMaintenance", "Equipment"],
  },
  // INDUSTRY PILLARS
  regulations_compliance: {
    name: "Regulations & Compliance",
    category: "industry",
    keyMessage: "Know the rules before the rules know you.",
    hashtags: ["FMCSA", "Compliance", "Regulations"],
  },
  industry_news: {
    name: "Industry News",
    category: "industry",
    keyMessage: "Stay informed. The industry is always changing.",
    hashtags: ["TruckingNews", "FreightIndustry", "Transportation"],
  },
  market_trends: {
    name: "Market Trends",
    category: "industry",
    keyMessage: "Understanding the market is understanding your future.",
    hashtags: ["FreightMarket", "TruckingTrends", "MarketAnalysis"],
  },
  // LIFESTYLE PILLARS
  life_on_road: {
    name: "Life on the Road",
    category: "lifestyle",
    keyMessage: "This life isn't for everyone. But for us, there's nothing else.",
    hashtags: ["TruckLife", "LifeOnTheRoad", "OTR"],
  },
  driver_community: {
    name: "Driver Community",
    category: "lifestyle",
    keyMessage: "We're a tribe. We look out for each other.",
    hashtags: ["TheTribe", "DriverCommunity", "LetsTruck"],
  },
  // FICTION PILLARS
  trucktales_fiction: {
    name: "TruckTales Fiction",
    category: "fiction",
    keyMessage: "Stories from the road that could only happen to us.",
    hashtags: ["TruckTales", "TruckingFiction", "RoadStories"],
  },
};

// ============================================
// CONTENT FORMULAS
// ============================================

export type ContentFormula = 
  | "data_bomb"
  | "tough_love"
  | "transformation"
  | "contrarian"
  | "protocol"
  | "myth_buster"
  | "insider_secret";

export const FORMULA_TEMPLATES: Record<ContentFormula, {
  name: string;
  structure: string[];
  bestFor: string[];
  example: string;
}> = {
  data_bomb: {
    name: "The Data Bomb",
    structure: [
      "Shocking number",
      "Context that makes it worse",
      "Why nobody talks about this",
      "What it means for you",
      "What to do about it",
    ],
    bestFor: ["stats", "research", "shocking truths"],
    example: "70% of professional drivers test positive for Candida. General population? 13%. That's 5x higher...",
  },
  tough_love: {
    name: "The Tough Love Truth",
    structure: [
      "Hard truth statement",
      "Why most won't accept it",
      "What happens if ignored",
      "The path forward",
      "Challenge wrapped in encouragement",
    ],
    bestFor: ["mindset", "accountability", "wake-up calls"],
    example: "Nobody's coming to save you. Not your dispatcher. Not your doctor...",
  },
  transformation: {
    name: "The Transformation Story",
    structure: [
      "Before state (vivid, specific)",
      "The breaking point",
      "What we did differently", 
      "After state (specific results)",
      "The lesson for you",
    ],
    bestFor: ["client results", "testimonials", "proof"],
    example: "Mike came to me at 340 lbs. Pre-diabetic. Couldn't stay awake past 2 PM...",
  },
  contrarian: {
    name: "The Contrarian Hot Take",
    structure: [
      "Statement challenging conventional wisdom",
      "Why mainstream is wrong",
      "What's actually true",
      "Your proof/experience",
      "The takeaway",
    ],
    bestFor: ["engagement", "shares", "authority"],
    example: "'Eat less, move more' is the worst health advice ever given...",
  },
  protocol: {
    name: "The Practical Protocol",
    structure: [
      "The problem",
      "Why common solutions fail",
      "Your approach (3-5 steps)",
      "Expected results",
      "Next level help available",
    ],
    bestFor: ["actionable tips", "how-to", "product integration"],
    example: "Can't sleep in the cab? Here's what most drivers try (and why it fails)...",
  },
  myth_buster: {
    name: "The Myth Buster",
    structure: [
      "The common myth",
      "Where it came from",
      "The actual truth",
      "The evidence",
      "What to do instead",
    ],
    bestFor: ["education", "authority", "challenging assumptions"],
    example: "MYTH: 'Breakfast is the most important meal of the day' - That slogan was invented by Kellogg's in 1944...",
  },
  insider_secret: {
    name: "The Insider Secret",
    structure: [
      "What they don't want you to know",
      "Why it's hidden",
      "The insider knowledge",
      "How you discovered it",
      "How they can access it",
    ],
    bestFor: ["trust building", "exclusivity", "engagement"],
    example: "Dirty secret the supplement industry won't tell you: 90% of what's on truck stop shelves is garbage...",
  },
};

// ============================================
// HOOKS
// ============================================

export type HookType = 
  | "shocking_stat"
  | "contrarian"
  | "challenge"
  | "curiosity_gap"
  | "story_tease"
  | "direct_command"
  | "us_vs_them"
  | "bold_promise";

export const HOOK_TEMPLATES: Record<HookType, {
  formula: string;
  examples: string[];
}> = {
  shocking_stat: {
    formula: "[Number] + [Unexpected context]",
    examples: [
      // Health
      "70% of drivers are growing fungus in their gut right now",
      "4.78 hours. That's how much sleep the average driver gets.",
      // Business
      "The average O/O loses $0.12 per mile and doesn't even know it.",
      "1 MPG improvement = $10,000/year in your pocket.",
      "83% of trucking companies fail within the first year.",
    ],
  },
  contrarian: {
    formula: "[Opposite of common belief]",
    examples: [
      // Health
      "Eating healthy is making you sick",
      "Your doctor is wrong about cholesterol",
      // Business
      "Low rates aren't killing your business. Bad math is.",
      "That 'good deal' on fuel is costing you money.",
      "Mega carriers want you to think you can't compete. You can.",
    ],
  },
  challenge: {
    formula: "[Direct accusation/question]",
    examples: [
      // Health
      "When's the last time you actually felt good?",
      "Be honest: how many energy drinks today?",
      // Business
      "Do you actually know your cost per mile? Real number.",
      "When's the last time you calculated your true profit?",
      "How many miles did you run for free last month?",
    ],
  },
  curiosity_gap: {
    formula: "[Incomplete revelation]",
    examples: [
      // Health
      "The one thing I tell every driver on day one...",
      "What I wish I knew before I started...",
      // Business
      "The fuel hack that's saving me $400/month...",
      "What top O/Os know about rates that you don't...",
      "The one number that predicts trucking business failure...",
    ],
  },
  story_tease: {
    formula: "[Dramatic moment]",
    examples: [
      // Health
      "He called me from the hospital. 'You were right.'",
      "She almost lost her CDL over this...",
      // Business
      "He turned down a $3.50/mile load. Here's why he was right.",
      "Lost $20,000 in one quarter. Here's what I learned.",
      "The broker lied. I had proof. Here's what happened next.",
    ],
  },
  direct_command: {
    formula: "[Urgent imperative]",
    examples: [
      // Health
      "Stop eating breakfast. Here's why.",
      "Read this before your next DOT physical.",
      // Business
      "Stop chasing cheap fuel. Start here instead.",
      "Calculate your CPM right now. I'll wait.",
      "Check your tire pressure before your next load. Trust me.",
    ],
  },
  us_vs_them: {
    formula: "[Tribal identification]",
    examples: [
      // Health
      "Doctors don't understand our life. Let me explain...",
      "What works in an office won't work in a cab.",
      // Business
      "Brokers don't want you to know this...",
      "Mega carriers are scared of informed O/Os.",
      "The freight system is rigged. Here's how to win anyway.",
    ],
  },
  bold_promise: {
    formula: "[Specific outcome]",
    examples: [
      // Health
      "Do this for 7 days and you'll never go back to energy drinks",
      "30 days to fix your gut. Here's the protocol.",
      // Business
      "Add 0.5 MPG in one week with these 3 changes.",
      "Double your profit margin in 90 days. Here's the math.",
      "Never run a load under cost again. Here's how.",
    ],
  },
};

export const POWER_WORDS = {
  danger: ["Warning", "Dangerous", "Killing", "Destroying", "Toxic", "Deadly"],
  curiosity: ["Secret", "Hidden", "Truth", "Nobody tells you", "Actually"],
  urgency: ["Now", "Today", "Immediately", "Stop", "Before it's too late"],
  authority: ["Proof", "Science", "Data", "Research", "I've seen"],
  tribal: ["Drivers", "The Tribe", "We", "Our", "Together"],
  transformation: ["Changed", "Finally", "Breakthrough", "Discovery"],
};

// ============================================
// PLATFORM CONFIGS
// ============================================

export type Platform = "twitter" | "facebook" | "instagram" | "linkedin" | "tiktok";

export const PLATFORM_CONFIG: Record<Platform, {
  charLimit: number;
  hashtagLimit: number;
  bestTimes: string[];
  frequency: string;
  bestContent: string[];
  rules: string[];
}> = {
  twitter: {
    charLimit: 280,
    hashtagLimit: 3,
    bestTimes: ["6-8 AM", "12-1 PM", "5-7 PM"],
    frequency: "3-5x daily",
    bestContent: ["hot takes", "stats", "threads", "engagement"],
    rules: [
      "Hook in first line (before the fold)",
      "Threads for longer content",
      "Quote tweet with hot takes",
      "Use line breaks for readability",
    ],
  },
  facebook: {
    charLimit: 63206,
    hashtagLimit: 5,
    bestTimes: ["7-9 AM", "7-9 PM"],
    frequency: "1-2x daily",
    bestContent: ["stories", "transformation posts", "community"],
    rules: [
      "Longer posts perform better (150-300 words)",
      "Use line breaks liberally",
      "Video gets 10x reach",
      "Stories for behind-the-scenes",
    ],
  },
  instagram: {
    charLimit: 2200,
    hashtagLimit: 30,
    bestTimes: ["11 AM - 1 PM", "7-9 PM"],
    frequency: "1-2x daily feed, 5-10 stories",
    bestContent: ["quote cards", "carousels", "Reels"],
    rules: [
      "Carousel > single image for saves",
      "First slide is the hook",
      "Reels for reach, Feed for depth",
      "Caption hook before 'more' cutoff",
    ],
  },
  linkedin: {
    charLimit: 3000,
    hashtagLimit: 5,
    bestTimes: ["7-8 AM", "12 PM", "5-6 PM"],
    frequency: "1x daily (weekdays)",
    bestContent: ["professional insights", "industry data", "credibility"],
    rules: [
      "More professional tone",
      "Talk about transportation industry",
      "Share research and clinical insights",
      "Document format works well",
    ],
  },
  tiktok: {
    charLimit: 2200,
    hashtagLimit: 5,
    bestTimes: ["7-9 AM", "12-3 PM", "7-11 PM"],
    frequency: "1-3x daily",
    bestContent: ["quick tips", "myth busting", "reactions"],
    rules: [
      "Hook in first 1 second",
      "Vertical video only",
      "Trending sounds help reach",
      "Keep under 60 seconds for best retention",
    ],
  },
};

// ============================================
// SCORING SYSTEM
// ============================================

export interface ContentScore {
  hookStrength: number;      // 30% weight
  valueDensity: number;      // 25% weight
  brandVoice: number;        // 20% weight
  ctaClarity: number;        // 15% weight
  platformFit: number;       // 10% weight
  totalScore: number;
  passed: boolean;
  issues: string[];
}

export function scoreContent(
  text: string,
  platform: Platform,
  hasHook: boolean,
  hasCta: boolean,
  pillar: ContentPillar | null
): ContentScore {
  const issues: string[] = [];
  
  // Check for banned terms
  const bannedTerms = ["trucker", "truckers", "might want to consider", "perhaps", "maybe"];
  for (const term of bannedTerms) {
    if (text.toLowerCase().includes(term)) {
      issues.push(`Contains banned term: "${term}"`);
    }
  }
  
  // Check character limit
  const config = PLATFORM_CONFIG[platform];
  if (text.length > config.charLimit) {
    issues.push(`Exceeds ${platform} character limit (${text.length}/${config.charLimit})`);
  }
  
  // Score components (simplified - AI should evaluate these)
  const hookStrength = hasHook ? 8 : 3;
  const valueDensity = text.length > 100 ? 7 : 5;
  const brandVoice = issues.length === 0 ? 8 : 4;
  const ctaClarity = hasCta ? 8 : 4;
  const platformFit = text.length <= config.charLimit ? 8 : 3;
  
  // Calculate weighted total
  const totalScore = 
    (hookStrength * 0.30) +
    (valueDensity * 0.25) +
    (brandVoice * 0.20) +
    (ctaClarity * 0.15) +
    (platformFit * 0.10);
  
  return {
    hookStrength,
    valueDensity,
    brandVoice,
    ctaClarity,
    platformFit,
    totalScore: Math.round(totalScore * 10) / 10,
    passed: totalScore >= 7 && issues.length === 0,
    issues,
  };
}

// ============================================
// RED FLAGS (Auto-Reject)
// ============================================

export const RED_FLAGS = [
  { pattern: /trucker/i, message: "Uses 'trucker' - use 'driver', 'O/O', or 'The Tribe'" },
  { pattern: /truckers/i, message: "Uses 'truckers' - use 'drivers', 'O/Os', or 'The Tribe'" },
  { pattern: /might want to consider/i, message: "Wishy-washy language - be direct" },
  { pattern: /perhaps/i, message: "Wishy-washy language - be direct" },
  { pattern: /you might/i, message: "Wishy-washy language - be direct" },
  { pattern: /optimize|leverage|synergy/i, message: "Corporate speak - sound human" },
  { pattern: /gains|shredded|beast mode/i, message: "Gym bro language - not our voice" },
];

export function checkRedFlags(text: string): { passed: boolean; flags: string[] } {
  const flags: string[] = [];
  
  for (const flag of RED_FLAGS) {
    if (flag.pattern.test(text)) {
      flags.push(flag.message);
    }
  }
  
  return {
    passed: flags.length === 0,
    flags,
  };
}

// ============================================
// HELPERS
// ============================================

export function getRandomCta(objective: BusinessObjective, keyword?: string): string {
  const ctas = OBJECTIVE_CTAS[objective];
  const cta = ctas[Math.floor(Math.random() * ctas.length)];
  return keyword ? cta.replace("{KEYWORD}", keyword) : cta.replace("{KEYWORD}", "GUIDE");
}

export function getPillarHashtags(pillar: ContentPillar): string[] {
  const config = PILLAR_CONFIG[pillar];
  const baseHashtags = [...config.hashtags, "LetsTruck"];
  // Only add DriverHealth for health-related pillars
  if (config.category === "health") {
    baseHashtags.push("DriverHealth");
  }
  return baseHashtags;
}

export function suggestFormula(contentType: string): ContentFormula {
  const typeToFormula: Record<string, ContentFormula> = {
    stat: "data_bomb",
    quote: "tough_love",
    testimonial: "transformation",
    hot_take: "contrarian",
    tip: "protocol",
    educational: "myth_buster",
    story: "insider_secret",
  };
  return typeToFormula[contentType] || "data_bomb";
}




