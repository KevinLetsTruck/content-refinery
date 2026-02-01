"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Play,
  Pause,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Rocket,
  Edit,
  Mail,
  Upload,
  ExternalLink,
} from "lucide-react";

interface EmailDetail {
  id: string;
  order: number;
  subject: string;
  preheader: string | null;
  purpose: string;
  sendDelayDays: number;
  ccCampaignId: string | null;
  status: string;
}

interface EmailSequenceDetail {
  id: string;
  name: string;
  status: string;
  sequenceLength: number;
  emails: EmailDetail[];
}

interface CampaignDetail {
  id: string;
  name: string;
  description: string | null;
  campaignType: string;
  goal: string;
  productName: string | null;
  productUrl: string | null;
  status: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  platforms: string[];
  totalPosts: number;
  publishedPosts: number;
  totalVideos: number;
  publishedVideos: number;
  launchedAt: string | null;
  phases: Array<{
    id: string;
    name: string;
    purpose: string;
    startDay: number;
    endDay: number;
  }>;
  posts: Array<{
    id: string;
    platform: string;
    content: string;
    status: string;
    dayNumber: number;
    scheduledFor: string;
  }>;
  emailSequence: EmailSequenceDetail | null;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    summary?: { created: number; updated: number; skipped: number; failed: number };
    error?: string;
  } | null>(null);
  const [landingPageLoading, setLandingPageLoading] = useState(false);
  const [landingPageError, setLandingPageError] = useState<string | null>(null);
  const [ctaUrlLoading, setCtaUrlLoading] = useState(false);
  const [ctaUrlResult, setCtaUrlResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    fetchCampaign();
  }, [params.id]);

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/campaigns/${params.id}`);
      const data = await res.json();
      setCampaign(data.campaign);
    } catch (error) {
      console.error("Failed to fetch campaign:", error);
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (action: string) => {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/campaigns/${params.id}/${action}`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.success || data.error === undefined) {
        await fetchCampaign();
      } else {
        alert(data.error || `Failed to ${action}`);
      }
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const generateLandingPage = async () => {
    setLandingPageLoading(true);
    setLandingPageError(null);

    try {
      const res = await fetch(`/api/campaigns/${params.id}/regenerate-landing-page`, {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok && data.success) {
        await fetchCampaign();
      } else {
        setLandingPageError(data.error || "Failed to generate landing page");
      }
    } catch (error) {
      console.error("Failed to generate landing page:", error);
      setLandingPageError("Network error - please try again");
    } finally {
      setLandingPageLoading(false);
    }
  };

  const addCtaUrlToPosts = async () => {
    if (!campaign?.productUrl) return;

    setCtaUrlLoading(true);
    setCtaUrlResult(null);

    try {
      const res = await fetch(`/api/campaigns/${params.id}/add-cta-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ctaUrl: campaign.productUrl }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setCtaUrlResult({
          success: true,
          message: data.message,
        });
        await fetchCampaign();
      } else {
        setCtaUrlResult({
          success: false,
          error: data.error || "Failed to add URL to posts",
        });
      }
    } catch (error) {
      console.error("Failed to add CTA URL:", error);
      setCtaUrlResult({
        success: false,
        error: "Network error - please try again",
      });
    } finally {
      setCtaUrlLoading(false);
    }
  };

  const syncEmailsToCC = async (overwrite = false) => {
    if (!campaign?.emailSequence) return;

    setSyncLoading(true);
    setSyncResult(null);

    try {
      const res = await fetch(`/api/email-sequences/${campaign.emailSequence.id}/sync-to-cc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overwrite }),
      });

      const data = await res.json();

      if (res.ok) {
        setSyncResult({
          success: data.success,
          summary: data.summary,
        });
        // Refresh campaign to get updated ccCampaignId values
        await fetchCampaign();
      } else {
        setSyncResult({
          success: false,
          error: data.error || "Sync failed",
        });
      }
    } catch (error) {
      console.error("Failed to sync to CC:", error);
      setSyncResult({
        success: false,
        error: "Network error - please try again",
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: React.ElementType; label: string }> = {
      draft: { color: "bg-gray-600", icon: Clock, label: "Draft" },
      generating: { color: "bg-yellow-600", icon: Clock, label: "Generating..." },
      review: { color: "bg-blue-600", icon: AlertCircle, label: "Ready for Review" },
      approved: { color: "bg-purple-600", icon: CheckCircle, label: "Approved" },
      active: { color: "bg-green-600", icon: Play, label: "Active" },
      paused: { color: "bg-orange-600", icon: Pause, label: "Paused" },
      completed: { color: "bg-gray-500", icon: CheckCircle, label: "Completed" },
    };
    
    const badge = badges[status] || badges.draft;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${badge.color}`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-64 mb-8"></div>
            <div className="space-y-4">
              <div className="h-24 bg-gray-800 rounded"></div>
              <div className="h-48 bg-gray-800 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white p-8 text-center">
        <p>Campaign not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/campaigns"
            className="p-2 hover:bg-[#1A1A1A] rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              {getStatusBadge(campaign.status)}
            </div>
            <p className="text-gray-400 mt-1">
              {campaign.campaignType.replace("_", " ")} • {campaign.goal.replace("_", " ")}
            </p>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link
              href={`/campaigns/${params.id}/calendar`}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-lg transition"
            >
              <Calendar className="w-5 h-5" />
              Calendar
            </Link>

            {campaign.status === "review" && (
              <button
                onClick={() => performAction("schedule")}
                disabled={actionLoading === "schedule"}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition disabled:opacity-50"
              >
                {actionLoading === "schedule" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
                Schedule
              </button>
            )}

            {campaign.status === "approved" && (
              <button
                onClick={() => performAction("launch")}
                disabled={actionLoading === "launch"}
                className="flex items-center gap-2 px-4 py-2 bg-[#FF4500] hover:bg-[#FF5722] rounded-lg transition disabled:opacity-50"
              >
                {actionLoading === "launch" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Rocket className="w-5 h-5" />
                )}
                Launch
              </button>
            )}

            {campaign.status === "active" && (
              <button
                onClick={() => performAction("pause")}
                disabled={actionLoading === "pause"}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition disabled:opacity-50"
              >
                {actionLoading === "pause" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Pause className="w-5 h-5" />
                )}
                Pause
              </button>
            )}

            {campaign.status === "paused" && (
              <button
                onClick={() => performAction("resume")}
                disabled={actionLoading === "resume"}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50"
              >
                {actionLoading === "resume" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
                Resume
              </button>
            )}

            <button
              onClick={fetchCampaign}
              className="p-2 hover:bg-[#1A1A1A] rounded-lg transition"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-4">
            <div className="text-sm text-gray-400">Duration</div>
            <div className="text-2xl font-bold">{campaign.durationDays} days</div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
            </div>
          </div>
          <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-4">
            <div className="text-sm text-gray-400">Posts</div>
            <div className="text-2xl font-bold">
              {campaign.publishedPosts} / {campaign.totalPosts}
            </div>
            <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-[#FF4500]"
                style={{
                  width: campaign.totalPosts > 0 
                    ? `${(campaign.publishedPosts / campaign.totalPosts) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </div>
          <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-4">
            <div className="text-sm text-gray-400">Videos</div>
            <div className="text-2xl font-bold">
              {campaign.publishedVideos} / {campaign.totalVideos}
            </div>
            <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-red-500"
                style={{
                  width: campaign.totalVideos > 0
                    ? `${(campaign.publishedVideos / campaign.totalVideos) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </div>
          <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-4">
            <div className="text-sm text-gray-400">Platforms</div>
            <div className="text-2xl font-bold">{campaign.platforms.length}</div>
            <div className="text-xs text-gray-500 mt-1 capitalize">
              {campaign.platforms.join(", ")}
            </div>
          </div>
        </div>

        {/* Landing Page */}
        <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-6 mb-8">
          {campaign.productUrl ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Landing Page</h2>
                  <p className="text-sm text-gray-400">
                    {campaign.productName || "Lead Magnet Landing Page"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={generateLandingPage}
                    disabled={landingPageLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition disabled:opacity-50"
                    title="Regenerate landing page"
                  >
                    {landingPageLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Regenerate
                  </button>
                  <a
                    href={campaign.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-[#FF4500] hover:bg-[#FF5722] rounded-lg transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Landing Page
                  </a>
                </div>
              </div>
              <div className="mt-3 p-3 bg-[#0D0D0D] rounded-lg flex items-center justify-between">
                <code className="text-sm text-gray-400 break-all">{campaign.productUrl}</code>
                <button
                  onClick={addCtaUrlToPosts}
                  disabled={ctaUrlLoading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-sm transition disabled:opacity-50 ml-4 whitespace-nowrap"
                  title="Add this URL to all posts that have CTA language"
                >
                  {ctaUrlLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Edit className="w-4 h-4" />
                  )}
                  Add URL to Posts
                </button>
              </div>
              {ctaUrlResult && (
                <div
                  className={`mt-3 p-3 rounded-lg text-sm ${
                    ctaUrlResult.success
                      ? "bg-green-500/10 border border-green-500/30 text-green-400"
                      : "bg-red-500/10 border border-red-500/30 text-red-400"
                  }`}
                >
                  {ctaUrlResult.success ? ctaUrlResult.message : ctaUrlResult.error}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Landing Page</h2>
                  <p className="text-sm text-gray-400">
                    No landing page generated yet for this campaign
                  </p>
                </div>
                <button
                  onClick={generateLandingPage}
                  disabled={landingPageLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FF4500] hover:bg-[#FF5722] rounded-lg transition disabled:opacity-50"
                >
                  {landingPageLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  {landingPageLoading ? "Generating..." : "Generate Landing Page"}
                </button>
              </div>
              {landingPageError && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                  {landingPageError}
                </div>
              )}
            </>
          )}
        </div>

        {/* Phases */}
        <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Campaign Phases</h2>
          <div className="space-y-3">
            {campaign.phases.map((phase, i) => (
              <div
                key={phase.id}
                className="flex items-center gap-4 p-3 bg-[#0D0D0D] rounded-lg"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    ["bg-purple-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-orange-500", "bg-red-500"][i % 6]
                  }`}
                >
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{phase.name}</div>
                  <div className="text-sm text-gray-400">{phase.purpose}</div>
                </div>
                <div className="text-sm text-gray-500">
                  Days {phase.startDay}-{phase.endDay}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Email Sequence Section */}
        {campaign.emailSequence && (
          <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#FF4500]" />
                <h2 className="text-lg font-semibold">Email Nurture Sequence</h2>
                <span className="px-2 py-0.5 bg-[#2A2A2A] text-gray-400 text-xs rounded">
                  {campaign.emailSequence.emails.length} emails
                </span>
              </div>
              <div className="flex items-center gap-2">
                {campaign.emailSequence.emails.some(e => e.ccCampaignId) && (
                  <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
                    Synced to CC
                  </span>
                )}
                <button
                  onClick={() => syncEmailsToCC(false)}
                  disabled={syncLoading}
                  className="flex items-center gap-2 px-3 py-2 bg-[#FF4500] hover:bg-[#FF5722] rounded-lg text-sm transition disabled:opacity-50"
                >
                  {syncLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Sync to Constant Contact
                </button>
              </div>
            </div>

            {/* Sync Result Message */}
            {syncResult && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm ${
                  syncResult.success
                    ? "bg-green-500/10 border border-green-500/30 text-green-400"
                    : "bg-red-500/10 border border-red-500/30 text-red-400"
                }`}
              >
                {syncResult.success ? (
                  <>
                    Successfully synced to Constant Contact!
                    {syncResult.summary && (
                      <span className="ml-2 text-gray-400">
                        ({syncResult.summary.created} created, {syncResult.summary.skipped} skipped)
                      </span>
                    )}
                  </>
                ) : (
                  syncResult.error
                )}
              </div>
            )}

            {/* Email List */}
            <div className="space-y-3">
              {campaign.emailSequence.emails.map((email) => (
                <div
                  key={email.id}
                  className="flex items-center gap-4 p-3 bg-[#0D0D0D] rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-[#FF4500]/20 text-[#FF4500] flex items-center justify-center text-sm font-bold">
                    {email.order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{email.subject}</div>
                    <div className="text-sm text-gray-400">
                      Day {email.sendDelayDays} • {email.purpose.replace("_", " ")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {email.ccCampaignId ? (
                      <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
                        <CheckCircle className="w-3 h-3" />
                        CC
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 bg-[#2A2A2A] px-2 py-1 rounded">
                        Draft
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Resync Option */}
            {campaign.emailSequence.emails.some(e => e.ccCampaignId) && (
              <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
                <button
                  onClick={() => syncEmailsToCC(true)}
                  disabled={syncLoading}
                  className="text-sm text-gray-400 hover:text-white transition"
                >
                  Overwrite existing campaigns in CC
                </button>
              </div>
            )}
          </div>
        )}

        {/* Recent Posts Preview */}
        <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Content Preview</h2>
            <Link
              href={`/campaigns/${params.id}/calendar`}
              className="text-sm text-[#FF4500] hover:underline"
            >
              View All in Calendar →
            </Link>
          </div>

          <div className="space-y-3">
            {campaign.posts.slice(0, 5).map((post) => (
              <div
                key={post.id}
                className="flex items-start gap-3 p-3 bg-[#0D0D0D] rounded-lg"
              >
                <div
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    post.platform === "twitter"
                      ? "bg-blue-400/20 text-blue-400"
                      : post.platform === "facebook"
                      ? "bg-blue-600/20 text-blue-600"
                      : "bg-pink-500/20 text-pink-500"
                  }`}
                >
                  {post.platform.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 line-clamp-2">{post.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Day {post.dayNumber} • {new Date(post.scheduledFor).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {post.status === "published" ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : post.status === "failed" ? (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-gray-500" />
                  )}
                </div>
              </div>
            ))}
            
            {campaign.posts.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No posts generated yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}




