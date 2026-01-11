"use client";

import { useState } from "react";

interface CompareResult {
  text: string;
  platform: string;
  nanoBanana?: { imageDataUrl: string; durationMs: number; prompt: string };
  dalle?: { imageDataUrl: string; durationMs: number; prompt: string };
  errors: string[];
}

const TEST_PROMPTS = [
  {
    text: "70% of professional drivers have Candida overgrowth compared to only 13% of the general population",
    contentType: "stat",
    label: "Gut Health Stat",
  },
  {
    text: "Your truck deserves premium fuel. So does your body.",
    contentType: "quote",
    label: "Fuel Quote",
  },
  {
    text: "Sleep deprivation is killing drivers. The average trucker gets only 4.78 hours of sleep per night.",
    contentType: "stat",
    label: "Sleep Stat",
  },
  {
    text: "Real steak, real eggs, real results. This is how I fuel my morning.",
    contentType: "educational",
    label: "Food/Nutrition",
  },
];

const PLATFORMS = [
  { value: "instagram_feed", label: "Instagram Feed (1:1)" },
  { value: "twitter", label: "Twitter (16:9)" },
  { value: "instagram_story", label: "IG Story (9:16)" },
];

export default function CompareImagesPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CompareResult[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState(0);
  const [selectedPlatform, setSelectedPlatform] = useState("instagram_feed");
  const [customText, setCustomText] = useState("");

  const generateComparison = async () => {
    setLoading(true);
    try {
      const prompt = customText || TEST_PROMPTS[selectedPrompt];
      const response = await fetch("/api/images/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: typeof prompt === "string" ? prompt : prompt.text,
          contentType: typeof prompt === "string" ? "educational" : prompt.contentType,
          platform: selectedPlatform,
        }),
      });
      const data = await response.json();
      setResults((prev) => [data, ...prev]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Image Generator Comparison</h1>
        <p className="text-gray-400 mb-8">Nano Banana (Gemini) vs DALL-E 3</p>

        {/* Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Preset Prompt</label>
              <select
                value={selectedPrompt}
                onChange={(e) => {
                  setSelectedPrompt(Number(e.target.value));
                  setCustomText("");
                }}
                className="w-full bg-gray-700 rounded px-3 py-2"
              >
                {TEST_PROMPTS.map((p, i) => (
                  <option key={i} value={i}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Platform</label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="w-full bg-gray-700 rounded px-3 py-2"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={generateComparison}
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 rounded px-4 py-2 font-medium"
              >
                {loading ? "Generating..." : "Generate Comparison"}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Or Custom Text
            </label>
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Enter custom text to generate..."
              className="w-full bg-gray-700 rounded px-3 py-2"
            />
          </div>
        </div>

        {/* Results */}
        {results.map((result, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="mb-4">
              <p className="text-sm text-gray-400">Prompt:</p>
              <p className="text-lg">&quot;{result.text}&quot;</p>
              <p className="text-sm text-gray-500 mt-1">Platform: {result.platform}</p>
            </div>

            {result.errors.length > 0 && (
              <div className="bg-red-900/30 border border-red-500 rounded p-3 mb-4">
                {result.errors.map((err, j) => (
                  <p key={j} className="text-red-300 text-sm">{err}</p>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nano Banana */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-semibold text-green-400">
                    🍌 Nano Banana (Gemini)
                  </h3>
                  {result.nanoBanana && (
                    <span className="text-sm text-gray-400">
                      {(result.nanoBanana.durationMs / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
                {result.nanoBanana ? (
                  <img
                    src={result.nanoBanana.imageDataUrl}
                    alt="Nano Banana generated"
                    className="w-full rounded-lg"
                  />
                ) : (
                  <div className="bg-gray-700 rounded-lg h-64 flex items-center justify-center">
                    <p className="text-gray-400">Not available</p>
                  </div>
                )}
              </div>

              {/* DALL-E */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-semibold text-blue-400">
                    🎨 DALL-E 3 (OpenAI)
                  </h3>
                  {result.dalle && (
                    <span className="text-sm text-gray-400">
                      {(result.dalle.durationMs / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
                {result.dalle ? (
                  <img
                    src={result.dalle.imageDataUrl}
                    alt="DALL-E generated"
                    className="w-full rounded-lg"
                  />
                ) : (
                  <div className="bg-gray-700 rounded-lg h-64 flex items-center justify-center">
                    <p className="text-gray-400">Not available (needs OPENAI_API_KEY)</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {results.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-xl mb-2">No comparisons yet</p>
            <p>Click &quot;Generate Comparison&quot; to create side-by-side images</p>
          </div>
        )}
      </div>
    </div>
  );
}
