import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getConfigStatus, getAppConfig, validateRequiredConfig } from "@/lib/config";

/**
 * GET /api/health
 *
 * Health check endpoint that validates:
 * - Database connectivity
 * - Required configuration
 * - Service status for all integrations
 */
export async function GET() {
  const startTime = Date.now();

  // Check database connectivity
  let dbStatus: { connected: boolean; error?: string } = { connected: false };
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = { connected: true };
  } catch (error) {
    dbStatus = {
      connected: false,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }

  // Validate required configuration
  const configValidation = validateRequiredConfig();

  // Get status of all services
  const services = getConfigStatus();

  // Get app configuration
  const appConfig = getAppConfig();

  // Calculate response time
  const responseTime = Date.now() - startTime;

  // Determine overall health
  const isHealthy = dbStatus.connected && configValidation.valid;

  const response = {
    status: isHealthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    responseTimeMs: responseTime,
    environment: appConfig.nodeEnv,
    version: process.env.npm_package_version || "unknown",
    checks: {
      database: dbStatus,
      configuration: {
        valid: configValidation.valid,
        errors: configValidation.errors.length > 0 ? configValidation.errors : undefined,
      },
    },
    services: services.map((s) => ({
      name: s.service,
      configured: s.configured,
      missing: s.missing,
    })),
  };

  return NextResponse.json(response, {
    status: isHealthy ? 200 : 503,
  });
}

/**
 * HEAD /api/health
 *
 * Simple health check for load balancers
 * Returns 200 if healthy, 503 if not
 */
export async function HEAD() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
