"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWizardStore, SourceType, QuickIdeaType, ContentLength, ContentCategory } from "../../store";
import {
  Lightbulb,
  BookOpen,
  Mic,
  ShoppingBag,
  Star,
  BookMarked,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Cloud,
  CloudOff,
  Loader2,
  Clock,
  Check,
  AlertCircle,
  Newspaper,
  Quote,
  FileText,
  AlignLeft,
  AlignJustify,
  Rss,
  ExternalLink,
  ChevronLeft,
  Heart,
  Truck,
  DollarSign,
  Briefcase,
  Vote,
  Globe,
} from "lucide-react";

interface Episode {
  id: string;
  title: string;
  originalFilename: string | null;
  status: string;
  durationFormatted: string | null;
  hasTranscript: boolean;
  createdAt: string;
}

interface DropboxStatus {
  isConnected: boolean;
  folderPath: string | null;
  totalEpisodes: number;
  pendingTranscription: number;
}

interface PendingFile {
  id: string;
  name: string;
  path: string;
  size: number;
  modifiedAt: string;
}

interface FeedlyBoard {
  id: string;
  label: string;
  description?: string;
}

interface FeedlyArticle {
  id: string;
  title: string;
  published: number;
  publishedFormatted: string;
  url?: string;
  source: string;
  sourceUrl?: string;
  author?: string;
  summary?: string;
  contentPreview: string;
  fullContent: string;
  topics: string[];
  keywords: string[];
  engagement?: number;
}

const SOURCE_OPTIONS: {
  type: SourceType;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}[] = [
  {
    type: "quick_idea",
    icon: <Lightbulb className="h-6 w-6" />,
    title: "Quick Idea",
    description: "Start with a topic, quote, stat, or tip",
    color: "bg-[#F4A300]/20 text-[#F4A300]",
  },
  {
    type: "feedly",
    icon: <Rss className="h-6 w-6" />,
    title: "From Feedly",
    description: "Pull articles from your saved boards",
    color: "bg-green-500/20 text-green-400",
  },
  {
    type: "guide",
    icon: <BookOpen className="h-6 w-6" />,
    title: "From Guide",
    description: "Extract content from your health guides",
    color: "bg-blue-500/20 text-blue-400",
  },
  {
    type: "episode",
    icon: <Mic className="h-6 w-6" />,
    title: "From Episode",
    description: "Pull quotes from podcast transcripts",
    color: "bg-purple-500/20 text-purple-400",
  },
  {
    type: "product",
    icon: <ShoppingBag className="h-6 w-6" />,
    title: "From Product",
    description: "Spotlight a product from your store",
    color: "bg-[#22C55E]/20 text-[#22C55E]",
  },
  {
    type: "success_story",
    icon: <Star className="h-6 w-6" />,
    title: "Success Story",
    description: "Share a client transformation",
    color: "bg-[#FF4500]/20 text-[#FF4500]",
  },
  {
    type: "trucktales",
    icon: <BookMarked className="h-6 w-6" />,
    title: "TruckTales",
    description: "Promote your fiction stories",
    color: "bg-rose-500/20 text-rose-400",
  },
];

const QUICK_IDEA_TYPES: {
  type: QuickIdeaType;
  icon: React.ReactNode;
  title: string;
  description: string;
}[] = [
  {
    type: "idea",
    icon: <Lightbulb className="h-4 w-4" />,
    title: "Quick Idea",
    description: "A topic, tip, or thought to expand on",
  },
  {
    type: "news_article",
    icon: <Newspaper className="h-4 w-4" />,
    title: "News Commentary",
    description: "Summarize & comment on a news article",
  },
  {
    type: "stat",
    icon: <FileText className="h-4 w-4" />,
    title: "Stat/Fact",
    description: "Lead with a shocking statistic",
  },
  {
    type: "quote",
    icon: <Quote className="h-4 w-4" />,
    title: "Quote",
    description: "A quotable statement to share",
  },
  {
    type: "tip",
    icon: <Lightbulb className="h-4 w-4" />,
    title: "Actionable Tip",
    description: "Practical advice they can use now",
  },
];

const CONTENT_LENGTH_OPTIONS: {
  length: ContentLength;
  title: string;
  description: string;
  wordRange: string;
}[] = [
  {
    length: "short",
    title: "Short Post",
    description: "Social media post",
    wordRange: "50-150 words",
  },
  {
    length: "medium",
    title: "Medium Post",
    description: "Longer social or LinkedIn",
    wordRange: "150-400 words",
  },
  {
    length: "long",
    title: "Long Post",
    description: "Thread or detailed post",
    wordRange: "400-700 words",
  },
  {
    length: "article",
    title: "Article",
    description: "Blog post or newsletter",
    wordRange: "700-1500+ words",
  },
];

