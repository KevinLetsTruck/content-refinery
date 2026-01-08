/**
 * Tests for the Gamma API routes
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Gamma library
vi.mock("@/lib/gamma", () => ({
  generateLeadMagnet: vi.fn(),
  generateLandingPage: vi.fn(),
  isConfigured: vi.fn(),
}));

describe("POST /api/gamma/generate", () => {
  let mockGamma: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGamma = await import("@/lib/gamma");
  });

  const createRequest = (body: unknown) => {
    return new NextRequest("http://localhost:3000/api/gamma/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  describe("Configuration Check", () => {
    it("returns 500 when Gamma is not configured", async () => {
      mockGamma.isConfigured.mockReturnValue(false);

      const { POST } = await import("@/app/api/gamma/generate/route");
      const request = createRequest({ type: "leadMagnet", title: "Test" });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain("not configured");
    });
  });

  describe("Lead Magnet Generation", () => {
    beforeEach(() => {
      mockGamma.isConfigured.mockReturnValue(true);
    });

    it("generates lead magnet successfully", async () => {
      mockGamma.generateLeadMagnet.mockResolvedValue({
        id: "gamma-123",
        url: "https://gamma.app/doc/123",
        pdfUrl: "https://gamma.app/doc/123.pdf",
      });

      const { POST } = await import("@/app/api/gamma/generate/route");
      const request = createRequest({
        type: "leadMagnet",
        title: "Driver Gut Health Guide",
        sections: ["Introduction", "Problem", "Solution"],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.id).toBe("gamma-123");
      expect(data.url).toContain("gamma.app");
    });

    it("passes options to generateLeadMagnet", async () => {
      mockGamma.generateLeadMagnet.mockResolvedValue({
        id: "gamma-123",
        url: "https://gamma.app/doc/123",
      });

      const { POST } = await import("@/app/api/gamma/generate/route");
      const options = {
        type: "leadMagnet",
        title: "Test Guide",
        description: "A test description",
        sections: ["Section 1", "Section 2"],
      };
      await POST(createRequest(options));

      expect(mockGamma.generateLeadMagnet).toHaveBeenCalledWith({
        title: "Test Guide",
        description: "A test description",
        sections: ["Section 1", "Section 2"],
      });
    });
  });

  describe("Landing Page Generation", () => {
    beforeEach(() => {
      mockGamma.isConfigured.mockReturnValue(true);
    });

    it("generates landing page successfully", async () => {
      mockGamma.generateLandingPage.mockResolvedValue({
        id: "gamma-456",
        url: "https://gamma.app/page/456",
      });

      const { POST } = await import("@/app/api/gamma/generate/route");
      const request = createRequest({
        type: "landingPage",
        title: "Free Gut Health Workshop",
        cta: "Sign Up Now",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.id).toBe("gamma-456");
    });

    it("passes options to generateLandingPage", async () => {
      mockGamma.generateLandingPage.mockResolvedValue({
        id: "gamma-456",
        url: "https://gamma.app/page/456",
      });

      const { POST } = await import("@/app/api/gamma/generate/route");
      const options = {
        type: "landingPage",
        title: "Workshop Page",
        headline: "Transform Your Health",
        cta: "Register Now",
      };
      await POST(createRequest(options));

      expect(mockGamma.generateLandingPage).toHaveBeenCalledWith({
        title: "Workshop Page",
        headline: "Transform Your Health",
        cta: "Register Now",
      });
    });
  });

  describe("Validation", () => {
    beforeEach(() => {
      mockGamma.isConfigured.mockReturnValue(true);
    });

    it("returns 400 for invalid type", async () => {
      const { POST } = await import("@/app/api/gamma/generate/route");
      const request = createRequest({
        type: "invalidType",
        title: "Test",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid type");
      expect(data.error).toContain("leadMagnet");
      expect(data.error).toContain("landingPage");
    });

    it("returns 400 when type is missing", async () => {
      const { POST } = await import("@/app/api/gamma/generate/route");
      const request = createRequest({ title: "No Type" });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid type");
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      mockGamma.isConfigured.mockReturnValue(true);
    });

    it("handles generation errors gracefully", async () => {
      mockGamma.generateLeadMagnet.mockRejectedValue(
        new Error("Gamma API rate limit exceeded")
      );

      const { POST } = await import("@/app/api/gamma/generate/route");
      const request = createRequest({
        type: "leadMagnet",
        title: "Test",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain("rate limit");
    });

    it("handles non-Error exceptions", async () => {
      mockGamma.generateLeadMagnet.mockRejectedValue("Unknown error");

      const { POST } = await import("@/app/api/gamma/generate/route");
      const request = createRequest({
        type: "leadMagnet",
        title: "Test",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Generation failed");
    });
  });
});

describe("GET /api/gamma/generate", () => {
  let mockGamma: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGamma = await import("@/lib/gamma");
  });

  it("returns configured status when Gamma is set up", async () => {
    mockGamma.isConfigured.mockReturnValue(true);

    const { GET } = await import("@/app/api/gamma/generate/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.configured).toBe(true);
  });

  it("returns not configured when Gamma is not set up", async () => {
    mockGamma.isConfigured.mockReturnValue(false);

    const { GET } = await import("@/app/api/gamma/generate/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.configured).toBe(false);
  });
});
