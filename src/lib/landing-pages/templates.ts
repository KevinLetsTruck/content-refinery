/**
 * Landing Page Template Definitions
 */

export interface LandingPageTemplateConfig {
  id: string;
  name: string;
  description: string;
  bestFor: string;
  icon: "FileText" | "Rocket" | "Clock" | "ShoppingBag";
  iconBgColor: string;
  iconColor: string;
  defaultHeadline: string;
  defaultSubheadline: string;
  defaultCtaText: string;
  formFields: ("email" | "firstName" | "lastName" | "phone")[];
  features: string[];
}

export const LANDING_PAGE_TEMPLATES: Record<string, LandingPageTemplateConfig> = {
  lead_magnet: {
    id: "lead_magnet",
    name: "Lead Magnet Download",
    description: "Capture emails in exchange for a free PDF guide, checklist, or resource",
    bestFor: "Free guides, checklists, cheat sheets, and downloadable resources",
    icon: "FileText",
    iconBgColor: "bg-blue-500/20",
    iconColor: "text-blue-400",
    defaultHeadline: "Get Your Free Guide",
    defaultSubheadline: "Instant access to the strategies that are changing driver health",
    defaultCtaText: "Download Now",
    formFields: ["email", "firstName"],
    features: [
      "Instant PDF delivery",
      "Email capture form",
      "Benefits bullet list",
      "Trust indicators",
    ],
  },
  challenge: {
    id: "challenge",
    name: "Challenge Sign-up",
    description: "Multi-day challenge with daily emails and community support",
    bestFor: "7-day challenges, bootcamps, and structured programs",
    icon: "Rocket",
    iconBgColor: "bg-purple-500/20",
    iconColor: "text-purple-400",
    defaultHeadline: "Join the Free Challenge",
    defaultSubheadline: "Transform your health in just 7 days",
    defaultCtaText: "Join the Challenge",
    formFields: ["email", "firstName"],
    features: [
      "Day-by-day breakdown",
      "Urgency countdown",
      "Community aspect",
      "Daily email sequence",
    ],
  },
  waitlist: {
    id: "waitlist",
    name: "Waitlist / Coming Soon",
    description: "Build anticipation for an upcoming product or program launch",
    bestFor: "Product launches, new programs, limited-time offers",
    icon: "Clock",
    iconBgColor: "bg-amber-500/20",
    iconColor: "text-amber-400",
    defaultHeadline: "Be First to Know",
    defaultSubheadline: "Join the waitlist for exclusive early access",
    defaultCtaText: "Join the Waitlist",
    formFields: ["email"],
    features: [
      "Teaser content",
      "Early bird benefits",
      "Launch countdown",
      "Exclusivity messaging",
    ],
  },
  product_launch: {
    id: "product_launch",
    name: "Product Launch",
    description: "Full sales page with problem-solution structure and testimonials",
    bestFor: "Supplements, courses, coaching programs, physical products",
    icon: "ShoppingBag",
    iconBgColor: "bg-green-500/20",
    iconColor: "text-green-400",
    defaultHeadline: "Introducing Your New Solution",
    defaultSubheadline: "Finally, a product made for life on the road",
    defaultCtaText: "Get Started Now",
    formFields: ["email", "firstName", "phone"],
    features: [
      "Problem-agitation-solution",
      "Feature highlights",
      "Testimonials section",
      "Pricing & guarantee",
    ],
  },
};

export const TEMPLATE_ORDER = ["lead_magnet", "challenge", "waitlist", "product_launch"];

/**
 * Get AI recommendation based on lead magnet content
 */
export function getTemplateRecommendation(extractedData: {
  title?: string;
  summary?: string;
  keyMessages?: string[];
  chapters?: string[];
}): { templateId: string; reason: string } {
  const title = (extractedData.title || "").toLowerCase();
  const summary = (extractedData.summary || "").toLowerCase();
  const hasChapters = (extractedData.chapters?.length || 0) > 3;
  const hasMultipleMessages = (extractedData.keyMessages?.length || 0) > 5;

  // Check for challenge-related keywords
  if (
    title.includes("challenge") ||
    title.includes("day") ||
    summary.includes("challenge") ||
    summary.includes("reset")
  ) {
    return {
      templateId: "challenge",
      reason: "Your content mentions a challenge or multi-day program",
    };
  }

  // Check for product-related keywords
  if (
    title.includes("product") ||
    title.includes("supplement") ||
    summary.includes("buy") ||
    summary.includes("purchase")
  ) {
    return {
      templateId: "product_launch",
      reason: "Your content appears to be about a product or supplement",
    };
  }

  // Check for coming soon / waitlist keywords
  if (
    title.includes("coming soon") ||
    title.includes("waitlist") ||
    summary.includes("launching")
  ) {
    return {
      templateId: "waitlist",
      reason: "Your content suggests an upcoming launch",
    };
  }

  // Default to lead magnet for guides with substantial content
  if (hasChapters || hasMultipleMessages) {
    return {
      templateId: "lead_magnet",
      reason: "Your PDF guide has valuable content perfect for lead capture",
    };
  }

  // Default recommendation
  return {
    templateId: "lead_magnet",
    reason: "Lead magnet pages have the highest conversion rates for PDF guides",
  };
}
