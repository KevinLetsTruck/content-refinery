/**
 * Centralized Configuration for Content Refinery
 *
 * This module provides:
 * - Type-safe access to environment variables
 * - Validation that required config is present
 * - Helper functions for common config patterns
 */

// ============================================
// TYPES
// ============================================

interface DatabaseConfig {
  url: string;
}

interface AnthropicConfig {
  apiKey: string;
}

interface DeepgramConfig {
  apiKey: string;
}

interface GammaConfig {
  apiKey: string;
  themeId: string;
}

interface TwitterConfig {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
}

interface MetaConfig {
  accessToken: string;
  facebookPageId?: string;
  instagramAccountId?: string;
}

interface LinkedInConfig {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
}

interface YouTubeConfig {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
}

interface ConstantContactConfig {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
}

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

interface ShopifyConfig {
  storeDomain: string;
  accessToken: string;
}

interface AppConfig {
  baseUrl: string;
  nodeEnv: string;
  isProduction: boolean;
  isDevelopment: boolean;
}

// ============================================
// CONFIG GETTERS
// ============================================

/**
 * Get the application base URL
 * Handles various deployment environments
 */
export function getBaseUrl(): string {
  // Explicit app URL takes priority
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Vercel deployment
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Render deployment
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL;
  }

  // Default to localhost in development
  return "http://localhost:3000";
}

/**
 * Get app configuration
 */
export function getAppConfig(): AppConfig {
  const nodeEnv = process.env.NODE_ENV || "development";
  return {
    baseUrl: getBaseUrl(),
    nodeEnv,
    isProduction: nodeEnv === "production",
    isDevelopment: nodeEnv === "development",
  };
}

/**
 * Get database configuration
 */
export function getDatabaseConfig(): DatabaseConfig | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return { url };
}

/**
 * Get Anthropic configuration
 */
export function getAnthropicConfig(): AnthropicConfig | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return { apiKey };
}

/**
 * Get Deepgram configuration
 */
export function getDeepgramConfig(): DeepgramConfig | null {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) return null;
  return { apiKey };
}

/**
 * Get Gamma configuration
 */
export function getGammaConfig(): GammaConfig | null {
  const apiKey = process.env.GAMMA_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    themeId: process.env.GAMMA_THEME_ID || "jg2glj9ae8ah4vv",
  };
}

/**
 * Get Twitter configuration
 */
export function getTwitterConfig(): TwitterConfig | null {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) return null;
  return { apiKey, apiSecret, accessToken, accessSecret };
}

/**
 * Get Meta (Facebook/Instagram) configuration
 */
export function getMetaConfig(): MetaConfig | null {
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!accessToken) return null;

  return {
    accessToken,
    facebookPageId: process.env.FACEBOOK_PAGE_ID,
    instagramAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
  };
}

/**
 * Get LinkedIn configuration
 */
export function getLinkedInConfig(): LinkedInConfig | null {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  return {
    clientId,
    clientSecret,
    accessToken: process.env.LINKEDIN_ACCESS_TOKEN,
  };
}

/**
 * Get YouTube configuration
 */
export function getYouTubeConfig(): YouTubeConfig | null {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  return {
    clientId,
    clientSecret,
    accessToken: process.env.YOUTUBE_ACCESS_TOKEN,
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN,
  };
}

/**
 * Get Constant Contact configuration
 */
export function getConstantContactConfig(): ConstantContactConfig | null {
  const clientId = process.env.CONSTANTCONTACT_CLIENT_ID;
  const clientSecret = process.env.CONSTANTCONTACT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  return {
    clientId,
    clientSecret,
    accessToken: process.env.CONSTANTCONTACT_ACCESS_TOKEN,
    refreshToken: process.env.CONSTANTCONTACT_REFRESH_TOKEN,
  };
}

/**
 * Get R2 (Cloudflare) storage configuration
 */
export function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
    return null;
  }

  return { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl };
}

/**
 * Get Shopify configuration
 */
export function getShopifyConfig(): ShopifyConfig | null {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!storeDomain || !accessToken) return null;

  return { storeDomain, accessToken };
}

// ============================================
// VALIDATION
// ============================================

interface ConfigStatus {
  service: string;
  configured: boolean;
  missing?: string[];
}

/**
 * Check which services are properly configured
 */
export function getConfigStatus(): ConfigStatus[] {
  return [
    {
      service: "Database",
      configured: !!getDatabaseConfig(),
      missing: !process.env.DATABASE_URL ? ["DATABASE_URL"] : undefined,
    },
    {
      service: "Anthropic (AI)",
      configured: !!getAnthropicConfig(),
      missing: !process.env.ANTHROPIC_API_KEY ? ["ANTHROPIC_API_KEY"] : undefined,
    },
    {
      service: "Deepgram (Transcription)",
      configured: !!getDeepgramConfig(),
      missing: !process.env.DEEPGRAM_API_KEY ? ["DEEPGRAM_API_KEY"] : undefined,
    },
    {
      service: "Gamma (Visuals)",
      configured: !!getGammaConfig(),
      missing: !process.env.GAMMA_API_KEY ? ["GAMMA_API_KEY"] : undefined,
    },
    {
      service: "Twitter",
      configured: !!getTwitterConfig(),
      missing: getMissingEnvVars([
        "TWITTER_API_KEY",
        "TWITTER_API_SECRET",
        "TWITTER_ACCESS_TOKEN",
        "TWITTER_ACCESS_SECRET",
      ]),
    },
    {
      service: "Meta (Facebook/Instagram)",
      configured: !!getMetaConfig(),
      missing: !process.env.META_ACCESS_TOKEN ? ["META_ACCESS_TOKEN"] : undefined,
    },
    {
      service: "LinkedIn",
      configured: !!getLinkedInConfig(),
      missing: getMissingEnvVars(["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"]),
    },
    {
      service: "YouTube",
      configured: !!getYouTubeConfig(),
      missing: getMissingEnvVars(["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET"]),
    },
    {
      service: "Constant Contact",
      configured: !!getConstantContactConfig(),
      missing: getMissingEnvVars(["CONSTANTCONTACT_CLIENT_ID", "CONSTANTCONTACT_CLIENT_SECRET"]),
    },
    {
      service: "R2 Storage",
      configured: !!getR2Config(),
      missing: getMissingEnvVars([
        "R2_ACCOUNT_ID",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_BUCKET_NAME",
        "R2_PUBLIC_URL",
      ]),
    },
    {
      service: "Shopify",
      configured: !!getShopifyConfig(),
      missing: getMissingEnvVars(["SHOPIFY_STORE_DOMAIN", "SHOPIFY_ACCESS_TOKEN"]),
    },
  ];
}

/**
 * Helper to get missing env vars from a list
 */
function getMissingEnvVars(vars: string[]): string[] | undefined {
  const missing = vars.filter((v) => !process.env[v]);
  return missing.length > 0 ? missing : undefined;
}

/**
 * Validate that required services are configured
 * Call this at startup to fail fast
 */
export function validateRequiredConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Database is always required
  if (!getDatabaseConfig()) {
    errors.push("DATABASE_URL is required");
  }

  // AI is required for core functionality
  if (!getAnthropicConfig()) {
    errors.push("ANTHROPIC_API_KEY is required for AI features");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// URL VALIDATION
// ============================================

/**
 * Validate that a string is a valid URL
 */
export function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure a URL has a protocol
 */
export function ensureProtocol(url: string, defaultProtocol: string = "https"): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `${defaultProtocol}://${url}`;
}
