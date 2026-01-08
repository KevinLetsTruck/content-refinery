/**
 * Funnel Builder Module
 * Central export for the funnel builder system
 */

// Types
export type {
  Funnel,
  FunnelType,
  FunnelStatus,
  FunnelEmail,
  FunnelPost,
  CreateFunnelInput,
} from "./types";

// Main orchestrator
export { createFunnel, slugify } from "./funnel-builder";

// Storage operations
export {
  createFunnel as saveFunnel,
  getFunnel,
  updateFunnel,
  listFunnels,
  listFunnelsByStatus,
  deleteFunnel,
  updateFunnelStatus,
} from "./storage";

// Individual generators (for direct use if needed)
export {
  uploadLeadMagnet,
  uploadLeadMagnetBuffer,
  generateLeadMagnetWithGamma,
} from "./lead-magnet";

export { generateEmailSequence } from "./email-generator";

export { generateSocialPosts } from "./social-generator";
