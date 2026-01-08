"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Target,
  Play,
  Pause,
  Loader2,
  Trash2,
  ExternalLink,
  Mail,
  Share2,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
} from "lucide-react";
import { Sidebar } from "@/components/navigation/Sidebar";
import type { Funnel, FunnelStatus, FunnelType } from "@/lib/funnels/types";

const STATUS_BADGES: Record<
  FunnelStatus,
  { color: string; bgColor: string; icon: React.ElementType; label: string }
> = {
  draft: {
    color: "text-gray-400",
    bgColor: "bg-gray-600/20",
    icon: Clock,
    label: "Draft",
  },
  generating: {
    color: "text-blue-400",
    bgColor: "bg-blue-600/20",
    icon: Loader2,
    label: "Generating...",
  },
  review: {
    color: "text-yellow-400",
    bgColor: "bg-yellow-600/20",
    icon: AlertCircle,
    label: "Review",
  },
  active: {
    color: "text-green-400",
    bgColor: "bg-green-600/20",
    icon: Play,
    label: "Active",
  },
  paused: {
    color: "text-orange-400",
    bgColor: "bg-orange-600/20",
    icon: Pause,
    label: "Paused",
  },
  completed: {
    color: "text-purple-400",
    bgColor: "bg-purple-600/20",
    icon: CheckCircle,
    label: "Completed",
  },
};

const TYPE_LABELS: Record<FunnelType, string> = {
  lead_magnet: "Lead Magnet",
  challenge: "Challenge",
  product_launch: "Product Launch",
};

