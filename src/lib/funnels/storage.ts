/**
 * Funnel Storage
 * In-memory storage for funnels (can migrate to database later)
 */

import { Funnel, FunnelStatus } from "./types";

// In-memory store for funnels
const funnels: Map<string, Funnel> = new Map();

/**
 * Create a new funnel
 */
export function createFunnel(data: Omit<Funnel, "createdAt" | "updatedAt">): Funnel {
  const now = new Date().toISOString();
  const funnel: Funnel = {
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  funnels.set(funnel.id, funnel);
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
export function updateFunnel(
  id: string,
  updates: Partial<Omit<Funnel, "id" | "createdAt">>
): Funnel | null {
  const funnel = funnels.get(id);
  if (!funnel) return null;

  const updated: Funnel = {
    ...funnel,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  funnels.set(id, updated);
  return updated;
}

/**
 * List all funnels
 */
export function listFunnels(): Funnel[] {
  return Array.from(funnels.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * List funnels by status
 */
export function listFunnelsByStatus(status: FunnelStatus): Funnel[] {
  return listFunnels().filter((f) => f.status === status);
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
  const funnel = funnels.get(id);
  if (!funnel) return null;

  const updates: Partial<Funnel> = { status };
  if (status === "active") {
    updates.launchedAt = new Date().toISOString();
  }

  return updateFunnel(id, updates);
}
