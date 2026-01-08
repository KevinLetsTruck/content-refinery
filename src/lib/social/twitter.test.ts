/**
 * Tests for Twitter API client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

// We need to test the exported functions, but they rely on environment variables
// and make HTTP requests. We'll test with mocked fetch.

describe("Twitter Client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules to pick up new env vars
    vi.resetModules();

    // Set up test environment variables
    process.env = {
      ...originalEnv,
      TWITTER_API_KEY: "test-api-key",
      TWITTER_API_SECRET: "test-api-secret",
      TWITTER_ACCESS_TOKEN: "test-access-token",
      TWITTER_ACCESS_SECRET: "test-access-secret",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("isConfigured", () => {
    it("returns true when all credentials are set", async () => {
      const { isConfigured } = await import("./twitter");
      expect(isConfigured()).toBe(true);
    });

    it("returns false when API key is missing", async () => {
      delete process.env.TWITTER_API_KEY;
      vi.resetModules();
      const { isConfigured } = await import("./twitter");
      expect(isConfigured()).toBe(false);
    });

    it("returns false when API secret is missing", async () => {
      delete process.env.TWITTER_API_SECRET;
      vi.resetModules();
      const { isConfigured } = await import("./twitter");
      expect(isConfigured()).toBe(false);
    });

    it("returns false when access token is missing", async () => {
      delete process.env.TWITTER_ACCESS_TOKEN;
      vi.resetModules();
      const { isConfigured } = await import("./twitter");
      expect(isConfigured()).toBe(false);
    });

    it("returns false when access secret is missing", async () => {
      delete process.env.TWITTER_ACCESS_SECRET;
      vi.resetModules();
      const { isConfigured } = await import("./twitter");
      expect(isConfigured()).toBe(false);
    });
  });

  describe("postTweet", () => {
    it("posts a tweet successfully", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            id: "1234567890123456789",
            text: "Test tweet content",
          },
        }),
      });
      global.fetch = mockFetch;

      const { postTweet } = await import("./twitter");
      const result = await postTweet({ text: "Test tweet content" });

      expect(result).toEqual({
        id: "1234567890123456789",
        text: "Test tweet content",
        url: "https://x.com/lets_truck/status/1234567890123456789",
      });

      // Verify fetch was called with correct URL
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.twitter.com/2/tweets",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("includes reply_to when replyToId is provided", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: { id: "123", text: "Reply" },
        }),
      });
      global.fetch = mockFetch;

      const { postTweet } = await import("./twitter");
      await postTweet({ text: "Reply tweet", replyToId: "original-tweet-id" });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.reply).toEqual({ in_reply_to_tweet_id: "original-tweet-id" });
    });

    it("includes media_ids when provided", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: { id: "123", text: "With media" },
        }),
      });
      global.fetch = mockFetch;

      const { postTweet } = await import("./twitter");
      await postTweet({ text: "With media", mediaIds: ["media-1", "media-2"] });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.media).toEqual({ media_ids: ["media-1", "media-2"] });
    });

    it("throws error on API failure", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({
          errors: [{ code: 187, message: "Status is a duplicate" }],
        }),
      });
      global.fetch = mockFetch;

      const { postTweet } = await import("./twitter");

      await expect(postTweet({ text: "Duplicate tweet" }))
        .rejects.toThrow("Twitter API error");
    });

    it("includes OAuth signature in Authorization header", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: { id: "123", text: "Test" },
        }),
      });
      global.fetch = mockFetch;

      const { postTweet } = await import("./twitter");
      await postTweet({ text: "Test" });

      const authHeader = mockFetch.mock.calls[0][1].headers.Authorization;
      expect(authHeader).toMatch(/^OAuth /);
      expect(authHeader).toContain("oauth_consumer_key");
      expect(authHeader).toContain("oauth_signature");
      expect(authHeader).toContain("oauth_timestamp");
      expect(authHeader).toContain("oauth_nonce");
      expect(authHeader).toContain("oauth_signature_method");
      expect(authHeader).toContain("oauth_version");
    });
  });

  describe("postThread", () => {
    it("posts multiple tweets in sequence", async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: { id: `tweet-${callCount}`, text: `Tweet ${callCount}` },
          }),
        });
      });
      global.fetch = mockFetch;

      const { postThread } = await import("./twitter");
      const tweets = ["First tweet", "Second tweet", "Third tweet"];
      const results = await postThread(tweets);

      expect(results).toHaveLength(3);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("chains tweets as replies", async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: { id: `tweet-${callCount}`, text: `Tweet ${callCount}` },
          }),
        });
      });
      global.fetch = mockFetch;

      const { postThread } = await import("./twitter");
      await postThread(["First", "Second"]);

      // First tweet should not have reply
      const firstCall = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(firstCall.reply).toBeUndefined();

      // Second tweet should reply to first
      const secondCall = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(secondCall.reply).toEqual({ in_reply_to_tweet_id: "tweet-1" });
    });
  });

  describe("deleteTweet", () => {
    it("deletes a tweet successfully", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { deleted: true } }),
      });
      global.fetch = mockFetch;

      const { deleteTweet } = await import("./twitter");
      const result = await deleteTweet("tweet-to-delete");

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.twitter.com/2/tweets/tweet-to-delete",
        expect.objectContaining({ method: "DELETE" })
      );
    });

    it("returns false on delete failure", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ errors: [{ message: "Not found" }] }),
      });
      global.fetch = mockFetch;

      const { deleteTweet } = await import("./twitter");
      const result = await deleteTweet("nonexistent-tweet");

      expect(result).toBe(false);
    });
  });

  describe("getMe", () => {
    it("returns authenticated user info", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            id: "123456789",
            name: "Let's Truck",
            username: "lets_truck",
          },
        }),
      });
      global.fetch = mockFetch;

      const { getMe } = await import("./twitter");
      const result = await getMe();

      expect(result).toEqual({
        id: "123456789",
        name: "Let's Truck",
        username: "lets_truck",
      });
    });

    it("throws error on failure", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ errors: [{ message: "Unauthorized" }] }),
      });
      global.fetch = mockFetch;

      const { getMe } = await import("./twitter");

      await expect(getMe()).rejects.toThrow("Twitter API error");
    });
  });

  describe("uploadMedia", () => {
    it("uploads image and returns media ID", async () => {
      // Mock image download
      const mockImageBuffer = new ArrayBuffer(100);
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(mockImageBuffer),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ media_id_string: "media-123456" }),
        });
      global.fetch = mockFetch;

      const { uploadMedia } = await import("./twitter");
      const result = await uploadMedia("https://example.com/image.png");

      expect(result).toBe("media-123456");
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // First call: download image
      expect(mockFetch.mock.calls[0][0]).toBe("https://example.com/image.png");

      // Second call: upload to Twitter
      expect(mockFetch.mock.calls[1][0]).toBe("https://upload.twitter.com/1.1/media/upload.json");
    });

    it("throws error if image download fails", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Not Found",
      });
      global.fetch = mockFetch;

      const { uploadMedia } = await import("./twitter");

      await expect(uploadMedia("https://example.com/missing.png"))
        .rejects.toThrow("Failed to download image");
    });

    it("throws error if upload fails", async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ errors: [{ message: "Upload failed" }] }),
        });
      global.fetch = mockFetch;

      const { uploadMedia } = await import("./twitter");

      await expect(uploadMedia("https://example.com/image.png"))
        .rejects.toThrow("Twitter media upload error");
    });
  });
});

describe("OAuth Signature Generation", () => {
  // Test the signature generation logic by verifying the format
  // Note: Actual signature validation would require knowing the exact inputs

  it("generates properly formatted OAuth header", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: "123", text: "Test" } }),
    });
    global.fetch = mockFetch;

    const { postTweet } = await import("./twitter");
    await postTweet({ text: "Test" });

    const authHeader = mockFetch.mock.calls[0][1].headers.Authorization;

    // Verify OAuth header format
    expect(authHeader).toMatch(/^OAuth /);

    // Parse OAuth params
    const oauthString = authHeader.replace("OAuth ", "");
    const params = oauthString.split(", ").reduce((acc: Record<string, string>, param: string) => {
      const [key, value] = param.split("=");
      acc[key] = value.replace(/"/g, "");
      return acc;
    }, {});

    // Verify required OAuth 1.0a parameters - check from test setup env vars
    expect(params.oauth_consumer_key).toMatch(/test.*api.*key/i);
    expect(params.oauth_token).toMatch(/test.*access.*token/i);
    expect(params.oauth_signature_method).toBe("HMAC-SHA1");
    expect(params.oauth_version).toBe("1.0");
    expect(params.oauth_timestamp).toMatch(/^\d+$/);
    expect(params.oauth_nonce).toMatch(/^[a-f0-9]+$/);
    expect(params.oauth_signature).toBeDefined();
  });
});
