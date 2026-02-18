"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWizardStore, ShowName, ShowNotesSourceItem } from "../../store";
import { WizardProgress } from "../../components/WizardProgress";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  X,
  Plus,
  Rss,
  Link2,
  Lightbulb,
  BookOpen,
  Mic,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ExternalLink,
  AlertCircle,
  FileText,
  FlaskConical,
  Upload,
} from "lucide-react";

// ============================================
// Types
// ============================================

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

interface Episode {
  id: string;
  title: string;
  originalFilename: string | null;
  status: string;
  durationFormatted: string | null;
  hasTranscript: boolean;
  createdAt: string;
}

// ============================================
// Constants
// ============================================

const SHOWS: { value: ShowName; label: string }[] = [
  { value: "tbb", label: "Trucking Business & Beyond" },
  { value: "destination_health", label: "Destination Health" },
  { value: "power_hour", label: "Power Hour" },
  { value: "coffee_with_kevin", label: "Coffee with Kevin" },
  { value: "custom", label: "Custom" },
];

const GUIDES = [
  "Shut Up and Digest",
  "Sleep When You're Dead",
  "Blood Sugar Chaos",
  "The Owner-Operator's Heart",
  "Gut Check",
];

const TYPE_BADGES: Record<
  ShowNotesSourceItem["type"],
  { label: string; color: string }
> = {
  feedly_article: { label: "Feedly", color: "bg-green-500/20 text-green-400" },
  url: { label: "URL", color: "bg-blue-500/20 text-blue-400" },
  idea: { label: "Idea", color: "bg-[#F4A300]/20 text-[#F4A300]" },
  guide: { label: "Guide", color: "bg-purple-500/20 text-purple-400" },
  episode: { label: "Episode", color: "bg-rose-500/20 text-rose-400" },
  research: { label: "Research", color: "bg-cyan-500/20 text-cyan-400" },
};

type AddTab = "feedly" | "url" | "idea" | "guide" | "episode" | "research";

// ============================================
// Component
// ============================================

