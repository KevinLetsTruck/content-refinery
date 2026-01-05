"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Brain,
  Lightbulb,
  TrendingUp,
  Clock,
  Target,
  CheckCircle,
  XCircle,
  Sparkles,
  Calendar,
  BarChart3,
  RefreshCw,
  Loader2,
  ArrowRight,
  Zap,
  ArrowLeft,
} from "lucide-react";
import { Sidebar } from "@/components/navigation/Sidebar";

interface Insight {
  id: string;
  type: string;
  category?: string;
  title: string;
  description: string;
  recommendation: string;
  dataPoints: Record<string, unknown>;
  confidence: number;
  impact: "low" | "medium" | "high";
  status: string;
  createdAt: string;
}

interface NextWeekItem {
  topic?: string;
  type?: string;
  description: string;
  suggestedDay: string;
  suggestedTime: string;
}

interface Digest {
  id: string;
  weekStart: string;
  weekEnd: string;
  postsAnalyzed: number;
  totalEngagement: number;
  topTopic: string | null;
  topFormat: string | null;
  summary: string;
  highlights: string[];
  improvements: string[];
  nextWeekPlan: NextWeekItem[];
}

const typeIcons: Record<string, React.ElementType> = {
  topic_performance: TrendingUp,
  timing: Clock,
  format: BarChart3,
  engagement_pattern: Sparkles,
  content_gap: Target,
  platform: Zap,
};

const impactColors: Record<string, string> = {
  high: "border-green-500 bg-green-900/10",
  medium: "border-yellow-500 bg-yellow-900/10",
  low: "border-gray-500 bg-gray-900/10",
};

