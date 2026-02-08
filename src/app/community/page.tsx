"use client";

import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Loader2,
  Brain,
  Crown,
  Tag,
  UserPlus,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Sidebar } from "@/components/navigation/Sidebar";
import type { CommunityStats, CommunityInsight, NetGrowth } from "@/lib/community/types";

type NetPeriod = keyof NetGrowth;

const PLAN_COLORS = [
  "#FF4500",
  "#F4A300",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
];

const IMPACT_COLORS: Record<string, string> = {
  high: "#10B981",
  medium: "#F4A300",
  low: "#6B7280",
};

const INSIGHT_ICONS: Record<string, React.ReactNode> = {
  growth: <UserPlus className="h-5 w-5" />,
  retention: <Users className="h-5 w-5" />,
  revenue: <DollarSign className="h-5 w-5" />,
  engagement: <TrendingUp className="h-5 w-5" />,
  opportunity: <Lightbulb className="h-5 w-5" />,
};

function formatCurrency(amount: number): string {
  if (amount >= 10000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(2)}`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default function CommunityPage() {
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [insights, setInsights] = useState<CommunityInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [netPeriod, setNetPeriod] = useState<NetPeriod>("monthly");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/community/stats");
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setConfigured(data.configured !== false);
      } else {
        setConfigured(true);
        setStats({
          members: data.members,
          revenue: data.revenue,
          subscriptions: data.subscriptions,
          engagement: data.engagement,
          snapshot: data.snapshot,
        });
      }
    } catch (err) {
      console.error("Failed to fetch community stats:", err);
      setError("Failed to connect to community API");
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const generateInsights = async () => {
    if (!stats) return;
    setGeneratingInsights(true);
    try {
      const response = await fetch("/api/community/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stats),
      });
      const data = await response.json();
      if (data.insights) {
        setInsights(data.insights);
      }
    } catch (err) {
      console.error("Failed to generate insights:", err);
    } finally {
      setGeneratingInsights(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      <Sidebar />
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Community Intelligence
            </h1>
            <p className="text-[#999999] mt-1">
              Let&apos;s Truck Tribe &mdash; Mighty Networks
            </p>
          </div>
          <div className="flex items-center gap-3">
            {stats?.snapshot?.fetchedAt && (
              <span className="text-xs text-[#666666]">
                Updated{" "}
                {new Date(stats.snapshot.fetchedAt).toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={refreshStats}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white rounded-lg border border-[#333333] hover:bg-[#252525] transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Data Quality Indicator */}
        {!loading && stats?.snapshot?.fetchCounts && (
          <div className="mb-4 flex items-center gap-4 text-xs text-[#666666] bg-[#1A1A1A] border border-[#252525] rounded-lg px-4 py-2">
            <span>
              Loaded: {formatNumber(stats.snapshot.fetchCounts.members)} members,{" "}
              {formatNumber(stats.snapshot.fetchCounts.subscriptions)} subscriptions,{" "}
              {stats.snapshot.fetchCounts.purchases} purchases
            </span>
            {stats.snapshot.warnings && stats.snapshot.warnings.length > 0 && (
              <span className="flex items-center gap-1 text-yellow-400">
                <AlertTriangle className="h-3 w-3" />
                {stats.snapshot.warnings[0]}
              </span>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#FF4500] mx-auto mb-4" />
              <p className="text-[#999999]">
                Loading community data from Mighty Networks...
              </p>
            </div>
          </div>
        )}

        {/* Not Configured State */}
        {!loading && !configured && (
          <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-[#F4A300] mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Mighty Networks Not Connected
            </h2>
            <p className="text-[#999999]">
              Set the MIGHTY_NETWORKS_API_TOKEN environment variable to connect
              your community data.
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && configured && (
          <div className="bg-[#1A1A1A] border border-red-500/30 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <p className="text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {!loading && stats && (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              {/* Total Members */}
              <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Users className="h-5 w-5 text-blue-400" />
                  </div>
                  {stats.members.new30d > 0 && (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <ArrowUpRight className="h-3 w-3" />+
                      {stats.members.new30d} this month
                    </span>
                  )}
                </div>
                <p className="text-3xl font-bold text-white">
                  {formatNumber(stats.members.total)}
                </p>
                <p className="text-sm text-[#999999] mt-1">Total Members</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-[#666666]">
                    +{stats.members.new7d} this week
                  </span>
                  <span className="text-xs text-[#666666]">
                    &bull; {stats.members.growthRate}% growth rate
                  </span>
                </div>
              </div>

              {/* MRR */}
              <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-400" />
                  </div>
                  <span className="text-xs text-[#999999]">
                    ARR: {formatCurrency(stats.revenue.arr)}
                  </span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {formatCurrency(stats.revenue.mrr)}
                </p>
                <p className="text-sm text-[#999999] mt-1">
                  Monthly Recurring Revenue
                </p>
                <div className="mt-2">
                  <span className="text-xs text-[#666666]">
                    {formatCurrency(stats.revenue.avgRevenuePerMember)}/member
                    avg
                  </span>
                </div>
              </div>

              {/* Active Subscriptions */}
              <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Crown className="h-5 w-5 text-purple-400" />
                  </div>
                  <span className="text-xs text-[#666666]">
                    {stats.subscriptions.canceled} canceled
                  </span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {stats.subscriptions.active}
                </p>
                <p className="text-sm text-[#999999] mt-1">
                  Active Subscriptions
                </p>
                <div className="mt-2">
                  <span className="text-xs text-[#666666]">
                    {stats.subscriptions.planBreakdown.length} plan
                    {stats.subscriptions.planBreakdown.length !== 1 ? "s" : ""}{" "}
                    available
                  </span>
                </div>
              </div>

              {/* Churn Rate */}
              <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`p-2 rounded-lg ${
                      stats.subscriptions.churnRate > 10
                        ? "bg-red-500/10"
                        : stats.subscriptions.churnRate > 5
                        ? "bg-yellow-500/10"
                        : "bg-green-500/10"
                    }`}
                  >
                    {stats.subscriptions.churnRate > 10 ? (
                      <ArrowDownRight className="h-5 w-5 text-red-400" />
                    ) : stats.subscriptions.churnRate > 5 ? (
                      <TrendingDown className="h-5 w-5 text-yellow-400" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                    )}
                  </div>
                  {stats.subscriptions.churnRate <= 5 && (
                    <span className="text-xs text-green-400">Healthy</span>
                  )}
                  {stats.subscriptions.churnRate > 5 &&
                    stats.subscriptions.churnRate <= 10 && (
                      <span className="text-xs text-yellow-400">
                        Needs Attention
                      </span>
                    )}
                  {stats.subscriptions.churnRate > 10 && (
                    <span className="text-xs text-red-400">High Risk</span>
                  )}
                </div>
                <p className="text-3xl font-bold text-white">
                  {stats.subscriptions.churnRate}%
                </p>
                <p className="text-sm text-[#999999] mt-1">
                  Churn Rate (30 day)
                </p>
                <div className="mt-2">
                  <span className="text-xs text-[#666666]">
                    Industry avg: 5-7% for communities
                  </span>
                </div>
              </div>

              {/* Net Growth */}
              <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`p-2 rounded-lg ${
                      (stats.members.netGrowth?.[netPeriod] ?? 0) >= 0
                        ? "bg-green-500/10"
                        : "bg-red-500/10"
                    }`}
                  >
                    {(stats.members.netGrowth?.[netPeriod] ?? 0) >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-400" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-400" />
                    )}
                  </div>
                </div>
                <p
                  className={`text-3xl font-bold ${
                    (stats.members.netGrowth?.[netPeriod] ?? 0) >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {(stats.members.netGrowth?.[netPeriod] ?? 0) >= 0 ? "+" : ""}
                  {stats.members.netGrowth?.[netPeriod] ?? 0}
                </p>
                <p className="text-sm text-[#999999] mt-1">Net Growth</p>
                <div className="mt-2 flex gap-1">
                  {(
                    [
                      { key: "daily", label: "Day" },
                      { key: "weekly", label: "Week" },
                      { key: "monthly", label: "Month" },
                      { key: "ytd", label: "YTD" },
                    ] as { key: NetPeriod; label: string }[]
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setNetPeriod(tab.key)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        netPeriod === tab.key
                          ? "bg-[#FF4500] text-white"
                          : "bg-[#252525] text-[#666666] hover:text-[#999999]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Plan Breakdown Pie Chart */}
              {stats.subscriptions.planBreakdown.length > 0 && (
                <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Revenue by Plan
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.subscriptions.planBreakdown.map((p) => ({
                            name: p.name,
                            value: p.revenue,
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {stats.subscriptions.planBreakdown.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PLAN_COLORS[index % PLAN_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1A1A1A",
                            border: "1px solid #333",
                            borderRadius: "8px",
                            color: "#fff",
                          }}
                          formatter={(value: number) => [
                            formatCurrency(value) + "/mo",
                            "Revenue",
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 mt-2">
                    {stats.subscriptions.planBreakdown.map((plan, index) => (
                      <div key={plan.name} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              PLAN_COLORS[index % PLAN_COLORS.length],
                          }}
                        />
                        <span className="text-xs text-[#999999]">
                          {plan.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subscribers by Plan Bar Chart */}
              {stats.subscriptions.planBreakdown.length > 0 && (
                <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Subscribers by Plan
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stats.subscriptions.planBreakdown}
                        layout="vertical"
                        margin={{ left: 10, right: 20 }}
                      >
                        <XAxis type="number" stroke="#666" fontSize={12} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          stroke="#666"
                          fontSize={11}
                          width={100}
                          tickFormatter={(value: string) =>
                            value.length > 14
                              ? value.substring(0, 14) + "..."
                              : value
                          }
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1A1A1A",
                            border: "1px solid #333",
                            borderRadius: "8px",
                            color: "#fff",
                          }}
                          formatter={(value: number) => [value, "Subscribers"]}
                        />
                        <Bar
                          dataKey="count"
                          fill="#FF4500"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Three-Column Info Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Plan Breakdown Table */}
              <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Crown className="h-5 w-5 text-purple-400" />
                  Plan Breakdown
                </h3>
                {stats.subscriptions.planBreakdown.length > 0 ? (
                  <div className="space-y-3">
                    {stats.subscriptions.planBreakdown.map((plan) => (
                      <div
                        key={plan.name}
                        className="flex items-center justify-between py-2 border-b border-[#252525] last:border-0"
                      >
                        <div>
                          <p className="text-sm text-white font-medium">
                            {plan.name}
                          </p>
                          <p className="text-xs text-[#666666]">
                            {formatCurrency(plan.amount)}/{plan.interval}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-white font-semibold">
                            {plan.count}
                          </p>
                          <p className="text-xs text-green-400">
                            {formatCurrency(plan.revenue)}/mo
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#666666]">No plans found</p>
                )}
              </div>

              {/* Top Referrers */}
              <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-blue-400" />
                  Top Referrers
                </h3>
                {stats.engagement.topReferrers.length > 0 ? (
                  <div className="space-y-3">
                    {stats.engagement.topReferrers.slice(0, 8).map((ref, i) => (
                      <div
                        key={ref.id}
                        className="flex items-center justify-between py-2 border-b border-[#252525] last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[#666666] w-5">
                            #{i + 1}
                          </span>
                          <span className="text-sm text-white">{ref.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-[#FF4500]">
                          {ref.referralCount} referrals
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#666666]">
                    No referral data available
                  </p>
                )}
              </div>

              {/* Community Tags */}
              <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Tag className="h-5 w-5 text-green-400" />
                  Community Tags
                </h3>
                {stats.engagement.tagDistribution.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {stats.engagement.tagDistribution.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-3 py-1.5 rounded-full text-sm bg-[#252525] text-[#999999] border border-[#333333]"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#666666]">No tags found</p>
                )}
              </div>
            </div>

            {/* AI Community Advisor Section */}
            <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-[#FF4500] to-[#F4A300] rounded-lg">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      AI Community Advisor
                    </h3>
                    <p className="text-xs text-[#999999]">
                      Claude analyzes your community data and recommends growth
                      strategies
                    </p>
                  </div>
                </div>
                <button
                  onClick={generateInsights}
                  disabled={generatingInsights}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF4500] to-[#CC3700] text-white rounded-lg hover:from-[#E03E00] hover:to-[#B33000] transition-all disabled:opacity-50"
                >
                  {generatingInsights ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4" />
                      {insights.length > 0
                        ? "Refresh Insights"
                        : "Get AI Recommendations"}
                    </>
                  )}
                </button>
              </div>

              {/* Insights */}
              {insights.length > 0 ? (
                <div className="space-y-4">
                  {insights.map((insight) => (
                    <div
                      key={insight.id}
                      className="bg-[#0D0D0D] border border-[#333333] rounded-lg p-5"
                      style={{
                        borderLeftWidth: "4px",
                        borderLeftColor:
                          IMPACT_COLORS[insight.impact] || "#666",
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-0.5 text-[#999999]">
                          {INSIGHT_ICONS[insight.type] || (
                            <Lightbulb className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-white font-semibold">
                              {insight.title}
                            </h4>
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase"
                              style={{
                                backgroundColor: `${
                                  IMPACT_COLORS[insight.impact] || "#666"
                                }20`,
                                color:
                                  IMPACT_COLORS[insight.impact] || "#666",
                              }}
                            >
                              {insight.impact} impact
                            </span>
                          </div>
                          <p className="text-sm text-[#999999] mb-3">
                            {insight.description}
                          </p>
                          <div className="bg-[#1A1A1A] rounded-lg p-3 border border-[#252525]">
                            <p className="text-sm text-[#F4A300] font-medium flex items-center gap-2">
                              <ArrowUpRight className="h-4 w-4" />
                              {insight.recommendation}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !generatingInsights ? (
                <div className="text-center py-8">
                  <Brain className="h-10 w-10 text-[#333333] mx-auto mb-3" />
                  <p className="text-[#666666] text-sm">
                    Click &quot;Get AI Recommendations&quot; to analyze your
                    community data
                  </p>
                  <p className="text-[#555555] text-xs mt-1">
                    Claude will review member growth, revenue trends, and
                    engagement patterns
                  </p>
                </div>
              ) : null}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
