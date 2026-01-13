"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWizardStore, SourceType } from "../../store";
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

export function Step1Source() {
  const router = useRouter();
  const { setSource, sourceType, sourceContent, nextStep, goToStep, currentStep, reset } = useWizardStore();
  const [selectedType, setSelectedType] = useState<SourceType | null>(sourceType);
  const [content, setContent] = useState(sourceContent);

  // Episode state
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [dropboxStatus, setDropboxStatus] = useState<DropboxStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Reset wizard state when entering step 1 fresh
  useEffect(() => {
    // Reset the entire wizard when landing on step 1
    reset();
  }, []); // Only on mount

  // Fetch episodes and Dropbox status when episode is selected
  const fetchEpisodes = useCallback(async () => {
    setEpisodesLoading(true);
    try {
      const [episodesRes, statusRes] = await Promise.all([
        fetch("/api/episodes?limit=20&hasTranscript=true"),
        fetch("/api/dropbox/sync"),
      ]);

      if (episodesRes.ok) {
        const data = await episodesRes.json();
        setEpisodes(data.episodes || []);
      }

      if (statusRes.ok) {
        const status = await statusRes.json();
        setDropboxStatus(status);
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
          <div className="bg-[#1A1A1A] rounded-lg border border-[#333333] p-6">
            <label className="block text-sm font-medium mb-2 text-white">
              What's your idea?
            </label>
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Share a stat, quote, tip, or topic you want to turn into social content..."
              rows={4}
              className="w-full px-4 py-3 rounded border border-[#333333] bg-[#0D0D0D] text-white resize-none focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]/20 placeholder-[#888888]"
            />
            <p className="text-xs text-[#888888] mt-2">
              Be specific! The more detail you give, the better content I can
              create.
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

      {/* Guide Selector */}
      {selectedType === "guide" && (
        <div className="bg-[#1A1A1A] rounded-lg border border-[#333333] p-6 animate-in slide-in-from-bottom-4 duration-300">
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
      )}

      {/* Product Selector */}
      {selectedType === "product" && (
        <div className="bg-[#1A1A1A] rounded-lg border border-[#333333] p-6 animate-in slide-in-from-bottom-4 duration-300">
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
      )}

      {/* Success Story Input */}
      {selectedType === "success_story" && (
        <div className="bg-[#1A1A1A] rounded-lg border border-[#333333] p-6 animate-in slide-in-from-bottom-4 duration-300">
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
      )}

      {/* Episode Selector */}
      {selectedType === "episode" && (
        <div className="bg-[#1A1A1A] rounded-lg border border-[#333333] p-6 animate-in slide-in-from-bottom-4 duration-300">
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
                  onClick={() => {
                    setContent(episode.title);
                    setSource("episode", episode.title, episode.title);
                    nextStep();
                    router.push("/create/mode");
                  }}
                  className="flex items-center justify-between p-4 rounded border border-[#333333] hover:bg-[#0D0D0D] hover:border-[#444444] transition-colors text-left"
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
                  <ArrowRight className="h-4 w-4 text-[#888888] flex-shrink-0" />
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
        <div className="bg-[#1A1A1A] rounded-lg border border-[#333333] p-6 animate-in slide-in-from-bottom-4 duration-300">
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
      )}
    </div>
  );
}
