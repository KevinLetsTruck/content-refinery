"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/navigation/Sidebar";
import {
  Check,
  X,
  Edit3,
  RefreshCw,
  Twitter,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Send,
  Loader2,
  ExternalLink,
  AlertCircle,
  ImageIcon,
} from "lucide-react";

interface QueueItem {
  id: string;
  platform: string;
  text: string;
  hashtags: string[];
  status: string;
  created_at: string;
  extraction_type?: string;
  extraction_text?: string;
  confidence?: number;
  source_title?: string;
  platformPostUrl?: string;
  mediaUrl?: string;
}

interface PlatformStatus {
  configured: boolean;
  name: string;
}

const platformIcons: Record<string, React.ReactNode> = {
  twitter: <Twitter className="h-4 w-4" />,
  instagram: <Instagram className="h-4 w-4" />,
  facebook: <Facebook className="h-4 w-4" />,
  linkedin: <Linkedin className="h-4 w-4" />,
  youtube: <Youtube className="h-4 w-4" />,
  tiktok: <span className="text-xs font-bold">TT</span>,
};

const platformColors: Record<string, string> = {
  twitter: "bg-sky-500",
  instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
  facebook: "bg-blue-600",
  linkedin: "bg-blue-700",
  youtube: "bg-red-600",
  tiktok: "bg-white text-black",
};

