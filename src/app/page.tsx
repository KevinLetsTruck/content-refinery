"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  ChevronRight,
  Twitter,
  Facebook,
  Instagram,
  Youtube,
  Eye,
  Heart,
  Share2,
  Zap,
  Target,
  Flame,
  Package,
  FileText,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  ListChecks,
} from "lucide-react";
import { Sidebar } from "@/components/navigation/Sidebar";

interface DashboardStats {
  postsToday: number;
  postsThisWeek: number;
  publishedThisWeek: number;
  failedPosts: number;
  pendingReview: number;
  totalEngagement: number;
  engagementChange: number;
  impressions: number;
  contentStreak: number;
}

interface ScheduledPost {
  id: string;
  title: string;
  content: string;
  platform: string;
  scheduledFor: string;
  status: string;
}

interface RecentActivity {
  id: string;
  type: "published" | "created" | "failed" | "engagement";
  title: string;
  platform?: string;
  timestamp: string;
  details?: string;
}

interface TopPost {
  id: string;
  content: string;
  platform: string;
  publishedAt: string | null;
  impressions: number;
  engagements: number;
  clicks: number;
}

const platformIcons: Record<string, React.ElementType> = {
  twitter: Twitter,
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
};

const platformColors: Record<string, string> = {
  twitter: "text-blue-400",
  facebook: "text-blue-600",
  instagram: "text-pink-500",
  youtube: "text-red-500",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todaysPosts, setTodaysPosts] = useState<ScheduledPost[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard");
      const data = await res.json();

      setStats(data.stats);
      setTodaysPosts(data.todaysPosts || []);
      setRecentActivity(data.recentActivity || []);
      setTopPosts(data.topPosts || []);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#0D0D0D]">
        <Sidebar />
        <main className="flex-1 ml-64">
          <div className="h-1 bg-gradient-to-r from-[#FF4500] to-[#F4A300]" />
          <div className="p-8">
            <div className="max-w-7xl mx-auto">
              <div className="animate-pulse space-y-6">
                <div className="h-10 bg-gray-800 rounded w-64"></div>
                <div className="grid grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 bg-gray-800 rounded-xl"></div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-2 h-96 bg-gray-800 rounded-xl"></div>
                  <div className="h-96 bg-gray-800 rounded-xl"></div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0D0D0D]">
      <Sidebar queueCount={stats?.pendingReview || 0} />

      <main className="flex-1 ml-64">
        {/* Orange accent line */}
        <div className="h-1 bg-gradient-to-r from-[#FF4500] to-[#F4A300]" />

        <div className="p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {getGreeting()}, Kevin
                </h1>
                <p className="text-gray-400 mt-1">
                  Here&apos;s what&apos;s happening with your content
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/calendar"
                  className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#3A3A3A] rounded-lg transition text-white"
                >
                  <Calendar className="w-4 h-4" />
                  Calendar
                </Link>
                <Link
                  href="/create"
                  className="flex items-center gap-2 px-4 py-2 bg-[#FF4500] hover:bg-[#FF5722] rounded-lg transition text-white"
                >
                  <Plus className="w-4 h-4" />
                  Create Content
                </Link>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Today's Posts */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-5">
                <div className="flex items-center justify-between mb-3">
                  <Clock className="w-5 h-5 text-blue-400" />
                  {stats?.failedPosts ? (
                    <span className="text-xs px-2 py-0.5 bg-red-900/50 text-red-400 rounded">
                      {stats.failedPosts} failed
                    </span>
                  ) : null}
                </div>
                <div className="text-3xl font-bold text-white">
                  {stats?.postsToday || 0}
                </div>
                <div className="text-sm text-gray-400">Posts today</div>
              </div>

              {/* Weekly Posts */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-5">
                <div className="flex items-center justify-between mb-3">
                  <Calendar className="w-5 h-5 text-green-400" />
                  <span className="text-xs text-green-400">
                    {stats?.publishedThisWeek || 0} published
                  </span>
                </div>
                <div className="text-3xl font-bold text-white">
                  {stats?.postsThisWeek || 0}
                </div>
                <div className="text-sm text-gray-400">This week</div>
              </div>

              {/* Engagement */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-5">
                <div className="flex items-center justify-between mb-3">
                  <Heart className="w-5 h-5 text-pink-400" />
                  {stats?.engagementChange !== undefined && (
                    <span
                      className={`text-xs flex items-center gap-0.5 ${
                        stats.engagementChange >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {stats.engagementChange >= 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {Math.abs(stats.engagementChange)}%
                    </span>
                  )}
                </div>
                <div className="text-3xl font-bold text-white">
                  {stats?.totalEngagement?.toLocaleString() || 0}
                </div>
                <div className="text-sm text-gray-400">Engagements (7d)</div>
              </div>

              {/* Content Streak */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-5">
                <div className="flex items-center justify-between mb-3">
                  <Flame className="w-5 h-5 text-orange-400" />
                  {(stats?.contentStreak || 0) >= 7 && (
                    <span className="text-xs px-2 py-0.5 bg-orange-900/50 text-orange-400 rounded">
                      🔥 On fire!
                    </span>
                  )}
                </div>
                <div className="text-3xl font-bold text-white">
                  {stats?.contentStreak || 0}
                </div>
                <div className="text-sm text-gray-400">Day streak</div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Today's Schedule */}
              <div className="lg:col-span-2 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
                <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
                  <h2 className="font-semibold flex items-center gap-2 text-white">
                    <Clock className="w-5 h-5 text-[#FF4500]" />
                    Today&apos;s Schedule
                  </h2>
                  <Link
                    href="/calendar"
                    className="text-sm text-[#FF4500] hover:underline flex items-center gap-1"
                  >
                    View all
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="divide-y divide-[#2A2A2A]">
                  {todaysPosts.length === 0 ? (
                    <div className="p-8 text-center">
                      <Calendar className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                      <p className="text-gray-400">
                        No posts scheduled for today
                      </p>
                      <Link
                        href="/create"
                        className="inline-flex items-center gap-2 mt-4 text-[#FF4500] hover:underline"
                      >
                        <Plus className="w-4 h-4" />
                        Schedule a post
                      </Link>
                    </div>
                  ) : (
                    todaysPosts.map((post) => {
                      const Icon = platformIcons[post.platform] || Clock;
                      const time = new Date(post.scheduledFor).toLocaleTimeString(
                        "en-US",
                        { hour: "numeric", minute: "2-digit" }
                      );
                      const isPast = new Date(post.scheduledFor) < new Date();

                      return (
                        <div
                          key={post.id}
                          className="flex items-center gap-4 p-4 hover:bg-[#2A2A2A]/50 transition"
                        >
                          <div
                            className={`w-16 text-center ${
                              isPast ? "text-gray-500" : "text-white"
                            }`}
                          >
                            <div className="text-sm font-medium">{time}</div>
                          </div>

                          <div
                            className={`p-2 rounded-lg ${
                              post.status === "published"
                                ? "bg-green-900/30"
                                : post.status === "failed"
                                ? "bg-red-900/30"
                                : "bg-[#2A2A2A]"
                            }`}
                          >
                            <Icon
                              className={`w-5 h-5 ${platformColors[post.platform]}`}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="truncate text-white">
                              {post.title || post.content.substring(0, 60)}
                            </p>
                            <p className="text-sm text-gray-500 capitalize">
                              {post.platform}
                            </p>
                          </div>

                          <div>
                            {post.status === "published" ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : post.status === "failed" ? (
                              <AlertCircle className="w-5 h-5 text-red-500" />
                            ) : (
                              <Clock className="w-5 h-5 text-gray-500" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
                <div className="p-4 border-b border-[#2A2A2A]">
                  <h2 className="font-semibold flex items-center gap-2 text-white">
                    <Zap className="w-5 h-5 text-[#F4A300]" />
                    Recent Activity
                  </h2>
                </div>

                <div className="divide-y divide-[#2A2A2A] max-h-[400px] overflow-y-auto">
                  {recentActivity.length === 0 ? (
                    <div className="p-6 text-center text-gray-400">
                      No recent activity
                    </div>
                  ) : (
                    recentActivity.map((activity) => (
                      <div key={activity.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-1.5 rounded-lg ${
                              activity.type === "published"
                                ? "bg-green-900/30 text-green-400"
                                : activity.type === "failed"
                                ? "bg-red-900/30 text-red-400"
                                : activity.type === "engagement"
                                ? "bg-pink-900/30 text-pink-400"
                                : "bg-blue-900/30 text-blue-400"
                            }`}
                          >
                            {activity.type === "published" ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : activity.type === "failed" ? (
                              <AlertCircle className="w-4 h-4" />
                            ) : activity.type === "engagement" ? (
                              <Heart className="w-4 h-4" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white">{activity.title}</p>
                            {activity.details && (
                              <p className="text-xs text-gray-500 mt-0.5 truncate">
                                {activity.details}
                              </p>
                            )}
                            <p className="text-xs text-gray-600 mt-1">
                              {formatTimeAgo(activity.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performing Posts */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
                <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
                  <h2 className="font-semibold flex items-center gap-2 text-white">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    Top Performers (7d)
                  </h2>
                  <Link
                    href="/analytics"
                    className="text-sm text-[#FF4500] hover:underline flex items-center gap-1"
                  >
                    Analytics
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="divide-y divide-[#2A2A2A]">
                  {topPosts.length === 0 ? (
                    <div className="p-6 text-center text-gray-400">
                      No published posts yet
                    </div>
                  ) : (
                    topPosts.slice(0, 5).map((post, index) => {
                      const Icon = platformIcons[post.platform] || FileText;

                      return (
                        <div
                          key={post.id}
                          className="flex items-center gap-4 p-4 hover:bg-[#2A2A2A]/50 transition"
                        >
                          <div className="text-2xl font-bold text-gray-600 w-8">
                            {index + 1}
                          </div>

                          <div className="p-2 rounded-lg bg-[#2A2A2A]">
                            <Icon
                              className={`w-4 h-4 ${platformColors[post.platform]}`}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate text-white">
                              {post.content}
                            </p>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {post.impressions.toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3" />
                                {post.engagements.toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Share2 className="w-3 h-3" />
                                {post.clicks}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <h2 className="font-semibold flex items-center gap-2 mb-4 text-white">
                  <Target className="w-5 h-5 text-[#FF4500]" />
                  Quick Actions
                </h2>

                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/create"
                    className="flex flex-col items-center gap-2 p-4 bg-[#0D0D0D] rounded-lg hover:bg-[#2A2A2A] transition"
                  >
                    <Plus className="w-6 h-6 text-[#FF4500]" />
                    <span className="text-sm text-white">New Post</span>
                  </Link>

                  <Link
                    href="/campaigns/create"
                    className="flex flex-col items-center gap-2 p-4 bg-[#0D0D0D] rounded-lg hover:bg-[#2A2A2A] transition"
                  >
                    <Zap className="w-6 h-6 text-[#F4A300]" />
                    <span className="text-sm text-white">New Campaign</span>
                  </Link>

                  <Link
                    href="/products"
                    className="flex flex-col items-center gap-2 p-4 bg-[#0D0D0D] rounded-lg hover:bg-[#2A2A2A] transition"
                  >
                    <Package className="w-6 h-6 text-green-400" />
                    <span className="text-sm text-white">Products</span>
                  </Link>

                  <Link
                    href="/queue"
                    className="flex flex-col items-center gap-2 p-4 bg-[#0D0D0D] rounded-lg hover:bg-[#2A2A2A] transition"
                  >
                    <ListChecks className="w-6 h-6 text-blue-400" />
                    <span className="text-sm text-white">Review Queue</span>
                  </Link>
                </div>

                {/* Alerts Section */}
                {stats?.failedPosts && stats.failedPosts > 0 && (
                  <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg">
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {stats.failedPosts} post
                        {stats.failedPosts > 1 ? "s" : ""} failed to publish
                      </span>
                    </div>
                    <Link
                      href="/queue?status=failed"
                      className="text-xs text-red-400/80 hover:underline mt-1 inline-block"
                    >
                      View failed posts →
                    </Link>
                  </div>
                )}

                {/* Pending Review Alert */}
                {stats?.pendingReview && stats.pendingReview > 0 && (
                  <div className="mt-4 p-3 bg-[#FF4500]/10 border border-[#FF4500]/30 rounded-lg">
                    <div className="flex items-center gap-2 text-[#FF4500]">
                      <ListChecks className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {stats.pendingReview} post
                        {stats.pendingReview > 1 ? "s" : ""} pending review
                      </span>
                    </div>
                    <Link
                      href="/queue"
                      className="text-xs text-[#FF4500]/80 hover:underline mt-1 inline-block"
                    >
                      Review now →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper function
function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diff = now.getTime() - time.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return time.toLocaleDateString();
}
