/**
 * Mock Prisma client for testing
 * Use this to mock database operations without hitting a real database
 */

import { vi } from "vitest";

// Mock data factories
export const createMockSourceApp = (overrides = {}) => ({
  id: "test-source-app-id",
  name: "audioroad",
  displayName: "AudioRoad",
  apiKey: "cr_test_api_key_12345",
  voiceProfile: "kevin-health",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockSource = (overrides = {}) => ({
  id: "test-source-id",
  sourceAppId: "test-source-app-id",
  title: "Test Episode",
  sourceType: "audio",
  contentType: "episode",
  fileUrl: "https://example.com/audio.mp3",
  status: "pending",
  needsTranscription: true,
  needsExtraction: true,
  rawData: {},
  metadata: {},
  errorMessage: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockTranscript = (overrides = {}) => ({
  id: "test-transcript-id",
  sourceId: "test-source-id",
  fullText: "This is a test transcript with some content.",
  speakers: null,
  timestamps: null,
  createdAt: new Date(),
  ...overrides,
});

export const createMockExtraction = (overrides = {}) => ({
  id: "test-extraction-id",
  sourceId: "test-source-id",
  type: "quote",
  text: "This is a test quote extraction.",
  startTime: 0,
  endTime: 30,
  confidence: 0.9,
  productMentions: [],
  metadata: {},
  createdAt: new Date(),
  ...overrides,
});

export const createMockGeneratedContent = (overrides = {}) => ({
  id: "test-content-id",
  extractionId: "test-extraction-id",
  platform: "twitter",
  text: "Test tweet content",
  hashtags: ["LetsTruck", "DriverHealth"],
  mediaGuidance: null,
  status: "pending_review",
  publishedAt: null,
  publishedUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Create mock Prisma client
export const createMockPrismaClient = () => ({
  sourceApp: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  source: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  transcript: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  extraction: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  generatedContent: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $transaction: vi.fn((fn) => fn(createMockPrismaClient())),
});

// Default mock instance
export const mockPrisma = createMockPrismaClient();