export default function AdvisorPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"insights" | "digest">("insights");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [insightsRes, digestRes] = await Promise.all([
        fetch("/api/advisor?status=new"),
        fetch("/api/advisor/digest"),
      ]);

      const insightsData = await insightsRes.json();
      const digestData = await digestRes.json();

      setInsights(insightsData.insights || []);
      setDigest(digestData.digest);
    } catch (error) {
      console.error("Failed to fetch advisor data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateNewInsights = async () => {
    try {
      setGenerating(true);
      await fetch("/api/advisor", { method: "POST" });
      await fetchData();
    } catch (error) {
      console.error("Failed to generate insights:", error);
    } finally {
      setGenerating(false);
    }
  };

  const updateInsightStatus = async (insightId: string, status: string) => {
    try {
      await fetch("/api/advisor", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insightId, status }),
      });
      setInsights(insights.filter((i) => i.id !== insightId));
    } catch (error) {
      console.error("Failed to update insight:", error);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0D0D0D]">
      <Sidebar />

      <main className="flex-1 ml-64">
        {/* Orange accent line */}
        <div className="h-1 bg-gradient-to-r from-[#FF4500] to-[#F4A300]" />

        <div className="p-8">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Link
                  href="/"
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                  <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
                    <Brain className="w-8 h-8 text-purple-400" />
                    AI Content Advisor
                  </h1>
                  <p className="text-gray-400 mt-1">
                    Personalized insights to improve your content performance
                  </p>
                </div>
              </div>
              <button
                onClick={generateNewInsights}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition disabled:opacity-50 text-white"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Refresh Insights
                  </>
                )}
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab("insights")}
                className={`px-4 py-2 rounded-lg transition ${
                  activeTab === "insights"
                    ? "bg-purple-600 text-white"
                    : "bg-[#1A1A1A] text-gray-400 hover:text-white"
                }`}
              >
                <Lightbulb className="w-4 h-4 inline mr-2" />
                Insights ({insights.length})
              </button>
              <button
                onClick={() => setActiveTab("digest")}
                className={`px-4 py-2 rounded-lg transition ${
                  activeTab === "digest"
                    ? "bg-purple-600 text-white"
                    : "bg-[#1A1A1A] text-gray-400 hover:text-white"
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Weekly Digest
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </div>
            ) : activeTab === "insights" ? (
              /* Insights Tab */
              <div className="space-y-4">
                {insights.length === 0 ? (
                  <div className="text-center py-20">
                    <Lightbulb className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                    <h2 className="text-xl font-semibold mb-2 text-white">
                      No new insights
                    </h2>
                    <p className="text-gray-400 mb-4">
                      All caught up! Check back after publishing more content.
                    </p>
                    <button
                      onClick={generateNewInsights}
                      className="text-purple-400 hover:underline"
                    >
                      Generate insights now
                    </button>
                  </div>
                ) : (
                  insights.map((insight) => {
                    const Icon = typeIcons[insight.type] || Lightbulb;

                    return (
                      <div
                        key={insight.id}
                        className={`bg-[#1A1A1A] rounded-xl border-l-4 ${
                          impactColors[insight.impact]
                        } p-6`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-purple-900/30 rounded-lg">
                            <Icon className="w-6 h-6 text-purple-400" />
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  insight.impact === "high"
                                    ? "bg-green-900/50 text-green-400"
                                    : insight.impact === "medium"
                                      ? "bg-yellow-900/50 text-yellow-400"
                                      : "bg-gray-800 text-gray-400"
                                }`}
                              >
                                {insight.impact} impact
                              </span>
                              <span className="text-xs text-gray-500">
                                {Math.round(insight.confidence * 100)}% confidence
                              </span>
                            </div>

                            <h3 className="text-lg font-semibold mb-2 text-white">
                              {insight.title}
                            </h3>
                            <p className="text-gray-300 mb-3">
                              {insight.description}
                            </p>

                            <div className="bg-[#0D0D0D] rounded-lg p-4 mb-4">
                              <div className="flex items-center gap-2 text-purple-400 text-sm font-medium mb-1">
                                <ArrowRight className="w-4 h-4" />
                                Recommendation
                              </div>
                              <p className="text-gray-300">
                                {insight.recommendation}
                              </p>
                            </div>

                            {/* Data Points */}
                            {insight.dataPoints && (
                              <details className="text-sm">
                                <summary className="text-gray-500 cursor-pointer hover:text-gray-300">
                                  View supporting data
                                </summary>
                                <pre className="mt-2 p-3 bg-[#0D0D0D] rounded text-xs overflow-auto text-gray-400">
                                  {JSON.stringify(insight.dataPoints, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() =>
                                updateInsightStatus(insight.id, "acted_on")
                              }
                              className="p-2 bg-green-900/30 text-green-400 rounded-lg hover:bg-green-900/50 transition"
                              title="Mark as acted on"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() =>
                                updateInsightStatus(insight.id, "dismissed")
                              }
                              className="p-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition"
                              title="Dismiss"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* Digest Tab */
              <div>
                {!digest ? (
                  <div className="text-center py-20">
                    <Calendar className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                    <h2 className="text-xl font-semibold mb-2 text-white">
                      No digest available
                    </h2>
                    <p className="text-gray-400">
                      Weekly digests are generated every Sunday
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Digest Header */}
                    <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl border border-purple-900/50 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-white">
                          Weekly Report
                        </h2>
                        <span className="text-sm text-gray-400">
                          {new Date(digest.weekStart).toLocaleDateString()} -{" "}
                          {new Date(digest.weekEnd).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-gray-300 text-lg mb-4">
                        {digest.summary}
                      </p>

                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-[#0D0D0D]/50 rounded-lg p-3">
                          <div className="text-2xl font-bold text-white">
                            {digest.postsAnalyzed}
                          </div>
                          <div className="text-sm text-gray-400">Posts</div>
                        </div>
                        <div className="bg-[#0D0D0D]/50 rounded-lg p-3">
                          <div className="text-2xl font-bold text-white">
                            {digest.totalEngagement.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-400">Engagements</div>
                        </div>
                        <div className="bg-[#0D0D0D]/50 rounded-lg p-3">
                          <div className="text-2xl font-bold capitalize text-white">
                            {digest.topTopic?.replace("_", " ") || "—"}
                          </div>
                          <div className="text-sm text-gray-400">Top Topic</div>
                        </div>
                        <div className="bg-[#0D0D0D]/50 rounded-lg p-3">
                          <div className="text-2xl font-bold capitalize text-white">
                            {digest.topFormat?.replace("_", " ") || "—"}
                          </div>
                          <div className="text-sm text-gray-400">Top Format</div>
                        </div>
                      </div>
                    </div>

                    {/* Highlights & Improvements */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                        <h3 className="font-semibold flex items-center gap-2 mb-4 text-white">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          Highlights
                        </h3>
                        <ul className="space-y-2">
                          {digest.highlights.map((highlight, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-green-400 mt-1">•</span>
                              <span className="text-gray-300">{highlight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                        <h3 className="font-semibold flex items-center gap-2 mb-4 text-white">
                          <Target className="w-5 h-5 text-yellow-400" />
                          Areas to Improve
                        </h3>
                        <ul className="space-y-2">
                          {digest.improvements.map((improvement, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-yellow-400 mt-1">•</span>
                              <span className="text-gray-300">{improvement}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Next Week Plan */}
                    <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                      <h3 className="font-semibold flex items-center gap-2 mb-4 text-white">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        Suggested Content for Next Week
                      </h3>

                      <div className="space-y-3">
                        {digest.nextWeekPlan.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-4 p-3 bg-[#0D0D0D] rounded-lg"
                          >
                            <div className="w-20 text-center">
                              <div className="text-sm font-medium text-white">
                                {item.suggestedDay}
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.suggestedTime}
                              </div>
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs px-2 py-0.5 bg-purple-900/50 text-purple-400 rounded capitalize">
                                  {item.topic?.replace("_", " ")}
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-[#2A2A2A] text-gray-400 rounded capitalize">
                                  {item.type?.replace("_", " ")}
                                </span>
                              </div>
                              <p className="text-gray-300">{item.description}</p>
                            </div>

                            <Link
                              href="/create"
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm transition text-white"
                            >
                              Create
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

