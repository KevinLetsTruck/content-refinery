"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Eye,
  Heart,
  Share2,
  BarChart3,
  Sparkles,
  RefreshCw,
  Loader2,
  Trophy,
  Beaker,
  ExternalLink,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Sidebar } from "@/components/navigation/Sidebar";

interface AnalyticsData {
  period: string;
  dataSource?: "published_content" | "performance_metrics";
  metricsStatus?: string;
  overview: {
    totalPosts: number;
    avgEngagement: number;
    totalImpressions: number;
    totalLikes: number;
    totalShares: number;
    totalComments: number;
  };
  performanceLevels: Record<string, number>;
  topPosts: Array<{
    id: string;
    platform: string;
    text: string;
    url?: string;
    engagementRate: number | null;
    impressions: number | null;
    likes: number | null;
    shares: number | null;
    formula?: string;
    pillar?: string;
    performanceLevel: string;
    publishedAt: string;
  }>;
  platformStats: Array<{
    platform: string;
    posts: number;
    avgEngagement: number | null;
    totalImpressions: number | null;
    totalLikes: number | null;
    totalShares: number | null;
  }>;
  formulaStats: Array<{
    formula: string;
    posts: number;
    avgEngagement: number;
  }>;
  pillarStats: Array<{
    pillar: string;
    posts: number;
    avgEngagement: number;
  }>;
  dailyStats: Array<{
    date: string;
    posts: number;
    avg_engagement: number | null;
    total_impressions: number;
  }>;
  recentTests: Array<{
    id: string;
    name: string;
    status: string;
    testVariable: string;
    platform: string;
    pillar?: string;
    winner?: string;
    confidence: number;
    lift: number;
    startedAt: string;
    completedAt?: string;
  }>;
  insights: string[];
}

const PERFORMANCE_COLORS: Record<string, string> = {
  viral: "#10B981",
  excellent: "#22C55E",
  good: "#84CC16",
  average: "#F4A300",
  poor: "#EF4444",
  pending: "#6B7280",
};

