"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  Edit,
  Check,
  X,
  RefreshCw,
  Image as ImageIcon,
  Video,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  AlertCircle,
} from "lucide-react";

interface Post {
  id: string;
  platform: string;
  content: string;
  contentType: string;
  hashtags: string[];
  dayNumber: number;
  scheduledFor: string;
  visualUrl: string | null;
  visualPrompt: string | null;
  visualStatus: string;
  status: string;
}

interface VideoItem {
  id: string;
  title: string;
  videoType: string;
  purpose: string;
  dayNumber: number;
  scheduledFor: string;
  status: string;
  scriptData: {
    hook?: string;
    body?: string;
    cta?: string;
  } | null;
}

interface CampaignData {
  id: string;
  name: string;
  status: string;
  totalPosts: number;
  totalVideos: number;
  productUrl: string | null;
  posts: Post[];
  videos: VideoItem[];
}

interface StepPreviewProps {
  campaignId: string;
  onApprove: () => void;
}

const platformColors: Record<string, string> = {
  twitter: "bg-blue-400/10 text-blue-400 border-blue-400/30",
  facebook: "bg-blue-600/10 text-blue-600 border-blue-600/30",
  instagram: "bg-pink-500/10 text-pink-500 border-pink-500/30",
  youtube: "bg-red-500/10 text-red-500 border-red-500/30",
};

const platformLabels: Record<string, string> = {
  twitter: "Twitter/X",
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
};

