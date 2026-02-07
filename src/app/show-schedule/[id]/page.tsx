"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/navigation/Sidebar";
import {
  ArrowLeft,
  Radio,
  Clock,
  CalendarDays,
  FileText,
  MessageSquare,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { format } from "date-fns";

// ============================================
// Types
// ============================================

type ShowName = "tbb" | "destination_health" | "power_hour" | "coffee_with_kevin" | "custom";

interface ShowNotesSegment {
  id: string;
  order: number;
  title: string;
  talkingPoints: string[];
  suggestedTransition: string;
  sourceItemIds: string[];
  statsToMention?: string[];
  estimatedMinutes?: number;
  type: string;
}

interface ShowNotesConnection {
  fromSourceId: string;
  toSourceId: string;
  connectionType: string;
  description: string;
}

interface ShowNotesDetail {
  id: string;
  showName: ShowName;
  customShowName: string | null;
  episodeTitle: string | null;
  sourceItems: Array<{ id: string; title: string; type: string; content: string; url?: string }>;
  outline: { segments: ShowNotesSegment[]; connectionMap: ShowNotesConnection[]; estimatedDuration?: string } | null;
  publicNotes: { title: string; description: string; topicsList: string[]; keyTakeaways: string[] } | null;
  teaserText: string | null;
  status: string;
  showDate: string | null;
  teaserScheduledFor: string | null;
  createdAt: string;
  updatedAt: string;
}

const SHOW_LABELS: Record<ShowName, string> = {
  tbb: "Trucking Business & Beyond",
  destination_health: "Destination Health",
  power_hour: "Power Hour",
  coffee_with_kevin: "Coffee with Kevin",
  custom: "Custom",
};

const SHOW_COLORS: Record<ShowName, string> = {
  tbb: "text-[#FF4500]",
  destination_health: "text-[#F4A300]",
  power_hour: "text-blue-400",
  coffee_with_kevin: "text-emerald-400",
  custom: "text-purple-400",
};

const SEGMENT_TYPE_LABELS: Record<string, string> = {
  opening: "Opening",
  topic: "Topic",
  deep_dive: "Deep Dive",
  caller_segment: "Caller Segment",
  product_mention: "Product Mention",
  closing: "Closing",
};

// ============================================
// Component
// ============================================

export default function ShowNotesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [showNotes, setShowNotes] = useState<ShowNotesDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchShowNotes = async () => {
      try {
        const res = await fetch(`/api/show-notes/${id}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setShowNotes(data.showNotes);
      } catch {
        setError("Show notes not found");
      } finally {
        setLoading(false);
      }
    };
    fetchShowNotes();
  }, [id]);

  const getShowLabel = () => {
    if (!showNotes) return "";
    if (showNotes.showName === "custom" && showNotes.customShowName) return showNotes.customShowName;
    return SHOW_LABELS[showNotes.showName] || showNotes.showName;
  };

  const handleCopyOutline = () => {
    if (!showNotes?.outline) return;
    const lines: string[] = [];
    lines.push(`# ${showNotes.episodeTitle || getShowLabel()} - Show Notes`);
    lines.push("");
    for (const seg of showNotes.outline.segments) {
      lines.push(`## ${seg.title}`);
      for (const pt of seg.talkingPoints) {
        lines.push(`- ${pt}`);
      }
      if (seg.statsToMention?.length) {
        lines.push("");
        lines.push("Stats:");
        for (const stat of seg.statsToMention) {
          lines.push(`  * ${stat}`);
        }
      }
      lines.push("");
    }
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#0D0D0D]">
        <Sidebar />
        <main className="flex-1 ml-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-[#F4A300] animate-spin" />
        </main>
      </div>
    );
  }

  if (error || !showNotes) {
    return (
      <div className="flex min-h-screen bg-[#0D0D0D]">
        <Sidebar />
        <main className="flex-1 ml-64">
          <div className="h-1 bg-gradient-to-r from-[#FF4500] to-[#F4A300]" />
          <div className="max-w-4xl mx-auto px-8 py-12 text-center">
            <p className="text-[#888888]">{error || "Not found"}</p>
            <button
              onClick={() => router.push("/show-schedule")}
              className="mt-4 text-[#F4A300] hover:underline"
            >
              Back to Schedule
            </button>
          </div>
        </main>
      </div>
    );
  }

  const showColor = SHOW_COLORS[showNotes.showName] || SHOW_COLORS.custom;

  return (
    <div className="flex min-h-screen bg-[#0D0D0D]">
      <Sidebar />

      <main className="flex-1 ml-64">
        <div className="h-1 bg-gradient-to-r from-[#FF4500] to-[#F4A300]" />

        <div className="max-w-4xl mx-auto px-8 py-8">
          {/* Back */}
          <button
            onClick={() => router.push("/show-schedule")}
            className="flex items-center gap-2 text-[#888888] hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Schedule
          </button>

          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Radio className={`h-5 w-5 ${showColor}`} />
                <span className={`text-sm font-medium ${showColor}`}>{getShowLabel()}</span>
                <span className="text-xs text-[#555555] px-2 py-0.5 rounded bg-[#1A1A1A] border border-[#333333]">
                  {showNotes.status}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white">
                {showNotes.episodeTitle || "Untitled Episode"}
              </h1>
            </div>
          </div>

          {/* Dates */}
          {(showNotes.showDate || showNotes.teaserScheduledFor) && (
            <div className="flex gap-6 mb-8">
              {showNotes.showDate && (
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-[#F4A300]" />
                  <span className="text-[#888888]">Air Date:</span>
                  <span className="text-white">{format(new Date(showNotes.showDate), "EEE, MMM d · h:mm a")}</span>
                </div>
              )}
              {showNotes.teaserScheduledFor && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-[#888888]" />
                  <span className="text-[#888888]">Teaser:</span>
                  <span className="text-white">{format(new Date(showNotes.teaserScheduledFor), "EEE, MMM d · h:mm a")}</span>
                </div>
              )}
            </div>
          )}

          {/* Outline */}
          {showNotes.outline && (
            <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#F4A300]" />
                  Show Outline
                  {showNotes.outline.estimatedDuration && (
                    <span className="text-[#666666] normal-case font-normal">
                      · ~{showNotes.outline.estimatedDuration}
                    </span>
                  )}
                </h2>
                <button
                  onClick={handleCopyOutline}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#333333] text-[#888888] hover:text-white hover:border-[#444444] transition-colors text-xs"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              <div className="space-y-4">
                {showNotes.outline.segments.map((seg, i) => (
                  <div key={seg.id || i} className="bg-[#0D0D0D] border border-[#222222] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-[#555555] font-mono">#{i + 1}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[#1A1A1A] text-[#888888] border border-[#333333]">
                        {SEGMENT_TYPE_LABELS[seg.type] || seg.type}
                      </span>
                      {seg.estimatedMinutes && (
                        <span className="text-xs text-[#555555]">~{seg.estimatedMinutes}min</span>
                      )}
                    </div>
                    <h3 className="text-white font-medium mb-2">{seg.title}</h3>
                    <ul className="space-y-1">
                      {seg.talkingPoints.map((pt, j) => (
                        <li key={j} className="text-sm text-[#cccccc] flex gap-2">
                          <span className="text-[#555555] shrink-0">-</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                    {seg.statsToMention && seg.statsToMention.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-[#222222]">
                        {seg.statsToMention.map((stat, j) => (
                          <p key={j} className="text-xs text-[#F4A300]">📊 {stat}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Teaser Text */}
          {showNotes.teaserText && (
            <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6 mb-6">
              <h2 className="text-sm font-medium text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#F4A300]" />
                Teaser Post
              </h2>
              <p className="text-[#cccccc] whitespace-pre-wrap leading-relaxed text-sm">
                {showNotes.teaserText}
              </p>
            </div>
          )}

          {/* Public Show Notes */}
          {showNotes.publicNotes && (
            <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6 mb-6">
              <h2 className="text-sm font-medium text-white uppercase tracking-wider mb-3">
                Public Show Notes
              </h2>
              <p className="text-sm text-[#cccccc] mb-3">{showNotes.publicNotes.description}</p>
              {showNotes.publicNotes.topicsList.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-[#888888] mb-1">Topics:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {showNotes.publicNotes.topicsList.map((topic, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded bg-[#0D0D0D] text-[#cccccc] border border-[#333333]">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {showNotes.publicNotes.keyTakeaways.length > 0 && (
                <div>
                  <p className="text-xs text-[#888888] mb-1">Key Takeaways:</p>
                  <ul className="space-y-1">
                    {showNotes.publicNotes.keyTakeaways.map((ta, i) => (
                      <li key={i} className="text-sm text-[#cccccc] flex gap-2">
                        <span className="text-[#F4A300] shrink-0">-</span>
                        <span>{ta}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Sources */}
          {showNotes.sourceItems && showNotes.sourceItems.length > 0 && (
            <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6">
              <h2 className="text-sm font-medium text-white uppercase tracking-wider mb-3">
                Sources ({showNotes.sourceItems.length})
              </h2>
              <div className="space-y-2">
                {showNotes.sourceItems.map((src, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[#0D0D0D] text-[#888888] border border-[#222222] font-mono">
                      {src.type}
                    </span>
                    <span className="text-[#cccccc]">{src.title}</span>
                    {src.url && (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#F4A300] hover:underline text-xs"
                      >
                        Link
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