const PLATFORM_COLORS: Record<string, string> = {
  twitter: "#1DA1F2",
  facebook: "#1877F2",
  instagram: "#E4405F",
  linkedin: "#0A66C2",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");
  const [platform, setPlatform] = useState<string>("");
  
  useEffect(() => {
    fetchAnalytics();
  }, [period, platform]);
  
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (platform) params.set("platform", platform);
      
      const response = await fetch(`/api/analytics?${params}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#0D0D0D]">
        <Sidebar />
        <main className="flex-1 ml-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF4500]" />
        </main>
      </div>
    );
  }
  
  if (!data) {
    return (
      <div className="flex min-h-screen bg-[#0D0D0D]">
        <Sidebar />
        <main className="flex-1 ml-64">
          <div className="h-1 bg-gradient-to-r from-[#FF4500] to-[#F4A300]" />
          <div className="p-8">
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-[#666] mx-auto mb-4" />
              <h2 className="text-white text-xl font-semibold">No analytics data yet</h2>
              <p className="text-[#888] mt-2">Publish some content and check back later</p>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  // Format data for charts
  const performanceData = Object.entries(data.performanceLevels).map(([level, count]) => ({
    name: level.charAt(0).toUpperCase() + level.slice(1),
    value: count,
    color: PERFORMANCE_COLORS[level] || "#666",
  }));
  
  const formulaData = data.formulaStats.slice(0, 7).map(f => ({
    name: f.formula?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "Unknown",
    engagement: parseFloat((f.avgEngagement * 100).toFixed(2)),
    posts: f.posts,
  }));
  
  return (
    <div className="flex min-h-screen bg-[#0D0D0D]">
      <Sidebar />
      
      <main className="flex-1 ml-64">
        {/* Orange accent line */}
        <div className="h-1 bg-gradient-to-r from-[#FF4500] to-[#F4A300]" />
        
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics</h1>
          <p className="text-[#888] mt-1">Content performance insights</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Period Selector */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-[#1A1A1A] border border-[#333] rounded-lg px-4 py-2 text-white"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          
          {/* Platform Filter */}
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="bg-[#1A1A1A] border border-[#333] rounded-lg px-4 py-2 text-white"
          >
            <option value="">All Platforms</option>
            <option value="twitter">Twitter/X</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
          </select>
          
          {/* Refresh */}
          <button
            onClick={fetchAnalytics}
            className="p-2 rounded-lg border border-[#333] text-[#888] hover:text-white hover:border-[#FF4500] transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Metrics Status Banner */}
      {data.dataSource === "published_content" && (
        <div className="bg-[#F4A300]/10 border border-[#F4A300]/30 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-[#F4A300] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[#F4A300] font-medium">Engagement metrics pending</p>
            <p className="text-[#888] text-sm mt-1">
              Your published posts are shown below. Engagement data (impressions, likes, shares)
              will be collected automatically and displayed once available.
            </p>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <StatCard
          label="Total Posts"
          value={data.overview.totalPosts}
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <StatCard
          label="Avg Engagement"
          value={`${(data.overview.avgEngagement * 100).toFixed(2)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          highlight
        />
        <StatCard
          label="Impressions"
          value={formatNumber(data.overview.totalImpressions)}
          icon={<Eye className="h-5 w-5" />}
        />
        <StatCard
          label="Likes"
          value={formatNumber(data.overview.totalLikes)}
          icon={<Heart className="h-5 w-5" />}
        />
        <StatCard
          label="Shares"
          value={formatNumber(data.overview.totalShares)}
          icon={<Share2 className="h-5 w-5" />}
        />
      </div>
      
      {/* AI Insights */}
      {data.insights.length > 0 && (
        <div className="bg-gradient-to-r from-[#FF4500]/10 to-[#F4A300]/10 border border-[#FF4500]/30 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-[#FF4500]" />
            <h2 className="text-lg font-semibold text-white">AI Insights</h2>
          </div>
          <div className="space-y-2">
            {data.insights.map((insight, i) => (
              <p key={i} className="text-[#CCC]">{insight}</p>
            ))}
          </div>
        </div>
      )}
      
      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Performance Distribution */}
        <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Performance Distribution</h3>
          {performanceData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={performanceData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {performanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1A1A1A",
                      border: "1px solid #333",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#FFF" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-4 justify-center mt-4">
                {performanceData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-sm text-[#888]">
                      {entry.name} ({entry.value})
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-[#666]">
              No performance data yet
            </div>
          )}
        </div>
        
        {/* Formula Performance */}
        <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Formula Performance</h3>
          {formulaData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={formulaData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" stroke="#666" />
                <YAxis dataKey="name" type="category" stroke="#666" width={100} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1A1A1A",
                    border: "1px solid #333",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`${value}%`, "Engagement"]}
                />
                <Bar dataKey="engagement" fill="#FF4500" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-[#666]">
              No formula data yet
            </div>
          )}
        </div>
      </div>
      
      {/* Platform Comparison */}
      {data.platformStats.length > 0 && (
        <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-6 mb-8">
          <h3 className="text-white font-semibold mb-4">Platform Comparison</h3>
          <div className="grid grid-cols-3 gap-4">
            {data.platformStats.map((p) => (
              <div
                key={p.platform}
                className="bg-[#0D0D0D] rounded-lg p-4 border border-[#333]"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: PLATFORM_COLORS[p.platform] || "#666" }}
                  />
                  <span className="text-white font-medium capitalize">{p.platform}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#888]">Posts</span>
                    <span className="text-white">{p.posts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#888]">Avg Engagement</span>
                    <span className="text-[#FF4500] font-medium">
                      {p.avgEngagement !== null
                        ? `${(p.avgEngagement * 100).toFixed(2)}%`
                        : "Pending"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#888]">Impressions</span>
                    <span className="text-white">
                      {p.totalImpressions !== null
                        ? formatNumber(p.totalImpressions)
                        : "Pending"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Two Column: Top Posts & A/B Tests */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top Posts */}
        <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-[#F4A300]" />
            <h3 className="text-white font-semibold">Top Performing Posts</h3>
          </div>
          {data.topPosts.length > 0 ? (
            <div className="space-y-3">
              {data.topPosts.slice(0, 5).map((post, i) => (
                <div
                  key={post.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-[#0D0D0D] border border-[#333]"
                >
                  <span className="text-[#FF4500] font-bold">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{post.text}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-[#888]">
                      <span className="capitalize">{post.platform}</span>
                      {post.engagementRate !== null ? (
                        <>
                          <span className="text-[#FF4500]">
                            {(post.engagementRate * 100).toFixed(2)}% eng
                          </span>
                          <span>{formatNumber(post.impressions || 0)} imp</span>
                        </>
                      ) : (
                        <span className="text-[#F4A300]">Metrics pending</span>
                      )}
                    </div>
                  </div>
                  {post.url && (
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#888] hover:text-[#FF4500]"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#666]">
              No posts yet
            </div>
          )}
        </div>
        
        {/* A/B Tests */}
        <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Beaker className="h-5 w-5 text-[#F4A300]" />
            <h3 className="text-white font-semibold">A/B Tests</h3>
          </div>
          {data.recentTests.length === 0 ? (
            <div className="text-center py-8">
              <Beaker className="h-8 w-8 text-[#666] mx-auto mb-2" />
              <p className="text-[#888]">No A/B tests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentTests.map((test) => (
                <div
                  key={test.id}
                  className="p-3 rounded-lg bg-[#0D0D0D] border border-[#333]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm font-medium">{test.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        test.status === "completed"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-[#F4A300]/20 text-[#F4A300]"
                      }`}
                    >
                      {test.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#888]">
                    <span>Testing: {test.testVariable}</span>
                    <span className="capitalize">{test.platform}</span>
                    {test.winner && (
                      <span className="text-green-400">
                        Winner: Variant {test.winner} (+{test.lift.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <a
            href="/analytics/ab-tests"
            className="flex items-center gap-1 text-[#FF4500] text-sm mt-4 hover:underline"
          >
            View all tests
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 border ${
        highlight
          ? "bg-[#FF4500]/10 border-[#FF4500]/30"
          : "bg-[#1A1A1A] border-[#333]"
      }`}
    >
      <div className="flex items-center gap-2 text-[#888] mb-2">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p
        className={`text-2xl font-bold ${
          highlight ? "text-[#FF4500]" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

