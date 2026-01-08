/**
 * Funnel Storage
 * In-memory storage for funnels. Can migrate to database later.
 */

import { Funnel, FunnelStatus } from "./types";

// In-memory store for funnels
const funnels: Map<string, Funnel> = new Map();

/**
 * Generate a unique funnel ID
 */
function generateId(): string {
  return `funnel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new funnel
 */
export function createFunnel(data: Omit<Funnel, "id" | "createdAt" | "updatedAt">): Funnel {
  const id = generateId();
  const now = new Date().toISOString();

  const funnel: Funnel = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };

  funnels.set(id, funnel);
  return funnel;
}

/**
 * Get a funnel by ID
 */
export function getFunnel(id: string): Funnel | null {
  return funnels.get(id) || null;
}

/**
 * Update a funnel
 */
export function updateFunnel(id: string, updates: Partial<Funnel>): Funnel | null {
  const funnel = funnels.get(id);
  if (!funnel) {
    return null;
  }

  const updated: Funnel = {
    ...funnel,
    ...updates,
    id, // Ensure ID cannot be changed
    createdAt: funnel.createdAt, // Ensure createdAt cannot be changed
    updatedAt: new Date().toISOString(),
  };

  funnels.set(id, updated);
  return updated;
}

/**
 * List all funnels with optional filters
 */
export function listFunnels(options?: {
  status?: FunnelStatus;
  type?: string;
  limit?: number;
}): Funnel[] {
  let result = Array.from(funnels.values());

  // Apply filters
  if (options?.status) {
    result = result.filter((f) => f.status === options.status);
  }
  if (options?.type) {
    result = result.filter((f) => f.type === options.type);
  }

  // Sort by updatedAt descending
  result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  // Apply limit
  if (options?.limit) {
    result = result.slice(0, options.limit);
  }

  return result;
}

/**
 * Delete a funnel
 */
export function deleteFunnel(id: string): boolean {
  return funnels.delete(id);
}

/**
 * Update funnel status
 */
export function updateFunnelStatus(id: string, status: FunnelStatus): Funnel | null {
  return updateFunnel(id, { status });
}

/**
 * Get funnel statistics
 */
export function getFunnelStats(): {
  total: number;
  byStatus: Record<FunnelStatus, number>;
  byType: Record<string, number>;
} {
  const all = Array.from(funnels.values());

  const byStatus: Record<FunnelStatus, number> = {
    draft: 0,
    generating: 0,
    review: 0,
    active: 0,
    paused: 0,
    completed: 0,
  };

  const byType: Record<string, number> = {
    lead_magnet: 0,
    challenge: 0,
    product_launch: 0,
  };

  for (const funnel of all) {
    byStatus[funnel.status]++;
    byType[funnel.type]++;
  }

  return {
    total: all.length,
    byStatus,
    byType,
  };
}
