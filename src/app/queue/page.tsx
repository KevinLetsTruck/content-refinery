"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
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
  tiktok: "bg-black",
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
        // Update item status locally instead of removing
        setItems(items.map((item) => 
          item.id === id ? { ...item, status: "approved" } : item
        ));
        // If showing pending, remove from view
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
        // Update item with published URL
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
      // First approve
      const approveResponse = await fetch(`/api/queue/${id}/approve`, {
        method: "POST",
      });
      
      if (approveResponse.ok) {
        // Then publish
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Review Queue</h1>
              <p className="text-sm text-muted-foreground">
                {items.length} items {statusFilter === "pending" ? "waiting for review" : statusFilter}
              </p>
            </div>
          </div>

          <button
            onClick={fetchQueue}
            className="flex items-center gap-2 px-3 py-1.5 border rounded-lg hover:bg-accent"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Status Tabs */}
        <div className="container mx-auto px-4 pb-2">
          <div className="flex gap-4 border-b">
            {["pending", "approved", "published"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                  statusFilter === status
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Platform Filters */}
        <div className="container mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                filter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              All ({items.length})
            </button>
            {Object.entries(platformCounts).map(([platform, count]) => (
              <button
                key={platform}
                onClick={() => setFilter(platform)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap flex items-center gap-1.5 ${
                  filter === platform
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {platformIcons[platform]}
                {platform} ({count})
                {!isPlatformConfigured(platform) && (
                  <span className="text-amber-500 ml-1" title="Not configured">⚠</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Publishing Status Banner */}
        {statusFilter === "approved" && (
          <div className="mb-4 p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-2">Publishing Status</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(publishingPlatforms).map(([platform, status]) => (
                <div key={platform} className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${status.configured ? "bg-green-500" : "bg-amber-500"}`} />
                  <span className="capitalize">{platform}</span>
                  {!status.configured && (
                    <span className="text-muted-foreground">(not configured)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Publish Result Toast */}
        {publishResult && (
          <div className={`mb-4 p-4 rounded-lg flex items-center justify-between ${
            publishResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
          }`}>
            <div className="flex items-center gap-2">
              {publishResult.success ? (
                <>
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="text-green-800">Published successfully!</span>
                  {publishResult.url && (
                    <a 
                      href={publishResult.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-green-600 hover:underline flex items-center gap-1"
                    >
                      View post <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-red-800">{publishResult.error}</span>
                </>
              )}
            </div>
            <button 
              onClick={() => setPublishResult(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {items.length === 0
                ? `No ${statusFilter} content`
                : "No content for this filter"}
            </p>
            {statusFilter === "pending" && (
              <Link
                href="/ingest"
                className="text-primary hover:underline"
              >
                Upload new content →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-card border rounded-lg overflow-hidden"
              >
                {/* Header */}
                <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded text-white ${
                        platformColors[item.platform]
                      }`}
                    >
                      {platformIcons[item.platform]}
                    </div>
                    <div>
                      <span className="font-medium capitalize">
                        {item.platform}
                      </span>
                      {item.source_title && (
                        <span className="text-muted-foreground text-sm ml-2">
                          from {item.source_title}
                        </span>
                      )}
                    </div>
                    {item.extraction_type && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          item.extraction_type === "quote"
                            ? "bg-blue-100 text-blue-800"
                            : item.extraction_type === "stat"
                            ? "bg-green-100 text-green-800"
                            : item.extraction_type === "hot_take"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {item.extraction_type}
                      </span>
                    )}
                    {/* Status badge */}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        item.status === "published"
                          ? "bg-green-100 text-green-800"
                          : item.status === "approved"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {item.status}
                    </span>
                    {/* Visual indicator */}
                    {item.mediaUrl && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
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
                        className="text-primary hover:underline text-sm flex items-center gap-1"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <span className="text-xs text-muted-foreground">
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
                          className="w-full max-w-md rounded-lg border shadow-sm hover:shadow-md transition-shadow"
                        />
                      </a>
                      <p className="text-xs text-muted-foreground mt-1">
                        Click to view full visual
                      </p>
                    </div>
                  )}

                  {editingId === item.id ? (
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full p-3 border rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={4}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{item.text}</p>
                  )}

                  {item.hashtags && item.hashtags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {item.hashtags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-xs text-primary"
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
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      {item.text.length}/280 characters
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="px-4 py-3 border-t bg-muted/30 flex items-center justify-between">
                  <div className="flex gap-2">
                    {editingId === item.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(item.id)}
                          disabled={actionLoading === item.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50"
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
                          className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm hover:bg-accent"
                        >
                          Cancel
                        </button>
                      </>
                    ) : item.status !== "published" ? (
                      <>
                        <button
                          onClick={() => handleEdit(item)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm hover:bg-accent"
                        >
                          <Edit3 className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleRegenerate(item.id)}
                          disabled={actionLoading === item.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm hover:bg-accent disabled:opacity-50"
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
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-destructive text-destructive rounded-lg text-sm hover:bg-destructive/10 disabled:opacity-50"
                          >
                            <X className="h-4 w-4" />
                            Kill
                          </button>
                          <button
                            onClick={() => handleApprove(item.id)}
                            disabled={actionLoading === item.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
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
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50"
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
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50"
                            >
                              {actionLoading === item.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                              Publish Now
                            </button>
                          ) : (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
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
      </main>
    </div>
  );
}