export default function QueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [publishingPlatforms, setPublishingPlatforms] = useState<Record<string, PlatformStatus>>({});
  const [publishResult, setPublishResult] = useState<{ id: string; success: boolean; url?: string; error?: string } | null>(null);

  useEffect(() => {
    fetchQueue();
    fetchPublishingStatus();
  }, [statusFilter]);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/queue?status=${statusFilter}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error("Failed to fetch queue:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPublishingStatus = async () => {
    try {
      const response = await fetch("/api/publish");
      if (response.ok) {
        const data = await response.json();
        setPublishingPlatforms(data.platforms);
      }
    } catch (error) {
      console.error("Failed to fetch publishing status:", error);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/queue/${id}/approve`, {
        method: "POST",
      });
      if (response.ok) {
        setItems(items.map((item) => 
          item.id === id ? { ...item, status: "approved" } : item
        ));
        if (statusFilter === "pending") {
          setItems(items.filter((item) => item.id !== id));
        }
      }
    } catch (error) {
      console.error("Failed to approve:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/queue/${id}/reject`, {
        method: "POST",
      });
      if (response.ok) {
        setItems(items.filter((item) => item.id !== id));
      }
    } catch (error) {
      console.error("Failed to reject:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublish = async (id: string, immediate: boolean = true) => {
    setActionLoading(id);
    setPublishResult(null);
    try {
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: id, immediate }),
      });
      const data = await response.json();
      
      if (response.ok) {
        setPublishResult({ id, success: true, url: data.postUrl });
        setItems(items.map((item) => 
          item.id === id 
            ? { ...item, status: "published", platformPostUrl: data.postUrl } 
            : item
        ));
      } else {
        setPublishResult({ id, success: false, error: data.error });
      }
    } catch (error) {
      setPublishResult({ id, success: false, error: "Publishing failed" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveAndPublish = async (id: string) => {
    setActionLoading(id);
    try {
      const approveResponse = await fetch(`/api/queue/${id}/approve`, {
        method: "POST",
      });
      
      if (approveResponse.ok) {
        await handlePublish(id, true);
      }
    } catch (error) {
      console.error("Failed to approve and publish:", error);
    }
  };

  const handleEdit = (item: QueueItem) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  const handleSaveEdit = async (id: string) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editText }),
      });
      if (response.ok) {
        setItems(
          items.map((item) =>
            item.id === id ? { ...item, text: editText } : item
          )
        );
        setEditingId(null);
        setEditText("");
      }
    } catch (error) {
      console.error("Failed to save edit:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegenerate = async (id: string) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/queue/${id}/regenerate`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setItems(
          items.map((item) =>
            item.id === id ? { ...item, text: data.text } : item
          )
        );
      }
    } catch (error) {
      console.error("Failed to regenerate:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredItems =
    filter === "all"
      ? items
      : items.filter((item) => item.platform === filter);

  const platformCounts = items.reduce(
    (acc, item) => {
      acc[item.platform] = (acc[item.platform] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const isPlatformConfigured = (platform: string) => {
    return publishingPlatforms[platform]?.configured || false;
  };

  return (
    <div className="flex min-h-screen bg-[#0D0D0D]">
      <Sidebar />

      <main className="flex-1 ml-64">
        {/* Orange accent line */}
        <div className="h-1 bg-gradient-to-r from-[#FF4500] to-[#F4A300]" />
      
        {/* Header */}
        <header className="border-b border-[#333333] sticky top-0 bg-[#0D0D0D] z-10">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Review Queue</h1>
              <p className="text-sm text-[#888888]">
                {items.length} items {statusFilter === "pending" ? "waiting for review" : statusFilter}
              </p>
            </div>

            <button
              onClick={fetchQueue}
              className="flex items-center gap-2 px-3 py-1.5 border border-[#333333] rounded hover:border-[#444444] hover:bg-[#1A1A1A] text-white transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

        {/* Status Tabs */}
        <div className="px-8 pb-2">
          <div className="flex gap-4 border-b border-[#333333]">
            {["pending", "approved", "published"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                  statusFilter === status
                    ? "border-[#FF4500] text-[#FF4500]"
                    : "border-transparent text-[#888888] hover:text-white"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Platform Filters */}
        <div className="px-8 py-3">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded text-sm whitespace-nowrap transition-colors ${
                filter === "all"
                  ? "bg-[#FF4500] text-white"
                  : "bg-[#1A1A1A] text-[#888888] hover:text-white hover:bg-[#333333]"
              }`}
            >
              All ({items.length})
            </button>
            {Object.entries(platformCounts).map(([platform, count]) => (
              <button
                key={platform}
                onClick={() => setFilter(platform)}
                className={`px-3 py-1.5 rounded text-sm whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                  filter === platform
                    ? "bg-[#FF4500] text-white"
                    : "bg-[#1A1A1A] text-[#888888] hover:text-white hover:bg-[#333333]"
                }`}
              >
                {platformIcons[platform]}
                {platform} ({count})
                {!isPlatformConfigured(platform) && (
                  <span className="text-[#F4A300] ml-1" title="Not configured">⚠</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="px-8 py-6">
        {/* Publishing Status Banner */}
        {statusFilter === "approved" && (
          <div className="mb-4 p-4 bg-[#1A1A1A] border border-[#333333] rounded-lg">
            <h3 className="font-medium text-white mb-2">Publishing Status</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(publishingPlatforms).map(([platform, status]) => (
                <div key={platform} className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${status.configured ? "bg-[#22C55E]" : "bg-[#F4A300]"}`} />
                  <span className="capitalize text-white">{platform}</span>
                  {!status.configured && (
                    <span className="text-[#888888]">(not configured)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Publish Result Toast */}
        {publishResult && (
          <div className={`mb-4 p-4 rounded-lg flex items-center justify-between ${
            publishResult.success 
              ? "bg-[#22C55E]/20 border border-[#22C55E]/50" 
              : "bg-red-500/20 border border-red-500/50"
          }`}>
            <div className="flex items-center gap-2">
              {publishResult.success ? (
                <>
                  <Check className="h-5 w-5 text-[#22C55E]" />
                  <span className="text-[#22C55E]">Published successfully!</span>
                  {publishResult.url && (
                    <a 
                      href={publishResult.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#FF4500] hover:underline flex items-center gap-1"
                    >
                      View post <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <span className="text-red-400">{publishResult.error}</span>
                </>
              )}
            </div>
            <button 
              onClick={() => setPublishResult(null)}
              className="text-[#888888] hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF4500]" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1A1A1A] border border-[#333333] flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-[#888888]" />
            </div>
            <p className="text-[#888888] mb-4">
              {items.length === 0
                ? `No ${statusFilter} content`
                : "No content for this filter"}
            </p>
            {statusFilter === "pending" && (
              <Link
                href="/ingest"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FF4500] to-[#CC3700] hover:from-[#FF6633] hover:to-[#FF4500] text-white px-4 py-2 rounded font-semibold transition-all"
              >
                Upload content →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-[#1A1A1A] border border-[#333333] rounded-lg overflow-hidden hover:border-[#444444] transition-colors"
              >
                {/* Header */}
                <div className="px-4 py-3 border-b border-[#333333] bg-[#0D0D0D]/50 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div
                      className={`p-1.5 rounded text-white ${
                        platformColors[item.platform]
                      }`}
                    >
                      {platformIcons[item.platform]}
                    </div>
                    <div>
                      <span className="font-medium capitalize text-white">
                        {item.platform}
                      </span>
                      {item.source_title && (
                        <span className="text-[#888888] text-sm ml-2">
                          from {item.source_title}
                        </span>
                      )}
                    </div>
                    {item.extraction_type && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          item.extraction_type === "quote"
                            ? "bg-blue-500/20 text-blue-400"
                            : item.extraction_type === "stat"
                            ? "bg-[#22C55E]/20 text-[#22C55E]"
                            : item.extraction_type === "hot_take"
                            ? "bg-[#FF4500]/20 text-[#FF4500]"
                            : "bg-[#333333] text-[#888888]"
                        }`}
                      >
                        {item.extraction_type}
                      </span>
                    )}
                    {/* Status badge */}
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        item.status === "published"
                          ? "bg-[#22C55E]/20 text-[#22C55E]"
                          : item.status === "approved"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-[#333333] text-[#888888]"
                      }`}
                    >
                      {item.status}
                    </span>
                    {/* Visual indicator */}
                    {item.mediaUrl && (
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" />
                        Visual
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {item.platformPostUrl && (
                      <a 
                        href={item.platformPostUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[#FF4500] hover:underline text-sm flex items-center gap-1"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <span className="text-xs text-[#888888]">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Visual Preview */}
                  {item.mediaUrl && (
                    <div className="mb-4">
                      <a 
                        href={item.mediaUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img 
                          src={item.mediaUrl} 
                          alt="Generated visual" 
                          className="w-full max-w-md rounded border border-[#333333] hover:border-[#FF4500] transition-colors"
                        />
                      </a>
                      <p className="text-xs text-[#888888] mt-1">
                        Click to view full visual
                      </p>
                    </div>
                  )}

                  {editingId === item.id ? (
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full p-3 border border-[#333333] rounded bg-[#0D0D0D] text-white resize-none focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]"
                      rows={4}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap text-white">{item.text}</p>
                  )}

                  {item.hashtags && item.hashtags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {item.hashtags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-xs text-[#FF4500]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Character count for Twitter */}
                  {item.platform === "twitter" && (
                    <p
                      className={`text-xs mt-2 ${
                        item.text.length > 280
                          ? "text-red-400"
                          : "text-[#888888]"
                      }`}
                    >
                      {item.text.length}/280 characters
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="px-4 py-3 border-t border-[#333333] bg-[#0D0D0D]/50 flex items-center justify-between">
                  <div className="flex gap-2">
                    {editingId === item.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(item.id)}
                          disabled={actionLoading === item.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#FF4500] to-[#CC3700] text-white rounded text-sm hover:from-[#FF6633] hover:to-[#FF4500] disabled:opacity-50 transition-all"
                        >
                          {actionLoading === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditText("");
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-[#333333] text-white rounded text-sm hover:bg-[#1A1A1A] transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : item.status !== "published" ? (
                      <>
                        <button
                          onClick={() => handleEdit(item)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-[#333333] text-white rounded text-sm hover:bg-[#1A1A1A] transition-colors"
                        >
                          <Edit3 className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleRegenerate(item.id)}
                          disabled={actionLoading === item.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-[#333333] text-white rounded text-sm hover:bg-[#1A1A1A] disabled:opacity-50 transition-colors"
                        >
                          {actionLoading === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          Regenerate
                        </button>
                      </>
                    ) : null}
                  </div>

                  {editingId !== item.id && item.status !== "published" && (
                    <div className="flex gap-2">
                      {item.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleReject(item.id)}
                            disabled={actionLoading === item.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-red-500 text-red-400 rounded text-sm hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                          >
                            <X className="h-4 w-4" />
                            Kill
                          </button>
                          <button
                            onClick={() => handleApprove(item.id)}
                            disabled={actionLoading === item.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#22C55E] text-white rounded text-sm hover:bg-[#22C55E]/80 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                            Approve
                          </button>
                          {isPlatformConfigured(item.platform) && (
                            <button
                              onClick={() => handleApproveAndPublish(item.id)}
                              disabled={actionLoading === item.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#FF4500] to-[#CC3700] text-white rounded text-sm hover:from-[#FF6633] hover:to-[#FF4500] disabled:opacity-50 transition-all"
                            >
                              {actionLoading === item.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                              Approve & Publish
                            </button>
                          )}
                        </>
                      )}
                      
                      {item.status === "approved" && (
                        <>
                          {isPlatformConfigured(item.platform) ? (
                            <button
                              onClick={() => handlePublish(item.id)}
                              disabled={actionLoading === item.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#FF4500] to-[#CC3700] text-white rounded text-sm hover:from-[#FF6633] hover:to-[#FF4500] disabled:opacity-50 transition-all"
                            >
                              {actionLoading === item.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                              Publish Now
                            </button>
                          ) : (
                            <span className="text-sm text-[#888888] flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {item.platform} not configured
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </main>
    </div>
  );
}