export default function FunnelsPage() {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchFunnels = useCallback(async () => {
    try {
      const res = await fetch("/api/funnels");
      const data = await res.json();
      if (data.success) {
        setFunnels(data.funnels || []);
      }
    } catch (error) {
      console.error("Failed to fetch funnels:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFunnels();
  }, [fetchFunnels]);

  // Poll for updates if any funnel is generating
  useEffect(() => {
    const hasGenerating = funnels.some((f) => f.status === "generating");
    if (!hasGenerating) return;

    const interval = setInterval(fetchFunnels, 5000);
    return () => clearInterval(interval);
  }, [funnels, fetchFunnels]);

  const handleLaunch = async (id: string) => {
    if (!confirm("Launch this funnel? This will activate the landing page and start the email sequence.")) {
      return;
    }

    setActionLoading(id);
    try {
      const res = await fetch(`/api/funnels/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "launch" }),
      });
      const data = await res.json();
      if (data.success) {
        setFunnels((prev) =>
          prev.map((f) => (f.id === id ? { ...f, status: "active" as FunnelStatus } : f))
        );
      }
    } catch (error) {
      console.error("Failed to launch funnel:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePause = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/funnels/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause" }),
      });
      const data = await res.json();
      if (data.success) {
        setFunnels((prev) =>
          prev.map((f) => (f.id === id ? { ...f, status: "paused" as FunnelStatus } : f))
        );
      }
    } catch (error) {
      console.error("Failed to pause funnel:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this funnel? This cannot be undone.")) {
      return;
    }

    setActionLoading(id);
    try {
      const res = await fetch(`/api/funnels/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setFunnels((prev) => prev.filter((f) => f.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete funnel:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: FunnelStatus) => {
    const badge = STATUS_BADGES[status];
    const Icon = badge.icon;
    const isSpinning = status === "generating";

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.bgColor} ${badge.color}`}
      >
        <Icon className={`w-3 h-3 ${isSpinning ? "animate-spin" : ""}`} />
        {badge.label}
      </span>
    );
  };

  const getTypeBadge = (type: FunnelType) => {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#FF4500]/10 text-[#FF4500]">
        {TYPE_LABELS[type]}
      </span>
    );
  };

  const getFunnelStats = (funnel: Funnel) => {
    const emailCount = funnel.emailSequence?.emails?.length || 0;
    const postCount = funnel.socialCampaign?.posts?.length || 0;
    const durationDays = funnel.socialCampaign?.durationDays || 0;

    return { emailCount, postCount, durationDays };
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#0D0D0D]">
        <Sidebar />
        <main className="flex-1 ml-64">
          <div className="h-1 bg-gradient-to-r from-[#FF4500] to-[#F4A300]" />
          <div className="p-8 text-white">
            <div className="max-w-6xl mx-auto">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-700 rounded w-48 mb-2"></div>
                <div className="h-4 bg-gray-800 rounded w-96 mb-8"></div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 bg-gray-800 rounded-lg"></div>
                  ))}
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
      <Sidebar />

      <main className="flex-1 ml-64">
        {/* Orange accent line */}
        <div className="h-1 bg-gradient-to-r from-[#FF4500] to-[#F4A300]" />

        <div className="p-8 text-white">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <Target className="w-8 h-8 text-[#FF4500]" />
                  Funnel Builder
                </h1>
                <p className="text-gray-400 mt-2">
                  Create complete marketing funnels with landing pages, emails, and social posts
                </p>
              </div>
              <Link
                href="/funnels/create"
                className="flex items-center gap-2 px-5 py-2.5 bg-[#FF4500] hover:bg-[#FF5722] rounded-lg font-medium transition"
              >
                <Plus className="w-5 h-5" />
                Create New Funnel
              </Link>
            </div>

            {/* Funnel List */}
            {funnels.length === 0 ? (
              <div className="text-center py-20 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                  <Target className="w-10 h-10 text-gray-600" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">No funnels yet</h2>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  Create your first funnel to start capturing leads with landing pages, automated emails, and social campaigns.
                </p>
                <Link
                  href="/funnels/create"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF4500] hover:bg-[#FF5722] rounded-lg font-semibold transition"
                >
                  <Zap className="w-5 h-5" />
                  Create Your First Funnel
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {funnels.map((funnel) => {
                  const { emailCount, postCount, durationDays } = getFunnelStats(funnel);
                  const isLoading = actionLoading === funnel.id;
                  const landingPageUrl = `/lp/${funnel.landingPage?.slug}`;

                  return (
                    <div
                      key={funnel.id}
                      className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 hover:border-[#3A3A3A] transition group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          {/* Title row with badges */}
                          <div className="flex items-center gap-3 mb-3 flex-wrap">
                            <Link
                              href={`/funnels/${funnel.id}`}
                              className="text-xl font-semibold hover:text-[#FF4500] transition truncate"
                            >
                              {funnel.name}
                            </Link>
                            {getTypeBadge(funnel.type)}
                            {getStatusBadge(funnel.status)}
                          </div>

                          {/* Landing page URL */}
                          <a
                            href={landingPageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-[#F4A300] hover:text-[#FF4500] transition mb-4"
                          >
                            <ExternalLink className="w-4 h-4" />
                            {landingPageUrl}
                          </a>

                          {/* Stats row */}
                          <div className="flex items-center gap-6 text-sm text-gray-400">
                            <span className="flex items-center gap-1.5">
                              <Mail className="w-4 h-4" />
                              {emailCount} emails
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Share2 className="w-4 h-4" />
                              {postCount} posts
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4" />
                              {durationDays} days
                            </span>
                          </div>

                          {/* Created date */}
                          <div className="text-xs text-gray-500 mt-3">
                            Created {new Date(funnel.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          {/* View/Edit */}
                          <Link
                            href={`/funnels/${funnel.id}`}
                            className="px-4 py-2 text-sm font-medium bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition"
                          >
                            View / Edit
                          </Link>

                          {/* Launch button (if status is "review") */}
                          {funnel.status === "review" && (
                            <button
                              onClick={() => handleLaunch(funnel.id)}
                              disabled={isLoading}
                              className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                            >
                              {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                              Launch
                            </button>
                          )}

                          {/* Pause button (if status is "active") */}
                          {funnel.status === "active" && (
                            <button
                              onClick={() => handlePause(funnel.id)}
                              disabled={isLoading}
                              className="px-4 py-2 text-sm font-medium bg-orange-600 hover:bg-orange-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                            >
                              {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Pause className="w-4 h-4" />
                              )}
                              Pause
                            </button>
                          )}

                          {/* Delete button */}
                          <button
                            onClick={() => handleDelete(funnel.id)}
                            disabled={isLoading}
                            className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition disabled:opacity-50"
                            title="Delete funnel"
                          >
                            {isLoading ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Trash2 className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
