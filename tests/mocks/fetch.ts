/**
 * Mock fetch for testing HTTP requests
 */

import { vi } from "vitest";

interface MockFetchResponse {
  ok: boolean;
  status: number;
  statusText?: string;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

export const createMockFetchResponse = (
  data: unknown,
  options: { ok?: boolean; status?: number; statusText?: string } = {}
): MockFetchResponse => ({
  ok: options.ok ?? true,
  status: options.status ?? 200,
  statusText: options.statusText ?? "OK",
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(typeof data === "string" ? data : JSON.stringify(data)),
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
});

// Twitter API mock responses
export const twitterMockResponses = {
  postTweet: createMockFetchResponse({
    data: {
      id: "1234567890123456789",
      text: "Test tweet content",
    },
  }),

  deleteTweet: createMockFetchResponse({
    data: { deleted: true },
  }),

  getMe: createMockFetchResponse({
    data: {
      id: "123456789",
      name: "Let's Truck",
      username: "lets_truck",
    },
  }),

  uploadMedia: createMockFetchResponse({
    media_id_string: "9876543210987654321",
  }),

  rateLimitError: createMockFetchResponse(
    { errors: [{ code: 88, message: "Rate limit exceeded" }] },
    { ok: false, status: 429, statusText: "Too Many Requests" }
  ),

  unauthorized: createMockFetchResponse(
    { errors: [{ code: 32, message: "Could not authenticate you" }] },
    { ok: false, status: 401, statusText: "Unauthorized" }
  ),
};

// Gamma API mock responses
export const gammaMockResponses = {
  generateSuccess: createMockFetchResponse({
    id: "gamma-gen-123",
    status: "completed",
    imageUrl: "https://gamma.app/image/123.png",
  }),

  generatePending: createMockFetchResponse({
    id: "gamma-gen-123",
    status: "pending",
  }),

  generateError: createMockFetchResponse(
    { error: "Generation failed" },
    { ok: false, status: 500 }
  ),
};

// Deepgram API mock responses
export const deepgramMockResponses = {
  transcribeSuccess: createMockFetchResponse({
    results: {
      channels: [
        {
          alternatives: [
            {
              transcript: "This is a test transcription from the audio file.",
              words: [
                { word: "This", start: 0.0, end: 0.2, confidence: 0.99 },
                { word: "is", start: 0.2, end: 0.3, confidence: 0.99 },
                { word: "a", start: 0.3, end: 0.4, confidence: 0.99 },
                { word: "test", start: 0.4, end: 0.6, confidence: 0.99 },
              ],
            },
          ],
        },
      ],
    },
  }),
};

// Setup global fetch mock
export const setupFetchMock = (mockImpl?: typeof fetch) => {
  const mockFetch = mockImpl ?? vi.fn();
  global.fetch = mockFetch as typeof fetch;
  return mockFetch;
};

// Helper to create a sequence of responses
export const createFetchSequence = (responses: MockFetchResponse[]) => {
  let callIndex = 0;
  return vi.fn().mockImplementation(() => {
    const response = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;
    return Promise.resolve(response);
  });
};
