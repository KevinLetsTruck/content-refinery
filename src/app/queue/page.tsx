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
  Filter,
  Loader2,
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      const response = await fetch("/api/queue");
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

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/queue/${id}/approve`, {
        method: "POST",
      });
      if (response.ok) {
        setItems(items.filter((item) => item.id !== id));
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
                {items.length} items waiting for review
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

        {/* Platform Filters */}
        <div className="container mx-auto px-4 pb-4">
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
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {items.length === 0
                ? "No content waiting for review"
                : "No content for this filter"}
            </p>
            <Link
              href="/ingest"
              className="text-primary hover:underline"
            >
              Upload new content →
            </Link>
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
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Content */}
                <div className="p-4">
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
                    ) : (
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
                    )}
                  </div>

                  {editingId !== item.id && (
                    <div className="flex gap-2">
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
