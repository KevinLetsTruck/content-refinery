/**
 * Test setup file for Vitest
 * This runs before all tests
 */

import { vi, afterEach, afterAll } from "vitest";

// Mock environment variables for tests
// Note: NODE_ENV is read-only in some TypeScript configurations, so we skip setting it
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test_db";
process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
process.env.TWITTER_API_KEY = "test-twitter-api-key";
process.env.TWITTER_API_SECRET = "test-twitter-api-secret";
process.env.TWITTER_ACCESS_TOKEN = "test-twitter-access-token";
process.env.TWITTER_ACCESS_SECRET = "test-twitter-access-secret";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

// Mock console methods to reduce noise in tests (optional - can be removed for debugging)
// vi.spyOn(console, "log").mockImplementation(() => {});
// vi.spyOn(console, "error").mockImplementation(() => {});

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Cleanup after all tests
afterAll(() => {
  vi.restoreAllMocks();
});
