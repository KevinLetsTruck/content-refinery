/**
 * Landing Page Types and Templates
 */

export type LandingPageTemplate = "lead_magnet" | "challenge" | "product_launch";

export interface LandingPageData {
  // Core
  slug: string;
  template: LandingPageTemplate;
  status: "draft" | "published";
  
  // Meta
  title: string;
  metaDescription?: string;
  ogImage?: string;
  
  // Content
  headline: string;
  subheadline?: string;
  heroImage?: string;
  
  // Benefits/Features
  benefits?: string[];
  features?: Array<{
    title: string;
    description: string;
    icon?: string;
  }>;
  
  // Social Proof
  testimonials?: Array<{
    quote: string;
    author: string;
    role?: string;
  }>;
  trustElements?: string[];
  
  // Lead Magnet Specific
  leadMagnet?: {
    title: string;
    description?: string;
    downloadUrl: string;
    coverImage?: string;
  };
  
  // CTA
  ctaText: string;
  ctaSubtext?: string;
  
  // Form
  formFields: Array<"email" | "firstName" | "lastName" | "phone">;
  constantContactListId?: string;
  
  // Thank You Page
  thankYou: {
    headline: string;
    message: string;
    ctas: Array<{
      text: string;
      url: string;
      style: "primary" | "secondary";
    }>;
  };
  
  // Tracking
  utmCampaign?: string;
  
  // Styling
  primaryColor?: string;
  accentColor?: string;
  darkMode?: boolean;
  
  // Analytics
  createdAt: string;
  updatedAt: string;
  views?: number;
  conversions?: number;
}

export interface LandingPageAnalytics {
  slug: string;
  date: string;
  views: number;
  uniqueVisitors: number;
  conversions: number;
  conversionRate: number;
  sources: Record<string, number>;
}