export default function StepPreview({ campaignId, onApprove }: StepPreviewProps) {
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [expandedVideos, setExpandedVideos] = useState<Set<string>>(new Set());
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaign();
  }, [campaignId]);

  // Auto-refresh while images are still generating
  useEffect(() => {
    if (!campaign) return;

    const hasGeneratingImages = campaign.posts.some(
      (p) => p.visualStatus === "generating" || p.visualStatus === "pending"
    );

    if (hasGeneratingImages) {
      const interval = setInterval(() => {
        fetchCampaign();
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
  }, [campaign]);

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`);
      const data = await res.json();
      setCampaign(data.campaign);
    } catch (error) {
      console.error("Failed to fetch campaign:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePost = (id: string) => {
    const newExpanded = new Set(expandedPosts);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedPosts(newExpanded);
  };

  const toggleVideo = (id: string) => {
    const newExpanded = new Set(expandedVideos);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedVideos(newExpanded);
  };

  const startEditing = (post: Post) => {
    setEditingPost(post.id);
    setEditContent(post.content);
  };

  const cancelEditing = () => {
    setEditingPost(null);
    setEditContent("");
  };

  const savePost = async (postId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (res.ok) {
        await fetchCampaign();
        setEditingPost(null);
      }
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  const regeneratePost = async (postId: string) => {
    setRegenerating(postId);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/posts/${postId}/regenerate`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchCampaign();
      }
    } catch (error) {
      console.error("Failed to regenerate:", error);
    } finally {
      setRegenerating(null);
    }
  };

  const copyContent = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF4500]" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12 text-gray-400">
        <AlertCircle className="w-12 h-12 mx-auto mb-4" />
        <p>Campaign not found</p>
      </div>
    );
  }

  // Group posts by day
  const postsByDay = campaign.posts.reduce((acc, post) => {
    const day = post.dayNumber;
    if (!acc[day]) acc[day] = [];
    acc[day].push(post);
    return acc;
  }, {} as Record<number, Post[]>);

  // Filter posts
  const filteredPosts = filter === "all"
    ? campaign.posts
    : campaign.posts.filter(p => p.platform === filter);

  // Get unique platforms
  const platforms = [...new Set(campaign.posts.map(p => p.platform))];

  // Check image generation status
  const generatingCount = campaign.posts.filter(
    (p) => p.visualStatus === "generating" || p.visualStatus === "pending"
  ).length;
  const readyCount = campaign.posts.filter((p) => p.visualUrl).length;
  const errorCount = campaign.posts.filter((p) => p.visualStatus === "error").length;

  return (
    <div className="space-y-6">
      {/* Image Generation Status Banner */}
      {generatingCount > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-yellow-400" />
          <div>
            <div className="text-yellow-300 font-medium">
              Generating images... ({readyCount}/{campaign.posts.length} complete)
            </div>
            <div className="text-yellow-400/70 text-sm">
              Images will appear automatically as they&apos;re generated
            </div>
          </div>
        </div>
      )}

      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-4">
          <div className="text-sm text-gray-400">Total Posts</div>
          <div className="text-2xl font-bold text-[#FF4500]">{campaign.totalPosts}</div>
        </div>
        <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-4">
          <div className="text-sm text-gray-400">Videos</div>
          <div className="text-2xl font-bold text-red-400">{campaign.totalVideos}</div>
        </div>
        <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-4">
          <div className="text-sm text-gray-400">With Images</div>
          <div className="text-2xl font-bold text-green-400">
            {campaign.posts.filter(p => p.visualUrl).length}
          </div>
        </div>
        <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-4">
          <div className="text-sm text-gray-400">Platforms</div>
          <div className="text-2xl font-bold">{platforms.length}</div>
        </div>
      </div>

      {/* Landing Page Link */}
      {campaign.productUrl && (
        <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-400">Landing Page</div>
            <div className="text-sm text-gray-300 truncate max-w-md">{campaign.productUrl}</div>
          </div>
          <a
            href={campaign.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-[#FF4500] hover:bg-[#FF5722] rounded-lg transition"
          >
            <ExternalLink className="w-4 h-4" />
            View
          </a>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Filter:</span>
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-sm transition ${
            filter === "all"
              ? "bg-[#FF4500] text-white"
              : "bg-[#1A1A1A] text-gray-400 hover:text-white"
          }`}
        >
          All ({campaign.posts.length})
        </button>
        {platforms.map(platform => (
          <button
            key={platform}
            onClick={() => setFilter(platform)}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${
              filter === platform
                ? "bg-[#FF4500] text-white"
                : "bg-[#1A1A1A] text-gray-400 hover:text-white"
            }`}
          >
            {platformLabels[platform]} ({campaign.posts.filter(p => p.platform === platform).length})
          </button>
        ))}
      </div>

      {/* Posts Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-[#FF4500]" />
          Social Posts
        </h3>

        <div className="grid gap-4">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className={`bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] overflow-hidden ${
                expandedPosts.has(post.id) ? "" : ""
              }`}
            >
              {/* Post Header */}
              <div
                onClick={() => togglePost(post.id)}
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-[#252525] transition"
              >
                {/* Thumbnail */}
                {post.visualUrl ? (
                  <img
                    src={post.visualUrl}
                    alt=""
                    className="w-12 h-12 rounded object-cover flex-shrink-0 border border-[#2A2A2A]"
                  />
                ) : post.visualStatus === "generating" ? (
                  <div className="w-12 h-12 rounded bg-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-5 h-5 animate-spin text-yellow-400" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded bg-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-5 h-5 text-gray-600" />
                  </div>
                )}

                {/* Platform Badge */}
                <span className={`px-2 py-1 rounded text-xs font-medium border ${platformColors[post.platform]}`}>
                  {platformLabels[post.platform]}
                </span>

                {/* Day & Date */}
                <div className="text-sm">
                  <span className="text-gray-400">Day {post.dayNumber}</span>
                  <span className="text-gray-600 mx-2">•</span>
                  <span className="text-gray-500">
                    {new Date(post.scheduledFor).toLocaleDateString()}
                  </span>
                </div>

                {/* Content Preview */}
                <div className="flex-1 text-sm text-gray-300 truncate">
                  {post.content.substring(0, 80)}...
                </div>

                {/* Status Indicator */}
                {post.visualUrl && (
                  <span className="text-green-400 text-xs flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    Ready
                  </span>
                )}
                {post.visualStatus === "generating" && (
                  <span className="text-yellow-400 text-xs flex items-center gap-1">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating
                  </span>
                )}
                {post.visualStatus === "error" && (
                  <span className="text-red-400 text-xs flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Error
                  </span>
                )}

                {/* Expand Arrow */}
                {expandedPosts.has(post.id) ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>

              {/* Expanded Content */}
              {expandedPosts.has(post.id) && (
                <div className="border-t border-[#2A2A2A] p-4 space-y-4">
                  <div className="flex gap-4">
                    {/* Image Preview */}
                    {post.visualUrl && (
                      <div className="w-48 flex-shrink-0">
                        <img
                          src={post.visualUrl}
                          alt="Post visual"
                          className="w-full h-auto rounded-lg border border-[#2A2A2A]"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 space-y-3">
                      {editingPost === post.id ? (
                        <>
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={4}
                            className="w-full p-3 bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg text-white resize-none focus:border-[#FF4500] outline-none"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => savePost(post.id)}
                              disabled={saving}
                              className="flex items-center gap-2 px-3 py-2 bg-[#FF4500] hover:bg-[#FF5722] rounded-lg text-sm transition disabled:opacity-50"
                            >
                              {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                              Save
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="flex items-center gap-2 px-3 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg text-sm transition"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-gray-200 whitespace-pre-wrap">{post.content}</p>

                          {/* Hashtags */}
                          {post.hashtags && post.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {post.hashtags.map((tag, i) => (
                                <span key={i} className="text-xs text-blue-400">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-2">
                            <button
                              onClick={() => startEditing(post)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded text-sm transition"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => regeneratePost(post.id)}
                              disabled={regenerating === post.id}
                              className="flex items-center gap-1 px-3 py-1.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded text-sm transition disabled:opacity-50"
                            >
                              {regenerating === post.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                              Regenerate
                            </button>
                            <button
                              onClick={() => copyContent(post.content, post.id)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded text-sm transition"
                            >
                              <Copy className="w-4 h-4" />
                              {copied === post.id ? "Copied!" : "Copy"}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Visual Prompt */}
                  {post.visualPrompt && (
                    <div className="mt-3 p-3 bg-[#0D0D0D] rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Image Prompt:</div>
                      <div className="text-xs text-gray-400">{post.visualPrompt}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Videos Section */}
      {campaign.videos.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-[#2A2A2A]">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Video className="w-5 h-5 text-red-400" />
            Videos ({campaign.videos.length})
          </h3>

          <div className="grid gap-4">
            {campaign.videos.map((video) => (
              <div
                key={video.id}
                className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] overflow-hidden"
              >
                {/* Video Header */}
                <div
                  onClick={() => toggleVideo(video.id)}
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-[#252525] transition"
                >
                  <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30">
                    {video.videoType === "short" ? "YT Short" : "YouTube"}
                  </span>

                  <div className="text-sm">
                    <span className="text-gray-400">Day {video.dayNumber}</span>
                  </div>

                  <div className="flex-1 text-sm text-gray-300 truncate">
                    {video.title}
                  </div>

                  <span className="text-xs text-gray-500">{video.purpose}</span>

                  {expandedVideos.has(video.id) ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                {/* Expanded Script */}
                {expandedVideos.has(video.id) && video.scriptData && (
                  <div className="border-t border-[#2A2A2A] p-4 space-y-3">
                    {video.scriptData.hook && (
                      <div className="bg-[#0D0D0D] rounded-lg border border-[#2A2A2A] overflow-hidden">
                        <div className="px-3 py-2 bg-red-900/20 border-b border-[#2A2A2A]">
                          <span className="text-xs font-medium text-red-400 uppercase tracking-wide">
                            Hook (First 3 Seconds)
                          </span>
                        </div>
                        <div className="p-3 text-sm text-gray-200">
                          {video.scriptData.hook}
                        </div>
                      </div>
                    )}

                    {video.scriptData.body && (
                      <div className="bg-[#0D0D0D] rounded-lg border border-[#2A2A2A] overflow-hidden">
                        <div className="px-3 py-2 bg-blue-900/20 border-b border-[#2A2A2A]">
                          <span className="text-xs font-medium text-blue-400 uppercase tracking-wide">
                            Body
                          </span>
                        </div>
                        <div className="p-3 text-sm text-gray-200 whitespace-pre-wrap">
                          {video.scriptData.body}
                        </div>
                      </div>
                    )}

                    {video.scriptData.cta && (
                      <div className="bg-[#0D0D0D] rounded-lg border border-[#2A2A2A] overflow-hidden">
                        <div className="px-3 py-2 bg-green-900/20 border-b border-[#2A2A2A]">
                          <span className="text-xs font-medium text-green-400 uppercase tracking-wide">
                            Call to Action
                          </span>
                        </div>
                        <div className="p-3 text-sm text-gray-200">
                          {video.scriptData.cta}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approve Button */}
      <div className="pt-6 border-t border-[#2A2A2A]">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Review all content above, then approve to proceed.
          </div>
          <button
            onClick={onApprove}
            className="flex items-center gap-2 px-6 py-3 bg-[#FF4500] hover:bg-[#FF5722] rounded-lg font-semibold transition"
          >
            <Check className="w-5 h-5" />
            Approve & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