export default function ShowNotesSourcesPage() {
  const router = useRouter();
  const {
    showNotesData,
    setShowName,
    addShowNotesSource,
    removeShowNotesSource,
    reorderShowNotesSource,
    sourceType,
    sourceContent,
    sourceTitle,
    sourceData,
    currentStep,
    goToStep,
  } = useWizardStore();

  // Local state
  const [activeTab, setActiveTab] = useState<AddTab>("feedly");
  const [customShowName, setCustomShowName] = useState(
    showNotesData.customShowName || ""
  );

  // URL tab state
  const [urlInput, setUrlInput] = useState("");

  // Idea tab state
  const [ideaInput, setIdeaInput] = useState("");

  // Feedly state
  const [feedlyBoards, setFeedlyBoards] = useState<FeedlyBoard[]>([]);
  const [feedlyArticles, setFeedlyArticles] = useState<FeedlyArticle[]>([]);
  const [feedlyLoading, setFeedlyLoading] = useState(false);
  const [feedlyConfigured, setFeedlyConfigured] = useState<boolean | null>(
    null
  );
  const [feedlyError, setFeedlyError] = useState<string | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<FeedlyBoard | null>(null);

  // Episode state
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [loadingEpisodeId, setLoadingEpisodeId] = useState<string | null>(null);

  // Research tab state
  const [researchMode, setResearchMode] = useState<"paste" | "upload">("paste");
  const [researchTitle, setResearchTitle] = useState("");
  const [researchContent, setResearchContent] = useState("");
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);

  // Ensure we're on step 3
  useEffect(() => {
    if (currentStep !== 3) {
      goToStep(3);
    }
  }, [currentStep, goToStep]);

  // Auto-add the Step1 source as first item if applicable
  useEffect(() => {
    if (
      sourceType &&
      sourceContent &&
      showNotesData.sourceItems.length === 0
    ) {
      let itemType: ShowNotesSourceItem["type"] = "idea";
      if (sourceType === "feedly") itemType = "feedly_article";
      else if (sourceType === "guide") itemType = "guide";
      else if (sourceType === "episode") itemType = "episode";
      else if (sourceType === "quick_idea") itemType = "idea";

      const item: ShowNotesSourceItem = {
        id: crypto.randomUUID(),
        type: itemType,
        title: sourceTitle || sourceContent.substring(0, 50),
        content: sourceContent,
        url: sourceData?.url as string | undefined,
        sourceName: sourceData?.source as string | undefined,
        metadata: sourceData as Record<string, unknown> | undefined,
      };

      addShowNotesSource(item);
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // Feedly
  // ============================================

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
    } catch {
      setFeedlyError("Failed to connect to Feedly");
    } finally {
      setFeedlyLoading(false);
    }
  }, []);

  const fetchBoardArticles = useCallback(async (boardId: string) => {
    setFeedlyLoading(true);
    setFeedlyError(null);
    try {
      const res = await fetch(
        `/api/feedly/articles?boardId=${encodeURIComponent(boardId)}&count=30`
      );
      const data = await res.json();
      if (data.articles) {
        setFeedlyArticles(data.articles);
      } else if (data.error) {
        setFeedlyError(data.error);
      }
    } catch {
      setFeedlyError("Failed to load articles");
    } finally {
      setFeedlyLoading(false);
    }
  }, []);

  // Load boards when Feedly tab is active
  useEffect(() => {
    if (activeTab === "feedly" && feedlyConfigured === null) {
      fetchFeedlyBoards();
    }
  }, [activeTab, feedlyConfigured, fetchFeedlyBoards]);

  const handleBoardSelect = (board: FeedlyBoard) => {
    setSelectedBoard(board);
    setFeedlyArticles([]);
    fetchBoardArticles(board.id);
  };

  const handleBackToBoards = () => {
    setSelectedBoard(null);
    setFeedlyArticles([]);
  };

  const handleArticleAdd = (article: FeedlyArticle) => {
    // Don't add duplicates
    if (
      showNotesData.sourceItems.some(
        (s) => s.metadata?.feedlyArticleId === article.id
      )
    ) {
      return;
    }

    const articleContent = `Title: ${article.title}\nSource: ${article.source}\nURL: ${article.url || "N/A"}\nPublished: ${article.publishedFormatted}\n${article.author ? `Author: ${article.author}` : ""}\n\n${article.fullContent}`.trim();

    const item: ShowNotesSourceItem = {
      id: crypto.randomUUID(),
      type: "feedly_article",
      title: article.title,
      content: articleContent,
      url: article.url,
      sourceName: article.source,
      metadata: {
        feedlyArticleId: article.id,
        url: article.url,
        source: article.source,
      },
    };

    addShowNotesSource(item);
  };

  // ============================================
  // Episodes
  // ============================================

  const fetchEpisodes = useCallback(async () => {
    setEpisodesLoading(true);
    try {
      const res = await fetch("/api/episodes?limit=20&hasTranscript=true");
      if (res.ok) {
        const data = await res.json();
        setEpisodes(data.episodes || []);
      }
    } catch {
      console.error("Failed to fetch episodes");
    } finally {
      setEpisodesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "episode" && episodes.length === 0) {
      fetchEpisodes();
    }
  }, [activeTab, episodes.length, fetchEpisodes]);

  const handleEpisodeAdd = async (episode: Episode) => {
    if (!episode.hasTranscript) return;

    // Don't add duplicates
    if (
      showNotesData.sourceItems.some(
        (s) => s.metadata?.sourceId === episode.id
      )
    ) {
      return;
    }

    setLoadingEpisodeId(episode.id);
    try {
      const res = await fetch(`/api/sources/${episode.id}`);
      if (!res.ok) throw new Error("Failed to load episode");

      const data = await res.json();
      const source = data.source;
      let transcriptText = "";
      if (source.transcripts && source.transcripts.length > 0) {
        transcriptText = source.transcripts[0].fullText || "";
      }

      if (!transcriptText) throw new Error("No transcript content found");

      const item: ShowNotesSourceItem = {
        id: crypto.randomUUID(),
        type: "episode",
        title: episode.title,
        content: transcriptText,
        metadata: { sourceId: episode.id, hasTranscript: true },
      };

      addShowNotesSource(item);
    } catch (error) {
      console.error("Failed to load episode:", error);
    } finally {
      setLoadingEpisodeId(null);
    }
  };

  // ============================================
  // URL / Idea / Guide handlers
  // ============================================

  const handleAddUrl = () => {
    if (!urlInput.trim()) return;
    const item: ShowNotesSourceItem = {
      id: crypto.randomUUID(),
      type: "url",
      title: urlInput.trim(),
      content: urlInput.trim(),
      url: urlInput.trim(),
    };
    addShowNotesSource(item);
    setUrlInput("");
  };

  const handleAddIdea = () => {
    if (!ideaInput.trim()) return;
    const item: ShowNotesSourceItem = {
      id: crypto.randomUUID(),
      type: "idea",
      title: ideaInput.trim().substring(0, 80),
      content: ideaInput.trim(),
    };
    addShowNotesSource(item);
    setIdeaInput("");
  };

  const handleGuideAdd = (guide: string) => {
    // Don't add duplicates
    if (
      showNotesData.sourceItems.some(
        (s) => s.type === "guide" && s.title === guide
      )
    ) {
      return;
    }
    const item: ShowNotesSourceItem = {
      id: crypto.randomUUID(),
      type: "guide",
      title: guide,
      content: guide,
    };
    addShowNotesSource(item);
  };

  // ============================================
  // Research handlers
  // ============================================

  const handleAddResearch = () => {
    if (!researchContent.trim()) return;

    // Auto-title: use manual title if provided, otherwise first line of content
    let title = researchTitle.trim();
    if (!title) {
      const firstLine = researchContent.trim().split("\n")[0];
      // Strip markdown heading markers
      title = firstLine.replace(/^#+\s*/, "").substring(0, 120);
    }

    const item: ShowNotesSourceItem = {
      id: crypto.randomUUID(),
      type: "research",
      title,
      content: researchContent.trim(),
      metadata: uploadFileName ? { fileName: uploadFileName } : undefined,
    };
    addShowNotesSource(item);

    // Reset form
    setResearchTitle("");
    setResearchContent("");
    setUploadFileName(null);
  };

  const handleResearchFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [".md", ".txt", ".markdown"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!validTypes.includes(ext)) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setResearchContent(text);
        // Use filename (minus extension) as default title
        const nameWithoutExt = file.name.replace(
          /\.(md|txt|markdown)$/i,
          ""
        );
        if (!researchTitle.trim()) {
          setResearchTitle(nameWithoutExt);
        }
        setUploadFileName(file.name);
      }
    };
    reader.readAsText(file);

    // Reset the input so the same file can be selected again
    e.target.value = "";
  };

  // ============================================
  // Move handlers
  // ============================================

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    reorderShowNotesSource(index, index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index >= showNotesData.sourceItems.length - 1) return;
    reorderShowNotesSource(index, index + 1);
  };

  // ============================================
  // Show name
  // ============================================

  const handleShowChange = (show: ShowName) => {
    setShowName(show, show === "custom" ? customShowName : undefined);
  };

  const handleCustomNameChange = (name: string) => {
    setCustomShowName(name);
    setShowName("custom", name);
  };

  // Check if an article is already added
  const isArticleAdded = (articleId: string) => {
    return showNotesData.sourceItems.some(
      (s) => s.metadata?.feedlyArticleId === articleId
    );
  };

  const isEpisodeAdded = (episodeId: string) => {
    return showNotesData.sourceItems.some(
      (s) => s.metadata?.sourceId === episodeId
    );
  };

  const isGuideAdded = (guide: string) => {
    return showNotesData.sourceItems.some(
      (s) => s.type === "guide" && s.title === guide
    );
  };

  // ============================================
  // Tab config
  // ============================================

  const tabs: { key: AddTab; label: string; icon: React.ReactNode }[] = [
    { key: "feedly", label: "Feedly", icon: <Rss className="h-4 w-4" /> },
    { key: "url", label: "URL", icon: <Link2 className="h-4 w-4" /> },
    { key: "idea", label: "Idea", icon: <Lightbulb className="h-4 w-4" /> },
    { key: "guide", label: "Guide", icon: <BookOpen className="h-4 w-4" /> },
    { key: "episode", label: "Episode", icon: <Mic className="h-4 w-4" /> },
    {
      key: "research",
      label: "Research",
      icon: <FlaskConical className="h-4 w-4" />,
    },
  ];

  // ============================================
  // Render
  // ============================================

  return (
    <>
      <WizardProgress />

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push("/create/mode")}
          className="flex items-center gap-2 text-[#888888] hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Mode
        </button>

        <h1 className="text-3xl font-bold mb-2 text-white">
          Show Notes Sources
        </h1>
        <p className="text-[#888888] mb-8">
          Add articles, ideas, guides, and episodes to build your show outline.
        </p>

        {/* ============================================ */}
        {/* Show Selector */}
        {/* ============================================ */}
        <div className="mb-8">
          <label className="block text-sm font-medium mb-3 text-white">
            Which show?
          </label>
          <div className="flex flex-wrap gap-2">
            {SHOWS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleShowChange(value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  showNotesData.show === value
                    ? "bg-[#F4A300] text-white"
                    : "bg-[#1A1A1A] border border-[#333333] text-[#888888] hover:border-[#F4A300]/50 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Custom show name input */}
          {showNotesData.show === "custom" && (
            <input
              type="text"
              value={customShowName}
              onChange={(e) => handleCustomNameChange(e.target.value)}
              placeholder="Enter show name..."
              className="mt-3 w-full max-w-md px-4 py-2 rounded border border-[#333333] bg-[#0D0D0D] text-white text-sm focus:outline-none focus:border-[#F4A300] focus:ring-1 focus:ring-[#F4A300]/20 placeholder-[#888888]"
            />
          )}
        </div>

        {/* ============================================ */}
        {/* Added Sources List */}
        {/* ============================================ */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Added Sources{" "}
              <span className="text-[#888888] font-normal text-sm">
                ({showNotesData.sourceItems.length})
              </span>
            </h2>
          </div>

          {showNotesData.sourceItems.length === 0 ? (
            <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-8 text-center">
              <FileText className="h-10 w-10 text-[#444444] mx-auto mb-3" />
              <p className="text-[#888888] mb-1">No sources added yet.</p>
              <p className="text-sm text-[#666666]">
                Use the tabs below to add articles, URLs, ideas, guides, or
                episodes.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {showNotesData.sourceItems.map((item, index) => {
                const badge = TYPE_BADGES[item.type];
                return (
                  <div
                    key={item.id}
                    className="bg-[#1A1A1A] border border-[#333333] rounded-lg p-4 flex items-start gap-3 group hover:border-[#444444] transition-colors"
                  >
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-1 pt-0.5">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-[#333333] disabled:opacity-20 disabled:cursor-not-allowed text-[#888888] hover:text-white transition-colors"
                        title="Move up"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={
                          index === showNotesData.sourceItems.length - 1
                        }
                        className="p-1 rounded hover:bg-[#333333] disabled:opacity-20 disabled:cursor-not-allowed text-[#888888] hover:text-white transition-colors"
                        title="Move down"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                        <span className="text-sm font-medium text-white truncate">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-xs text-[#666666] line-clamp-2">
                        {item.content.length > 100
                          ? item.content.substring(0, 100) + "..."
                          : item.content}
                      </p>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => removeShowNotesSource(item.id)}
                      className="p-1.5 rounded hover:bg-red-500/20 text-[#666666] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ============================================ */}
        {/* Add Sources (Tabbed) */}
        {/* ============================================ */}
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl overflow-hidden">
          {/* Tab Bar */}
          <div className="flex border-b border-[#333333] overflow-x-auto">
            {tabs.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === key
                    ? "border-[#F4A300] text-[#F4A300]"
                    : "border-transparent text-[#888888] hover:text-white"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* ============ Feedly Tab ============ */}
            {activeTab === "feedly" && (
              <div>
                {/* Not configured */}
                {feedlyConfigured === false && (
                  <div className="text-center py-8">
                    <Rss className="h-12 w-12 text-[#444444] mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">
                      Feedly Not Configured
                    </h3>
                    <p className="text-[#888888] mb-4">
                      Add your Feedly access token to pull articles from your
                      boards.
                    </p>
                    <p className="text-sm text-[#666666]">
                      Add{" "}
                      <code className="bg-[#0D0D0D] px-2 py-1 rounded">
                        FEEDLY_ACCESS_TOKEN
                      </code>{" "}
                      to your environment variables.
                    </p>
                  </div>
                )}

                {/* Loading boards */}
                {feedlyLoading && !selectedBoard && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-green-400" />
                    <span className="ml-2 text-[#888888]">
                      Loading boards...
                    </span>
                  </div>
                )}

                {/* Error */}
                {feedlyError && (
                  <div className="flex items-center gap-2 p-3 rounded mb-4 bg-red-500/10 border border-red-500/30">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <span className="text-sm text-red-400">{feedlyError}</span>
                  </div>
                )}

                {/* Board list */}
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
                                <span className="font-medium text-white block">
                                  {board.label}
                                </span>
                                {board.description && (
                                  <span className="text-xs text-[#666666]">
                                    {board.description}
                                  </span>
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
                      </div>
                    )}
                  </>
                )}

                {/* Article list */}
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
                        <span className="text-sm font-medium text-white">
                          {selectedBoard.label}
                        </span>
                      </div>
                    </div>

                    {feedlyLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-green-400" />
                        <span className="ml-2 text-[#888888]">
                          Loading articles...
                        </span>
                      </div>
                    ) : feedlyArticles.length > 0 ? (
                      <div className="grid gap-3 max-h-96 overflow-y-auto">
                        {feedlyArticles.map((article) => {
                          const added = isArticleAdded(article.id);
                          return (
                            <button
                              key={article.id}
                              onClick={() =>
                                !added && handleArticleAdd(article)
                              }
                              disabled={added}
                              className={`flex flex-col p-4 rounded border transition-colors text-left ${
                                added
                                  ? "border-green-500/30 bg-green-500/5 opacity-60 cursor-default"
                                  : "border-[#333333] hover:bg-[#0D0D0D] hover:border-[#444444]"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium text-white block line-clamp-2">
                                    {article.title}
                                  </span>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-xs text-green-400">
                                      {article.source}
                                    </span>
                                    <span className="text-xs text-[#444444]">
                                      &bull;
                                    </span>
                                    <span className="text-xs text-[#666666]">
                                      {article.publishedFormatted}
                                    </span>
                                  </div>
                                </div>
                                {added ? (
                                  <span className="text-xs text-green-400 whitespace-nowrap flex-shrink-0">
                                    Added
                                  </span>
                                ) : (
                                  <Plus className="h-4 w-4 text-[#888888] flex-shrink-0" />
                                )}
                              </div>
                              {article.contentPreview && (
                                <p className="text-sm text-[#666666] mt-2 line-clamp-2">
                                  {article.contentPreview}
                                </p>
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
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Rss className="h-8 w-8 text-[#444444] mx-auto mb-2" />
                        <p className="text-[#666666]">
                          No articles in this board.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ============ URL Tab ============ */}
            {activeTab === "url" && (
              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Add a URL
                </label>
                <p className="text-xs text-[#666666] mb-3">
                  Paste a link to a news article, study, or resource to include
                  in your show notes.
                </p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && urlInput.trim() && handleAddUrl()
                    }
                    placeholder="https://example.com/article"
                    className="flex-1 px-4 py-2 rounded border border-[#333333] bg-[#0D0D0D] text-white text-sm focus:outline-none focus:border-[#F4A300] focus:ring-1 focus:ring-[#F4A300]/20 placeholder-[#888888]"
                  />
                  <button
                    onClick={handleAddUrl}
                    disabled={!urlInput.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded bg-[#F4A300] hover:bg-[#D48F00] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* ============ Idea Tab ============ */}
            {activeTab === "idea" && (
              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Add a topic or idea
                </label>
                <p className="text-xs text-[#666666] mb-3">
                  Type a topic, talking point, or idea you want to cover on the
                  show.
                </p>
                <textarea
                  value={ideaInput}
                  onChange={(e) => setIdeaInput(e.target.value)}
                  placeholder="e.g., Talk about the connection between gut health and sleep quality for drivers..."
                  rows={4}
                  className="w-full px-4 py-3 rounded border border-[#333333] bg-[#0D0D0D] text-white text-sm resize-none focus:outline-none focus:border-[#F4A300] focus:ring-1 focus:ring-[#F4A300]/20 placeholder-[#888888]"
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleAddIdea}
                    disabled={!ideaInput.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded bg-[#F4A300] hover:bg-[#D48F00] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Idea
                  </button>
                </div>
              </div>
            )}

            {/* ============ Guide Tab ============ */}
            {activeTab === "guide" && (
              <div>
                <label className="block text-sm font-medium mb-3 text-white">
                  Select a guide to reference
                </label>
                <div className="grid gap-3">
                  {GUIDES.map((guide) => {
                    const added = isGuideAdded(guide);
                    return (
                      <button
                        key={guide}
                        onClick={() => !added && handleGuideAdd(guide)}
                        disabled={added}
                        className={`flex items-center justify-between p-4 rounded border transition-colors text-left ${
                          added
                            ? "border-green-500/30 bg-green-500/5 opacity-60 cursor-default"
                            : "border-[#333333] hover:bg-[#0D0D0D] hover:border-[#444444]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <BookOpen className="h-5 w-5 text-purple-400" />
                          <span className="font-medium text-white">
                            {guide}
                          </span>
                        </div>
                        {added ? (
                          <span className="text-xs text-green-400">Added</span>
                        ) : (
                          <Plus className="h-4 w-4 text-[#888888]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ============ Episode Tab ============ */}
            {activeTab === "episode" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-white">
                    Select an episode to reference
                  </label>
                  <button
                    onClick={fetchEpisodes}
                    disabled={episodesLoading}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-[#333333] hover:bg-[#0D0D0D] hover:border-[#444444] transition-colors disabled:opacity-50"
                  >
                    {episodesLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                    ) : (
                      <RefreshCw className="h-4 w-4 text-purple-400" />
                    )}
                    <span className="text-[#888888]">Refresh</span>
                  </button>
                </div>

                {episodesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                    <span className="ml-2 text-[#888888]">
                      Loading episodes...
                    </span>
                  </div>
                ) : episodes.length > 0 ? (
                  <div className="grid gap-3 max-h-80 overflow-y-auto">
                    {episodes.map((episode) => {
                      const added = isEpisodeAdded(episode.id);
                      return (
                        <button
                          key={episode.id}
                          onClick={() => !added && handleEpisodeAdd(episode)}
                          disabled={
                            added ||
                            !episode.hasTranscript ||
                            loadingEpisodeId !== null
                          }
                          className={`flex items-center justify-between p-4 rounded border transition-colors text-left ${
                            added
                              ? "border-green-500/30 bg-green-500/5 opacity-60 cursor-default"
                              : !episode.hasTranscript
                              ? "border-[#333333] opacity-40 cursor-not-allowed"
                              : "border-[#333333] hover:bg-[#0D0D0D] hover:border-[#444444]"
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Mic className="h-5 w-5 text-purple-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-white block truncate">
                                {episode.title}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                {episode.durationFormatted && (
                                  <span className="text-xs text-[#666666]">
                                    {episode.durationFormatted}
                                  </span>
                                )}
                                {!episode.hasTranscript && (
                                  <span className="text-xs text-[#666666]">
                                    No transcript
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {loadingEpisodeId === episode.id ? (
                            <Loader2 className="h-4 w-4 text-purple-400 animate-spin flex-shrink-0" />
                          ) : added ? (
                            <span className="text-xs text-green-400 flex-shrink-0">
                              Added
                            </span>
                          ) : (
                            <Plus className="h-4 w-4 text-[#888888] flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Mic className="h-8 w-8 text-[#444444] mx-auto mb-2" />
                    <p className="text-[#666666]">
                      No transcribed episodes found.
                    </p>
                    <p className="text-sm text-[#444444] mt-1">
                      Import and transcribe episodes first.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ============ Research Tab ============ */}
            {activeTab === "research" && (
              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Add research notes
                </label>
                <p className="text-xs text-[#666666] mb-4">
                  Paste an article summary from your Claude research project, or
                  upload a .md/.txt file.
                </p>

                {/* Mode Toggle: Paste / Upload */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setResearchMode("paste")}
                    className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
                      researchMode === "paste"
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                        : "bg-[#0D0D0D] border border-[#333333] text-[#888888] hover:border-[#444444]"
                    }`}
                  >
                    <FlaskConical className="h-4 w-4" />
                    Paste
                  </button>
                  <button
                    onClick={() => setResearchMode("upload")}
                    className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
                      researchMode === "upload"
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                        : "bg-[#0D0D0D] border border-[#333333] text-[#888888] hover:border-[#444444]"
                    }`}
                  >
                    <Upload className="h-4 w-4" />
                    Upload File
                  </button>
                </div>

                {/* Title field (shared by both modes) */}
                <div className="mb-3">
                  <label className="block text-xs text-[#888888] mb-1">
                    Title{" "}
                    <span className="text-[#666666]">
                      (optional — auto-detected from first line)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={researchTitle}
                    onChange={(e) => setResearchTitle(e.target.value)}
                    placeholder="e.g., Nitric oxide and cardiovascular health in sedentary workers"
                    className="w-full px-4 py-2 rounded border border-[#333333] bg-[#0D0D0D] text-white text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 placeholder-[#666666]"
                  />
                </div>

                {/* Paste mode */}
                {researchMode === "paste" && (
                  <div>
                    <textarea
                      value={researchContent}
                      onChange={(e) => setResearchContent(e.target.value)}
                      placeholder="Paste your article research/analysis here..."
                      rows={10}
                      className="w-full px-4 py-3 rounded border border-[#333333] bg-[#0D0D0D] text-white text-sm resize-y focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 placeholder-[#666666] font-mono"
                    />
                    {researchContent && (
                      <p className="text-xs text-[#666666] mt-1">
                        {researchContent.length.toLocaleString()} characters
                      </p>
                    )}
                  </div>
                )}

                {/* Upload mode */}
                {researchMode === "upload" && (
                  <div>
                    <label className="flex flex-col items-center justify-center w-full h-32 rounded border-2 border-dashed border-[#333333] bg-[#0D0D0D] hover:border-cyan-400/50 hover:bg-cyan-500/5 transition-colors cursor-pointer">
                      <Upload className="h-8 w-8 text-[#444444] mb-2" />
                      <span className="text-sm text-[#888888]">
                        {uploadFileName
                          ? uploadFileName
                          : "Drop a .md or .txt file, or click to browse"}
                      </span>
                      <span className="text-xs text-[#666666] mt-1">
                        Markdown and plain text files only
                      </span>
                      <input
                        type="file"
                        accept=".md,.txt,.markdown"
                        onChange={handleResearchFileUpload}
                        className="hidden"
                      />
                    </label>
                    {researchContent && (
                      <div className="mt-3 p-3 rounded border border-[#333333] bg-[#0D0D0D] max-h-40 overflow-y-auto">
                        <p className="text-xs text-[#888888] mb-1">
                          Preview ({researchContent.length.toLocaleString()}{" "}
                          characters):
                        </p>
                        <p className="text-xs text-[#666666] whitespace-pre-wrap line-clamp-6">
                          {researchContent.substring(0, 500)}
                          {researchContent.length > 500 ? "..." : ""}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Add button */}
                <div className="flex justify-end mt-4">
                  <button
                    onClick={handleAddResearch}
                    disabled={!researchContent.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded bg-[#F4A300] hover:bg-[#D48F00] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Research
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============================================ */}
        {/* Navigation */}
        {/* ============================================ */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={() => router.push("/create/mode")}
            className="flex items-center gap-2 px-4 py-2 rounded border border-[#333333] text-[#888888] hover:text-white hover:border-[#444444] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <button
            onClick={() => router.push("/create/show-notes/generate")}
            disabled={showNotesData.sourceItems.length === 0}
            className="flex items-center gap-2 px-6 py-2 rounded bg-[#F4A300] hover:bg-[#D48F00] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}
