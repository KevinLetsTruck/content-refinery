"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Twitter,
  Instagram,
  Youtube,
  Mail,
  FileText,
  Layers,
  Video,
  Image as ImageIcon,
  Loader2,
  X,
  ChevronRight,
  Wand2,
  ArrowLeft,
} from "lucide-react";
import { Sidebar } from "@/components/navigation/Sidebar";

interface Suggestion {
  id: string;
  contentId: string;
  targetFormat: string;
  reason: string;
  priority: number;
  content: {
    id: string;
    title: string | null;
    text: string;
    contentType: string | null;
    platform: string;
  };
  formatInfo?: {
    format: string;
    name: string;
    description: string;
    platforms: string[];
  };
}

const formatIcons: Record<string, React.ElementType> = {
  twitter_thread: Twitter,
  carousel: Layers,
  video_script: Video,
  blog_post: FileText,
  email_newsletter: Mail,
  quick_tips: Sparkles,
  infographic_brief: ImageIcon,
};

export default function RepurposePage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/repurpose?limit=20");
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (suggestion: Suggestion) => {
    try {
      setGenerating(suggestion.id);

      const res = await fetch("/api/repurpose/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: suggestion.contentId,
          targetFormat: suggestion.targetFormat,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Remove from suggestions
        setSuggestions(suggestions.filter((s) => s.id !== suggestion.id));
        // Redirect to queue to see the new content
        window.location.href = `/queue`;
      }
    } catch (error) {
      console.error("Failed to generate:", error);
    } finally {
      setGenerating(null);
    }
  };

  const handleDismiss = async (suggestionId: string) => {
    try {
      await fetch(`/api/repurpose/generate?id=${suggestionId}`, {
        method: "DELETE",
      });
      setSuggestions(suggestions.filter((s) => s.id !== suggestionId));
    } catch (error) {
      console.error("Failed to dismiss:", error);
    }
  };

  // Group suggestions by original content
  const groupedSuggestions = suggestions.reduce(
    (acc, suggestion) => {
      const key = suggestion.contentId;
      if (!acc[key]) {
        acc[key] = {
          content: suggestion.content,
          suggestions: [],
        };
      }
      acc[key].suggestions.push(suggestion);
      return acc;
    },
    {} as Record<string, { content: Suggestion["content"]; suggestions: Suggestion[] }>
  );

  return (
    <div className="flex min-h-screen bg-[#0D0D0D]">
      <Sidebar />

      <main className="flex-1 ml-64">
        {/* Orange accent line */}
        <div className="h-1 bg-gradient-to-r from-[#FF4500] to-[#F4A300]" />

        <div className="p-8">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <Link
                href="/"
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
                  <Wand2 className="w-8 h-8 text-purple-400" />
                  Content Repurposing
                </h1>
                <p className="text-gray-400 mt-1">
                  Transform your content into new formats for different platforms
                </p>
              </div>
            </div>

            {/* How it works */}
            <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl border border-purple-900/30 p-6 mb-8">
              <h2 className="font-semibold mb-3 text-white">How it works</h2>
              <div className="flex items-center gap-4 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-900/50 rounded-full flex items-center justify-center text-white">
                    1
                  </div>
                  <span>Your best content is analyzed</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-900/50 rounded-full flex items-center justify-center text-white">
                    2
                  </div>
                  <span>AI suggests new formats</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-900/50 rounded-full flex items-center justify-center text-white">
                    3
                  </div>
                  <span>One click to generate</span>
                </div>
              </div>
            </div>

            {/* Suggestions */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </div>
            ) : Object.keys(groupedSuggestions).length === 0 ? (
              <div className="text-center py-20">
                <Wand2 className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                <h2 className="text-xl font-semibold mb-2 text-white">
                  No suggestions yet
                </h2>
                <p className="text-gray-400 mb-4">
                  Create and publish more content to get repurposing suggestions
                </p>
                <Link
                  href="/create"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF4500] rounded-lg text-white"
                >
                  Create Content
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.values(groupedSuggestions).map(
                  ({ content, suggestions: contentSuggestions }) => (
                    <div
                      key={content.id}
                      className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]"
                    >
                      {/* Original Content Header */}
                      <div className="p-4 border-b border-[#2A2A2A]">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-500 uppercase mb-1">
                              Original {content.contentType || "content"}
                            </div>
                            <h3 className="font-medium text-white">
                              {content.title ||
                                content.text?.substring(0, 60) + "..."}
                            </h3>
                          </div>
                          <Link
                            href={`/queue`}
                            className="text-sm text-[#FF4500] hover:underline"
                          >
                            View
                          </Link>
                        </div>
                      </div>

                      {/* Suggestions */}
                      <div className="p-4 space-y-3">
                        <div className="text-sm text-gray-400 mb-2">
                          Repurpose into:
                        </div>
                        {contentSuggestions.map((suggestion) => {
                          const Icon =
                            formatIcons[suggestion.targetFormat] || FileText;
                          const isGenerating = generating === suggestion.id;

                          return (
                            <div
                              key={suggestion.id}
                              className="flex items-center gap-4 p-3 bg-[#0D0D0D] rounded-lg"
                            >
                              <div className="p-2 bg-purple-900/30 rounded-lg">
                                <Icon className="w-5 h-5 text-purple-400" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-white">
                                  {suggestion.formatInfo?.name ||
                                    suggestion.targetFormat}
                                </div>
                                <div className="text-sm text-gray-400">
                                  {suggestion.reason}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  {suggestion.formatInfo?.platforms.map((p) => (
                                    <span
                                      key={p}
                                      className="text-xs px-2 py-0.5 bg-[#2A2A2A] rounded capitalize text-gray-300"
                                    >
                                      {p}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleDismiss(suggestion.id)}
                                  className="p-2 text-gray-500 hover:text-gray-300 transition"
                                  title="Dismiss"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleGenerate(suggestion)}
                                  disabled={isGenerating}
                                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition disabled:opacity-50 text-white"
                                >
                                  {isGenerating ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      Generating...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-4 h-4" />
                                      Generate
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}