const CONTENT_CATEGORY_OPTIONS: {
  category: ContentCategory;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}[] = [
  {
    category: "health",
    icon: <Heart className="h-4 w-4" />,
    title: "Health",
    description: "Driver health, nutrition, supplements",
    color: "text-red-400",
  },
  {
    category: "trucking",
    icon: <Truck className="h-4 w-4" />,
    title: "Trucking",
    description: "Industry news, regulations, lifestyle",
    color: "text-blue-400",
  },
  {
    category: "finance",
    icon: <DollarSign className="h-4 w-4" />,
    title: "Personal Finance",
    description: "Money, taxes, retirement, investing",
    color: "text-green-400",
  },
  {
    category: "business",
    icon: <Briefcase className="h-4 w-4" />,
    title: "Small Business",
    description: "O/O business tips, entrepreneurship",
    color: "text-purple-400",
  },
  {
    category: "politics",
    icon: <Vote className="h-4 w-4" />,
    title: "Politics",
    description: "Policy, regulations, advocacy",
    color: "text-orange-400",
  },
  {
    category: "general",
    icon: <Globe className="h-4 w-4" />,
    title: "General",
    description: "Other topics, commentary",
    color: "text-gray-400",
  },
];

// Reusable Category Selector Component
function CategorySelector({
  contentCategory,
  setContentCategory,
  compact = false
}: {
  contentCategory: ContentCategory;
  setContentCategory: (category: ContentCategory) => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {CONTENT_CATEGORY_OPTIONS.map(({ category, icon, title, color }) => (
          <button
            key={category}
            onClick={() => setContentCategory(category)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
              contentCategory === category
                ? "bg-[#FF4500] text-white"
                : "bg-[#0D0D0D] border border-[#333333] hover:border-[#444444] text-[#888888]"
            }`}
          >
            <span className={contentCategory === category ? "text-white" : color}>
              {icon}
            </span>
            <span>{title}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-3 text-white">
        Content Category
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {CONTENT_CATEGORY_OPTIONS.map(({ category, icon, title, description, color }) => (
          <button
            key={category}
            onClick={() => setContentCategory(category)}
            className={`p-3 rounded-lg border text-left transition-all ${
              contentCategory === category
                ? "border-[#FF4500] bg-[#FF4500]/10"
                : "border-[#333333] hover:border-[#444444]"
            }`}
          >
            <div className={`mb-1 ${contentCategory === category ? "text-[#FF4500]" : color}`}>
              {icon}
            </div>
            <p className="text-sm font-medium text-white">{title}</p>
            <p className="text-xs text-[#666666] mt-0.5 hidden sm:block">{description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export function Step1Source() {
  const router = useRouter();
  const {
    setSource,
    sourceType,
    sourceContent,
    nextStep,
    goToStep,
    currentStep,
    reset,
    quickIdeaType,
    setQuickIdeaType,
    contentLength,
    setContentLength,
    contentCategory,
    setContentCategory,
  } = useWizardStore();
  const [selectedType, setSelectedType] = useState<SourceType | null>(sourceType);
  const [content, setContent] = useState(sourceContent);

  // Episode state
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [dropboxStatus, setDropboxStatus] = useState<DropboxStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [syncingFile, setSyncingFile] = useState<string | null>(null);
  const [loadingEpisodeId, setLoadingEpisodeId] = useState<string | null>(null);

  // Feedly state
  const [feedlyBoards, setFeedlyBoards] = useState<FeedlyBoard[]>([]);
  const [feedlyArticles, setFeedlyArticles] = useState<FeedlyArticle[]>([]);
  const [feedlyLoading, setFeedlyLoading] = useState(false);
  const [feedlyConfigured, setFeedlyConfigured] = useState<boolean | null>(null);
  const [feedlyError, setFeedlyError] = useState<string | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<FeedlyBoard | null>(null);
  const [loadingArticleId, setLoadingArticleId] = useState<string | null>(null);

  // Reset wizard state when entering step 1 fresh
  useEffect(() => {
    // Reset the entire wizard when landing on step 1
    reset();
  }, []); // Only on mount

  // Fetch episodes and Dropbox status when episode is selected
  const fetchEpisodes = useCallback(async () => {
    setEpisodesLoading(true);
    try {
      const [episodesRes, statusRes, pendingRes] = await Promise.all([
        fetch("/api/episodes?limit=20&hasTranscript=true"),
        fetch("/api/dropbox/sync"),
        fetch("/api/dropbox/sync?pending=true"),
      ]);

      if (episodesRes.ok) {
        const data = await episodesRes.json();
        setEpisodes(data.episodes || []);
      }

      if (statusRes.ok) {
        const status = await statusRes.json();
        setDropboxStatus(status);
      }

      if (pendingRes.ok) {
        const pending = await pendingRes.json();
        setPendingFiles(pending.files || []);
      }
    } catch (error) {
      console.error("Failed to fetch episodes:", error);
    } finally {
      setEpisodesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedType === "episode") {
      fetchEpisodes();
    }
  }, [selectedType, fetchEpisodes]);

  // Fetch Feedly boards when feedly is selected
  const fetchFeedlyBoards = useCallback(async () => {
    setFeedlyLoading(true);
    setFeedlyError(null);
    try {
      const res = await fetch("/api/feedly/boards");
      const data = await res.json();

      setFeedlyConfigured(data.configured);
      if (data.configured && data.boards) {
        setFeedlyBoards(data.boards);
      } else if (data.error) {
        setFeedlyError(data.error);
      }
    } catch (error) {
      console.error("Failed to fetch Feedly boards:", error);
      setFeedlyError("Failed to connect to Feedly");
    } finally {
      setFeedlyLoading(false);
    }
  }, []);

  // Fetch articles from selected board
  const fetchBoardArticles = useCallback(async (boardId: string) => {
    setFeedlyLoading(true);
    setFeedlyError(null);
    try {
      const res = await fetch(`/api/feedly/articles?boardId=${encodeURIComponent(boardId)}&count=30`);
      const data = await res.json();

      if (data.articles) {
        setFeedlyArticles(data.articles);
      } else if (data.error) {
        setFeedlyError(data.error);
      }
    } catch (error) {
      console.error("Failed to fetch Feedly articles:", error);
      setFeedlyError("Failed to load articles");
    } finally {
      setFeedlyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedType === "feedly" && feedlyConfigured === null) {
      fetchFeedlyBoards();
    }
  }, [selectedType, feedlyConfigured, fetchFeedlyBoards]);

  // Handle board selection
  const handleBoardSelect = (board: FeedlyBoard) => {
    setSelectedBoard(board);
    setFeedlyArticles([]);
    fetchBoardArticles(board.id);
  };

  // Handle article selection
  const handleArticleSelect = (article: FeedlyArticle) => {
    setLoadingArticleId(article.id);

    // Build the content with article metadata
    const articleContent = `
Title: ${article.title}
Source: ${article.source}
URL: ${article.url || "N/A"}
Published: ${article.publishedFormatted}
${article.author ? `Author: ${article.author}` : ""}

${article.fullContent}
    `.trim();

    // Set as news_article type automatically
    setQuickIdeaType("news_article");

    // Set the source
    setSource(
      "feedly",
      articleContent,
      article.title,
      article.id,
      {
        feedlyArticleId: article.id,
        url: article.url,
        source: article.source,
      }
    );

    setLoadingArticleId(null);
    nextStep();
    router.push("/create/mode");
  };

  // Go back to board selection
  const handleBackToBoards = () => {
    setSelectedBoard(null);
    setFeedlyArticles([]);
  };

  // Sync from Dropbox
  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch("/api/dropbox/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoTranscribe: true }),
      });

      const result = await res.json();

      if (!res.ok) {
        // Check for permission errors - suggest reconnecting
        const errorMsg = result.error || "Sync failed";
        if (errorMsg.includes("scope") || errorMsg.includes("permission")) {
          throw new Error("Permission error - click disconnect and reconnect Dropbox");
        }
        throw new Error(errorMsg);
      }

      // Refresh episodes list
      await fetchEpisodes();

      if (result.imported > 0) {
        // Show success briefly
        setSyncError(`Imported ${result.imported} episode${result.imported > 1 ? "s" : ""}`);
        setTimeout(() => setSyncError(null), 3000);
      } else if (result.skipped > 0) {
        setSyncError("No new episodes to import");
        setTimeout(() => setSyncError(null), 3000);
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // Sync a single file (for large files)
  const handleSyncSingleFile = async (filePath: string, fileName: string) => {
    setSyncingFile(filePath);
    setSyncError(null);
    try {
      const res = await fetch("/api/dropbox/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ singleFile: filePath, autoTranscribe: true }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Sync failed");
      }

      // Show success
      setSyncError(`Imported "${fileName}" successfully`);
      setTimeout(() => setSyncError(null), 3000);

      // Refresh the lists
      await fetchEpisodes();
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setSyncingFile(null);
    }
  };

  // Disconnect Dropbox
  const handleDisconnect = async () => {
    if (!confirm("Disconnect Dropbox? You can reconnect anytime.")) {
      return;
    }

    try {
      const res = await fetch("/api/auth/dropbox", {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to disconnect");
      }

      // Reset status to show connect button
      setDropboxStatus(null);
      setSyncError(null);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Failed to disconnect");
    }
  };

  // Handle episode selection - fetch full transcript
  const handleEpisodeSelect = async (episode: Episode) => {
    if (!episode.hasTranscript) {
      setSyncError("This episode doesn't have a transcript yet");
      return;
    }

    setLoadingEpisodeId(episode.id);
    try {
      // Fetch the full source with transcript
      const res = await fetch(`/api/sources/${episode.id}`);
      if (!res.ok) {
        throw new Error("Failed to load episode");
      }

      const data = await res.json();
      const source = data.source;

      // Get transcript text
      let transcriptText = "";
      if (source.transcripts && source.transcripts.length > 0) {
        transcriptText = source.transcripts[0].fullText || "";
      }

      if (!transcriptText) {
        throw new Error("No transcript content found");
      }

      // Set the source with the full transcript content
      setContent(episode.title);
      setSource(
        "episode",
        transcriptText,
        episode.title,
        episode.id,
        { sourceId: episode.id, hasTranscript: true }
      );
      nextStep();
      router.push("/create/mode");
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Failed to load episode");
    } finally {
      setLoadingEpisodeId(null);
    }
  };

  const handleSourceSelect = (type: SourceType) => {
    setSelectedType(type);
    if (type !== "quick_idea") {
      // For non-idea sources, we'd show a selector
      // For MVP, we'll just enable the idea input
    }
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    if (selectedType) {
      setSource(selectedType, value);
    }
  };

  const handleContinueToMode = () => {
    if (!content.trim() || !selectedType) return;
    setSource(selectedType, content, content.substring(0, 50));
    nextStep();
    router.push("/create/mode");
  };

  const handleQuickCreate = () => {
    if (!content.trim()) return;
    setSource("quick_idea", content, content.substring(0, 50));
    // Quick create goes directly to mode selection too
    nextStep();
    router.push("/create/mode");
  };

  const handleGuideSelect = (guide: string) => {
    setContent(guide);
    setSource("guide", guide, guide);
    nextStep();
    router.push("/create/mode");
  };

  const handleProductSelect = (productName: string) => {
    if (!productName.trim()) return;
    setContent(productName);
    setSource("product", productName, productName);
    nextStep();
    router.push("/create/mode");
  };

  return (
    <div className="space-y-8">
      {/* Quick Create Banner */}
      <div className="bg-gradient-to-r from-[#FF4500]/20 to-[#FF4500]/5 border-2 border-[#FF4500]/40 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-[#FF4500]/20 flex-shrink-0">
            <Sparkles className="h-5 w-5 text-[#FF4500]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-white">Quick Create</h3>
            <p className="text-sm text-[#888888] mt-1 break-words">
              Just type your idea and choose Quick Post or Campaign mode.
            </p>

            {/* Content Category - Quick Selector */}
            <div className="mt-4">
              <CategorySelector
                contentCategory={contentCategory}
                setContentCategory={setContentCategory}
                compact
              />
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  setSelectedType("quick_idea");
                }}
                placeholder="e.g., 70% of drivers have Candida overgrowth"
                className="flex-1 min-w-0 px-4 py-2 rounded border border-[#333333] bg-[#0D0D0D] text-white text-sm focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]/20 placeholder-[#888888]"
              />
              <button
                onClick={handleQuickCreate}
                disabled={!content.trim()}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded bg-gradient-to-r from-[#FF4500] to-[#CC3700] text-white font-medium hover:from-[#FF6633] hover:to-[#FF4500] disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
              >
                <ArrowRight className="h-4 w-4" />
                <span className="hidden sm:inline">Continue</span>
                <span className="sm:hidden">Next</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-[#333333]" />
        <span className="text-sm text-[#888888]">or choose a source</span>
        <div className="flex-1 h-px bg-[#333333]" />
      </div>

      {/* Source Options Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {SOURCE_OPTIONS.map(({ type, icon, title, description, color }) => (
          <button
            key={type}
            onClick={() => handleSourceSelect(type)}
            className={`
              relative p-5 rounded-lg border-2 text-left transition-all duration-200
              hover:-translate-y-0.5
              ${
                selectedType === type
                  ? "border-[#FF4500] bg-[#FF4500]/10"
                  : "border-[#333333] bg-[#1A1A1A] hover:border-[#444444]"
              }
            `}
          >
            <div className={`inline-flex p-2 rounded-lg ${color}`}>{icon}</div>
            <h3 className="font-semibold mt-3 text-white">{title}</h3>
            <p className="text-sm text-[#888888] mt-1">{description}</p>

            {selectedType === type && (
              <div className="absolute top-3 right-3">
                <div className="w-2 h-2 rounded-full bg-[#FF4500]" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Content Input for Selected Source */}
      {selectedType === "quick_idea" && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-[#1A1A1A] rounded-lg border border-[#333333] p-6 space-y-6">
            {/* Content Type Selector */}
            <div>
              <label className="block text-sm font-medium mb-3 text-white">
                What type of content?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {QUICK_IDEA_TYPES.map(({ type, icon, title, description }) => (
                  <button
                    key={type}
                    onClick={() => setQuickIdeaType(type)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      quickIdeaType === type
                        ? "border-[#FF4500] bg-[#FF4500]/10"
                        : "border-[#333333] hover:border-[#444444]"
                    }`}
                  >
                    <div className={`mb-1 ${quickIdeaType === type ? "text-[#FF4500]" : "text-[#888888]"}`}>
                      {icon}
                    </div>
                    <p className="text-sm font-medium text-white">{title}</p>
                    <p className="text-xs text-[#666666] mt-0.5 hidden sm:block">{description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Length Selector */}
            <div>
              <label className="block text-sm font-medium mb-3 text-white">
                Content length
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CONTENT_LENGTH_OPTIONS.map(({ length, title, description, wordRange }) => (
                  <button
                    key={length}
                    onClick={() => setContentLength(length)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      contentLength === length
                        ? "border-[#FF4500] bg-[#FF4500]/10"
                        : "border-[#333333] hover:border-[#444444]"
                    }`}
                  >
                    <p className="text-sm font-medium text-white">{title}</p>
                    <p className="text-xs text-[#666666] mt-0.5">{wordRange}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Category Selector */}
            <div>
              <label className="block text-sm font-medium mb-3 text-white">
                Topic category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CONTENT_CATEGORY_OPTIONS.map(({ category, icon, title, description, color }) => (
                  <button
                    key={category}
                    onClick={() => setContentCategory(category)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      contentCategory === category
                        ? "border-[#FF4500] bg-[#FF4500]/10"
                        : "border-[#333333] hover:border-[#444444]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={contentCategory === category ? "text-[#FF4500]" : color}>
                        {icon}
                      </span>
                      <p className="text-sm font-medium text-white">{title}</p>
                    </div>
                    <p className="text-xs text-[#666666] hidden sm:block">{description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Input */}
            <div>
              <label className="block text-sm font-medium mb-2 text-white">
                {quickIdeaType === "news_article"
                  ? "Paste the article or URL"
                  : "Your content"}
              </label>
              <textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder={
                  quickIdeaType === "news_article"
                    ? "Paste the full article text or URL here. I'll summarize it and add commentary in Kevin's voice..."
                    : quickIdeaType === "stat"
                    ? "e.g., 70% of professional drivers test positive for Candida overgrowth vs 13% of the general population..."
                    : quickIdeaType === "quote"
                    ? "e.g., Your body doesn't care what the FDA says. It cares what you feed it..."
                    : quickIdeaType === "tip"
                    ? "e.g., Replace your morning coffee with black tea for 2 weeks. The L-theanine will help with focus without the cortisol spike..."
                    : "Share a stat, quote, tip, or topic you want to turn into social content..."
                }
                rows={quickIdeaType === "news_article" || contentLength === "article" ? 12 : 6}
                className="w-full px-4 py-3 rounded border border-[#333333] bg-[#0D0D0D] text-white resize-none focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]/20 placeholder-[#888888]"
              />
              <p className="text-xs text-[#888888] mt-2">
                {quickIdeaType === "news_article"
                  ? "Paste the full article for best results. I'll extract key points and add your perspective."
                  : contentLength === "article"
                  ? "For articles, include key points, data, and arguments you want covered."
                  : "Be specific! The more detail you give, the better content I can create."}
              </p>
            </div>

            <button
              onClick={handleContinueToMode}
              disabled={!content.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded bg-[#FF4500] hover:bg-[#CC3700] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Guide Selector */}
      {selectedType === "guide" && (
        <div className="bg-[#1A1A1A] rounded-lg border border-[#333333] p-6 animate-in slide-in-from-bottom-4 duration-300 space-y-6">
          {/* Content Category */}
          <CategorySelector
            contentCategory={contentCategory}
            setContentCategory={setContentCategory}
          />

          <div>
            <label className="block text-sm font-medium mb-4 text-white">
              Select a guide to extract content from
            </label>
          <div className="grid gap-3">
            {[
              "Shut Up and Digest",
              "Sleep When You're Dead",
              "Blood Sugar Chaos",
              "The Owner-Operator's Heart",
              "Gut Check",
            ].map((guide) => (
              <button
                key={guide}
                onClick={() => handleGuideSelect(guide)}
                className="flex items-center justify-between p-4 rounded border border-[#333333] hover:bg-[#0D0D0D] hover:border-[#444444] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-[#888888]" />
                  <span className="font-medium text-white">{guide}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-[#888888]" />
              </button>
            ))}
          </div>
          </div>
        </div>
      )}

      {/* Product Selector */}
      {selectedType === "product" && (
        <div className="bg-[#1A1A1A] rounded-lg border border-[#333333] p-6 animate-in slide-in-from-bottom-4 duration-300 space-y-6">
          {/* Content Category */}
          <CategorySelector
            contentCategory={contentCategory}
            setContentCategory={setContentCategory}
          />

          <div>
            <label className="block text-sm font-medium mb-4 text-white">
              Select a product to spotlight
            </label>
          <div className="grid gap-3 mb-4">
            {[
              "Cardio Miracle",
              "Lyte Balance",
              "Mind Fuel MCT Oil",
              "Bio-DK Mulsion",
              "Bee-Ome Gold",
              "Terraflora Deep Zen",
            ].map((product) => (
              <button
                key={product}
                onClick={() => handleProductSelect(product)}
                className="flex items-center justify-between p-4 rounded border border-[#333333] hover:bg-[#0D0D0D] hover:border-[#444444] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className="h-5 w-5 text-[#22C55E]" />
                  <span className="font-medium text-white">{product}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-[#888888]" />
              </button>
            ))}
          </div>
          <div className="pt-4 border-t border-[#333333]">
            <p className="text-sm text-[#888888] mb-2">Or enter a product manually:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Product name"
                className="flex-1 px-4 py-2 rounded border border-[#333333] bg-[#0D0D0D] text-white focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]/20 placeholder-[#888888]"
              />
              <button
                onClick={() => handleProductSelect(content)}
                disabled={!content.trim()}
                className="px-4 py-2 rounded bg-[#FF4500] hover:bg-[#CC3700] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Success Story Input */}
      {selectedType === "success_story" && (
        <div className="bg-[#1A1A1A] rounded-lg border border-[#333333] p-6 animate-in slide-in-from-bottom-4 duration-300 space-y-6">
          {/* Content Category */}
          <CategorySelector
            contentCategory={contentCategory}
            setContentCategory={setContentCategory}
          />

          <div>
            <label className="block text-sm font-medium mb-2 text-white">
              Share the success story
            </label>
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="e.g., John lost 40 lbs in 3 months following the proper human diet. His energy is through the roof and he's sleeping 6+ hours for the first time in years..."
            rows={5}
            className="w-full px-4 py-3 rounded border border-[#333333] bg-[#0D0D0D] text-white resize-none focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]/20 placeholder-[#888888]"
          />
          <p className="text-xs text-[#888888] mt-2">
            Use first names only. Focus on specific, measurable results.
          </p>
          <button
            onClick={handleContinueToMode}
            disabled={!content.trim()}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded bg-[#FF4500] hover:bg-[#CC3700] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
          </div>
        </div>
      )}

      {/* Episode Selector */}
      {selectedType === "episode" && (
        <div className="bg-[#1A1A1A] rounded-lg border border-[#333333] p-6 animate-in slide-in-from-bottom-4 duration-300 space-y-6">
          {/* Content Category */}
          <CategorySelector
            contentCategory={contentCategory}
            setContentCategory={setContentCategory}
          />

          {/* Header with sync button */}
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-white">
              Select an episode
            </label>
            <div className="flex items-center gap-2">
              {dropboxStatus?.isConnected ? (
                <>
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-[#333333] hover:bg-[#0D0D0D] hover:border-[#444444] transition-colors disabled:opacity-50"
                  >
                    {syncing ? (
                      <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                    ) : (
                      <RefreshCw className="h-4 w-4 text-purple-400" />
                    )}
                    <span className="text-[#888888]">Sync from Dropbox</span>
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-red-500/30 hover:bg-red-500/10 transition-colors"
                    title="Disconnect Dropbox"
                  >
                    <CloudOff className="h-4 w-4 text-red-400" />
                  </button>
                </>
              ) : (
                <a
                  href="/api/auth/dropbox"
                  className="flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 transition-colors"
                >
                  <Cloud className="h-4 w-4 text-purple-400" />
                  <span className="text-purple-400">Connect Dropbox</span>
                </a>
              )}
            </div>
          </div>

          {/* Sync status/error message */}
          {syncError && (
            <div className={`flex items-center gap-2 p-3 rounded mb-4 ${
              syncError.startsWith("Imported") || syncError.startsWith("No new")
                ? "bg-green-500/10 border border-green-500/30"
                : "bg-red-500/10 border border-red-500/30"
            }`}>
              {syncError.startsWith("Imported") ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : syncError.startsWith("No new") ? (
                <Clock className="h-4 w-4 text-yellow-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-400" />
              )}
              <span className={`text-sm ${
                syncError.startsWith("Imported") || syncError.startsWith("No new")
                  ? "text-green-400"
                  : "text-red-400"
              }`}>
                {syncError}
              </span>
            </div>
          )}

          {/* Loading state */}
          {episodesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
              <span className="ml-2 text-[#888888]">Loading episodes...</span>
            </div>
          ) : episodes.length > 0 ? (
            <div className="grid gap-3 mb-4 max-h-80 overflow-y-auto">
              {episodes.map((episode) => (
                <button
                  key={episode.id}
                  onClick={() => handleEpisodeSelect(episode)}
                  disabled={loadingEpisodeId !== null}
                  className="flex items-center justify-between p-4 rounded border border-[#333333] hover:bg-[#0D0D0D] hover:border-[#444444] transition-colors text-left disabled:opacity-50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Mic className="h-5 w-5 text-purple-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-white block truncate">{episode.title}</span>
                      <div className="flex items-center gap-2 mt-1">
                        {episode.durationFormatted && (
                          <span className="text-xs text-[#666666]">{episode.durationFormatted}</span>
                        )}
                        {episode.hasTranscript && (
                          <span className="text-xs text-green-500 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Transcribed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {loadingEpisodeId === episode.id ? (
                    <Loader2 className="h-4 w-4 text-purple-400 animate-spin flex-shrink-0" />
                  ) : (
                    <ArrowRight className="h-4 w-4 text-[#888888] flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              {dropboxStatus?.isConnected ? (
                <>
                  <CloudOff className="h-8 w-8 text-[#444444] mx-auto mb-2" />
                  <p className="text-[#666666]">No transcribed episodes yet.</p>
                  <p className="text-sm text-[#444444] mt-1">
                    Click "Sync from Dropbox" to import your episodes.
                  </p>
                </>
              ) : (
                <>
                  <Cloud className="h-8 w-8 text-[#444444] mx-auto mb-2" />
                  <p className="text-[#666666]">Connect Dropbox to sync your episodes.</p>
                  <p className="text-sm text-[#444444] mt-1">
                    Episodes recorded in Audio Hijack will appear here.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Pending files from Dropbox */}
          {pendingFiles.length > 0 && dropboxStatus?.isConnected && (
            <div className="mt-4 pt-4 border-t border-[#333333]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white">
                  Files pending import ({pendingFiles.length})
                </span>
              </div>
              <div className="grid gap-2 max-h-40 overflow-y-auto">
                {pendingFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 rounded border border-[#333333] bg-[#0D0D0D]"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Cloud className="h-4 w-4 text-purple-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-white block truncate">{file.name}</span>
                        <span className="text-xs text-[#666666]">
                          {Math.round(file.size / 1024 / 1024)}MB
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSyncSingleFile(file.path, file.name)}
                      disabled={syncingFile !== null}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 disabled:opacity-50 transition-colors"
                    >
                      {syncingFile === file.path ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3" />
                          Import
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status bar */}
          {dropboxStatus && (
            <div className="pt-4 border-t border-[#333333] flex items-center justify-between text-xs text-[#666666]">
              <div className="flex items-center gap-4">
                <span>{dropboxStatus.totalEpisodes} total episodes</span>
                {dropboxStatus.pendingTranscription > 0 && (
                  <span className="flex items-center gap-1 text-yellow-500">
                    <Clock className="h-3 w-3" />
                    {dropboxStatus.pendingTranscription} pending transcription
                  </span>
                )}
              </div>
              {dropboxStatus.folderPath && dropboxStatus.folderPath !== "/" && (
                <span className="truncate max-w-[200px]" title={dropboxStatus.folderPath}>
                  Folder: {dropboxStatus.folderPath}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* TruckTales Selector */}
      {selectedType === "trucktales" && (
        <div className="bg-[#1A1A1A] rounded-lg border border-[#333333] p-6 animate-in slide-in-from-bottom-4 duration-300 space-y-6">
          {/* Content Category */}
          <CategorySelector
            contentCategory={contentCategory}
            setContentCategory={setContentCategory}
          />

          <div>
            <label className="block text-sm font-medium mb-4 text-white">
              Select a story
            </label>
          <div className="grid gap-3 mb-4">
            {[
              "The Long Haul Home",
              "Midnight Run",
              "Ghost Truck on I-80",
            ].map((story) => (
              <button
                key={story}
                onClick={() => {
                  setContent(story);
                  setSource("trucktales", story, story);
                  nextStep();
                  router.push("/create/mode");
                }}
                className="flex items-center justify-between p-4 rounded border border-[#333333] hover:bg-[#0D0D0D] hover:border-[#444444] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <BookMarked className="h-5 w-5 text-rose-400" />
                  <span className="font-medium text-white">{story}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-[#888888]" />
              </button>
            ))}
          </div>
          <p className="text-sm text-[#666666]">
            Stories from TruckTales app will sync automatically.
          </p>
          </div>
        </div>
      )}

      {/* Feedly Selector */}
      {selectedType === "feedly" && (
        <div className="bg-[#1A1A1A] rounded-lg border border-[#333333] p-6 animate-in slide-in-from-bottom-4 duration-300 space-y-6">
          {/* Content Category */}
          <CategorySelector
            contentCategory={contentCategory}
            setContentCategory={setContentCategory}
          />

          {/* Not configured state */}
          {feedlyConfigured === false && (
            <div className="text-center py-8">
              <Rss className="h-12 w-12 text-[#444444] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Feedly Not Configured</h3>
              <p className="text-[#888888] mb-4">
                Add your Feedly access token to pull articles from your boards.
              </p>
              <p className="text-sm text-[#666666]">
                Add <code className="bg-[#0D0D0D] px-2 py-1 rounded">FEEDLY_ACCESS_TOKEN</code> to your environment variables.
              </p>
            </div>
          )}

          {/* Loading state */}
          {feedlyLoading && !selectedBoard && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-green-400" />
              <span className="ml-2 text-[#888888]">Loading boards...</span>
            </div>
          )}

          {/* Error state */}
          {feedlyError && (
            <div className="flex items-center gap-2 p-3 rounded mb-4 bg-red-500/10 border border-red-500/30">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <span className="text-sm text-red-400">{feedlyError}</span>
            </div>
          )}

          {/* Board selection */}
          {feedlyConfigured && !selectedBoard && !feedlyLoading && (
            <>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-white">
                  Select a board
                </label>
                <button
                  onClick={fetchFeedlyBoards}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-[#333333] hover:bg-[#0D0D0D] hover:border-[#444444] transition-colors"
                >
                  <RefreshCw className="h-4 w-4 text-green-400" />
                  <span className="text-[#888888]">Refresh</span>
                </button>
              </div>

              {feedlyBoards.length > 0 ? (
                <div className="grid gap-3 max-h-80 overflow-y-auto">
                  {feedlyBoards.map((board) => (
                    <button
                      key={board.id}
                      onClick={() => handleBoardSelect(board)}
                      className="flex items-center justify-between p-4 rounded border border-[#333333] hover:bg-[#0D0D0D] hover:border-[#444444] transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Rss className="h-5 w-5 text-green-400" />
                        <div>
                          <span className="font-medium text-white block">{board.label}</span>
                          {board.description && (
                            <span className="text-xs text-[#666666]">{board.description}</span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-[#888888]" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Rss className="h-8 w-8 text-[#444444] mx-auto mb-2" />
                  <p className="text-[#666666]">No boards found.</p>
                  <p className="text-sm text-[#444444] mt-1">
                    Save articles to boards in Feedly to see them here.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Article selection */}
          {feedlyConfigured && selectedBoard && (
            <>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handleBackToBoards}
                  className="flex items-center gap-2 text-sm text-[#888888] hover:text-white transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to boards
                </button>
                <div className="flex items-center gap-2">
                  <Rss className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-medium text-white">{selectedBoard.label}</span>
                </div>
              </div>

              {feedlyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-green-400" />
                  <span className="ml-2 text-[#888888]">Loading articles...</span>
                </div>
              ) : feedlyArticles.length > 0 ? (
                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  {feedlyArticles.map((article) => (
                    <button
                      key={article.id}
                      onClick={() => handleArticleSelect(article)}
                      disabled={loadingArticleId !== null}
                      className="flex flex-col p-4 rounded border border-[#333333] hover:bg-[#0D0D0D] hover:border-[#444444] transition-colors text-left disabled:opacity-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-white block line-clamp-2">{article.title}</span>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-green-400">{article.source}</span>
                            <span className="text-xs text-[#444444]">•</span>
                            <span className="text-xs text-[#666666]">{article.publishedFormatted}</span>
                          </div>
                        </div>
                        {loadingArticleId === article.id ? (
                          <Loader2 className="h-4 w-4 text-green-400 animate-spin flex-shrink-0" />
                        ) : (
                          <ArrowRight className="h-4 w-4 text-[#888888] flex-shrink-0" />
                        )}
                      </div>
                      {article.contentPreview && (
                        <p className="text-sm text-[#666666] mt-2 line-clamp-2">
                          {article.contentPreview}
                        </p>
                      )}
                      {article.topics.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {article.topics.slice(0, 3).map((topic) => (
                            <span
                              key={topic}
                              className="text-xs px-2 py-0.5 rounded bg-[#333333] text-[#888888]"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}
                      {article.url && (
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-xs text-green-400 hover:underline mt-2"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View original
                        </a>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Newspaper className="h-8 w-8 text-[#444444] mx-auto mb-2" />
                  <p className="text-[#666666]">No articles in this board.</p>
                  <p className="text-sm text-[#444444] mt-1">
                    Save articles to this board in Feedly.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Help text */}
          {feedlyConfigured && !feedlyLoading && (
            <div className="mt-4 pt-4 border-t border-[#333333]">
              <p className="text-xs text-[#666666]">
                Select an article to create content with AI-powered commentary in Kevin's voice.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
