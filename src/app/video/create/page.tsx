"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type VideoType = "short" | "standard" | "promo" | "podcast_clip";
type Tone = "educational" | "promotional" | "entertaining" | "inspirational";

const VIDEO_TYPES = [
  {
    id: "short" as VideoType,
    name: "YouTube Short / Reel",
    duration: "15-60 sec",
    icon: "📱",
    description: "Quick tips, hooks, viral clips for Shorts/Reels/TikTok",
  },
  {
    id: "standard" as VideoType,
    name: "Standard Video",
    duration: "5-15 min",
    icon: "🎬",
    description: "Educational content, tutorials, deep dives",
  },
  {
    id: "promo" as VideoType,
    name: "Promotional",
    duration: "15-60 sec",
    icon: "📢",
    description: "Campaign promotions, product launches, ads",
  },
  {
    id: "podcast_clip" as VideoType,
    name: "Podcast Clip",
    duration: "1-3 min",
    icon: "🎙️",
    description: "Repurposed highlights from podcast episodes",
  },
];

const TONES = [
  { id: "educational" as Tone, name: "Educational", emoji: "📚" },
  { id: "promotional" as Tone, name: "Promotional", emoji: "🚀" },
  { id: "entertaining" as Tone, name: "Entertaining", emoji: "🎉" },
  { id: "inspirational" as Tone, name: "Inspirational", emoji: "✨" },
];

const TOPIC_SUGGESTIONS = [
  "Blood sugar management tips for long-haul drivers",
  "How to start your own trucking business",
  "NDK meal prep for the road",
  "Maximizing fuel efficiency as an owner-operator",
  "Sleep strategies for drivers",
  "Tax deductions every owner-operator should know",
  "The truth about truck stop food",
  "Building multiple income streams from your truck",
];

export default function CreateVideoPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [videoType, setVideoType] = useState<VideoType | null>(null);
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<Tone>("educational");
  const [sourceContent, setSourceContent] = useState("");
  const [autoStart, setAutoStart] = useState(true);

  const canProceed = () => {
    switch (step) {
      case 1:
        return videoType !== null;
      case 2:
        return topic.trim().length >= 10;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleCreate = async () => {
    if (!videoType || !topic.trim()) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: videoType,
          topic: topic.trim(),
          tone,
          sourceContent: sourceContent.trim() || undefined,
          autoStart,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create video");
      }

      const data = await response.json();
      router.push(`/video/${data.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-6 pt-12 pb-6">
        <button
          onClick={() => router.push("/video")}
          className="text-white/70 hover:text-white mb-6 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Videos
        </button>

        <h1 className="text-4xl font-bold text-white mb-2">Create AI Video</h1>
        <p className="text-purple-200">
          Let AI generate a complete video with script, voiceover, and visuals
        </p>
      </div>

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto px-6 mb-8">
        <div className="flex items-center gap-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step >= s
                    ? "bg-white text-indigo-900"
                    : "bg-white/20 text-white/50"
                }`}
              >
                {step > s ? "✓" : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-20 h-1 mx-2 ${
                    step > s ? "bg-white" : "bg-white/20"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-2 text-sm">
          <span className={step >= 1 ? "text-white" : "text-white/50"}>Video Type</span>
          <span className="w-24" />
          <span className={step >= 2 ? "text-white" : "text-white/50"}>Topic</span>
          <span className="w-24" />
          <span className={step >= 3 ? "text-white" : "text-white/50"}>Settings</span>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-6 pb-12">
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          {/* Step 1: Video Type */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                What type of video do you want to create?
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {VIDEO_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setVideoType(type.id)}
                    className={`p-6 rounded-xl border-2 text-left transition-all ${
                      videoType === type.id
                        ? "border-indigo-600 bg-indigo-50"
                        : "border-gray-200 hover:border-indigo-300"
                    }`}
                  >
                    <div className="text-3xl mb-2">{type.icon}</div>
                    <div className="font-semibold text-gray-900">{type.name}</div>
                    <div className="text-sm text-indigo-600 font-medium mb-1">
                      {type.duration}
                    </div>
                    <div className="text-sm text-gray-500">{type.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Topic */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                What&apos;s your video about?
              </h2>
              <p className="text-gray-500 mb-6">
                Describe your video topic in detail. The more specific, the better the result.
              </p>

              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., 5 blood sugar management tips for truck drivers who spend long hours behind the wheel..."
                className="w-full h-32 p-4 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <div className="text-sm text-gray-400 mt-1">
                {topic.length} characters (minimum 10)
              </div>

              {/* Suggestions */}
              <div className="mt-6">
                <div className="text-sm font-medium text-gray-700 mb-3">
                  Or try one of these ideas:
                </div>
                <div className="flex flex-wrap gap-2">
                  {TOPIC_SUGGESTIONS.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setTopic(suggestion)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-indigo-100 hover:text-indigo-700 rounded-full text-sm text-gray-600 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Settings */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Final Settings
              </h2>

              {/* Tone */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Video Tone
                </label>
                <div className="flex gap-3">
                  {TONES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTone(t.id)}
                      className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                        tone === t.id
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-gray-200 hover:border-indigo-300"
                      }`}
                    >
                      <span className="mr-1">{t.emoji}</span> {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Source Content */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source Content (Optional)
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Paste a blog post, podcast transcript, or other content to adapt into video
                </p>
                <textarea
                  value={sourceContent}
                  onChange={(e) => setSourceContent(e.target.value)}
                  placeholder="Paste content here to adapt..."
                  className="w-full h-32 p-4 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Auto Start */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  id="autoStart"
                  checked={autoStart}
                  onChange={(e) => setAutoStart(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 rounded"
                />
                <label htmlFor="autoStart" className="flex-1">
                  <div className="font-medium text-gray-900">
                    Start production automatically
                  </div>
                  <div className="text-sm text-gray-500">
                    Begin generating script, audio, and video immediately
                  </div>
                </label>
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-indigo-50 rounded-xl">
                <div className="font-medium text-indigo-900 mb-2">Summary</div>
                <div className="text-sm text-indigo-700 space-y-1">
                  <div>
                    <strong>Type:</strong> {VIDEO_TYPES.find((t) => t.id === videoType)?.name}
                  </div>
                  <div>
                    <strong>Topic:</strong> {topic.substring(0, 100)}
                    {topic.length > 100 ? "..." : ""}
                  </div>
                  <div>
                    <strong>Tone:</strong> {TONES.find((t) => t.id === tone)?.name}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <button
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="px-6 py-3 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              Back
            </button>

            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={loading || !canProceed()}
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    🎬 Create Video
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
