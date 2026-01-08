/**
 * Funnels Module
 * Central export for all funnel-related functionality
 */

// Types
export * from "./types";

// Storage
export {
  createFunnel,
  getFunnel,
  updateFunnel,
  listFunnels,
  deleteFunnel,
  updateFunnelStatus,
  getFunnelStats,
} from "./storage";

// Lead Magnet
export {
  uploadLeadMagnet,
  generateLeadMagnetWithGamma,
  validateLeadMagnetUrl,
} from "./lead-magnet";

// Builder
export {
  buildFunnel,
  generateEmailSequence,
  generateSocialPosts,
} from "./funnel-builder";
