"use client";

import { useState } from "react";
import { useWizardStore, ShowName, ShowNotesSegment } from "../store";
import {
  X,
  Copy,
  Download,
  Clock,
  BarChart3,
  BookOpen,
  Check,
} from "lucide-react";

// ============================================
// Constants
// ============================================

const SHOW_LABELS: Record<ShowName, string> = {
  tbb: "Trucking Business & Beyond",
  destination_health: "Destination Health",
  power_hour: "Power Hour",
  coffee_with_kevin: "Coffee with Kevin",
  custom: "Show",
};

const SEGMENT_TYPE_BADGES: Record<
  ShowNotesSegment["type"],
  { label: string; color: string }
> = {
  opening: { label: "Opening", color: "bg-[#F4A300]/20 text-[#F4A300]" },
  topic: { label: "Topic", color: "bg-blue-500/20 text-blue-400" },
  deep_dive: { label: "Deep Dive", color: "bg-purple-500/20 text-purple-400" },
  caller_segment: {
    label: "Caller Segment",
    color: "bg-green-500/20 text-green-400",
  },
  product_mention: {
    label: "Product Mention",
    color: "bg-rose-500/20 text-rose-400",
  },
  closing: { label: "Closing", color: "bg-gray-500/20 text-gray-400" },
};

// ============================================
// Component
// ============================================

export function ShowNotesDrawer() {
  const { showNotesData } = useWizardStore();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const outline = showNotesData.outline;
  const publicNotes = showNotesData.publicNotes;

  // Only show when outline data exists
  if (!outline) return null;

  const getShowLabel = () => {
    if (showNotesData.show === "custom" && showNotesData.customShowName) {
      return showNotesData.customShowName;
    }
    return SHOW_LABELS[showNotesData.show];
  };

  const buildMarkdown = () => {
    const lines: string[] = [];

    if (publicNotes) {
      lines.push(`# ${publicNotes.title}`);
      lines.push("");
      lines.push(publicNotes.description);
      lines.push("");

      if (publicNotes.topicsList.length > 0) {
        lines.push("## Topics");
        publicNotes.topicsList.forEach((t) => lines.push(`- ${t}`));
        lines.push("");
      }

      if (publicNotes.keyTakeaways.length > 0) {
        lines.push("## Key Takeaways");
        publicNotes.keyTakeaways.forEach((t) => lines.push(`- ${t}`));
        lines.push("");
      }
    }

    lines.push("---");
    lines.push("");
    lines.push("# Show Prep Outline");
    if (outline.estimatedDuration) {
      lines.push(`Estimated Duration: ${outline.estimatedDuration}`);
    }
    lines.push("");

    outline.segments.forEach((seg, i) => {
      lines.push(
        `## ${i + 1}. ${seg.title} [${SEGMENT_TYPE_BADGES[seg.type].label}]${seg.estimatedMinutes ? ` (~${seg.estimatedMinutes} min)` : ""}`
      );
      lines.push("");

      if (seg.talkingPoints.length > 0) {
        lines.push("### Talking Points");
        seg.talkingPoints.forEach((p) => lines.push(`- ${p}`));
        lines.push("");
      }

      if (seg.statsToMention && seg.statsToMention.length > 0) {
        lines.push("### Stats to Mention");
        seg.statsToMention.forEach((s) => lines.push(`- ${s}`));
        lines.push("");
      }

      if (seg.suggestedTransition) {
        lines.push(`*Transition: ${seg.suggestedTransition}*`);
        lines.push("");
      }
    });

    return lines.join("\n");
  };

  const handleCopy = async () => {
    const md = buildMarkdown();
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const md = buildMarkdown();
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `show-notes-${showNotesData.show}-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-[#FF4500] to-[#CC3700] hover:from-[#FF5500] hover:to-[#DD4700] text-white font-medium shadow-lg shadow-[#FF4500]/20 transition-all hover:scale-105"
        >
          <BookOpen className="w-5 h-5" />
          Show Prep
        </button>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-96 max-w-[90vw] bg-[#1A1A1A] border-l border-[#333333] shadow-2xl flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#333333]">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#F4A300]" />
              Show Prep
            </h2>
            <p className="text-sm text-[#888888] mt-0.5">
              {getShowLabel()}
              {outline.estimatedDuration && (
                <span className="ml-2 inline-flex items-center gap-1 text-[#F4A300]">
                  <Clock className="w-3 h-3" />
                  {outline.estimatedDuration}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-[#333333] text-[#888888] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Outline */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {outline.segments.map((segment, index) => {
            const badge = SEGMENT_TYPE_BADGES[segment.type];
            return (
              <div
                key={segment.id}
                className="bg-[#0D0D0D] border border-[#333333] rounded-lg p-4"
              >
                {/* Segment Header */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs text-[#666666] font-mono">
                    {index + 1}.
                  </span>
                  <h3 className="text-sm font-semibold text-white flex-1 min-w-0">
                    {segment.title}
                  </h3>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.color}`}
                  >
                    {badge.label}
                  </span>
                  {segment.estimatedMinutes && (
                    <span className="text-[10px] text-[#666666] flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {segment.estimatedMinutes}m
                    </span>
                  )}
                </div>

                {/* Talking Points */}
                <ul className="space-y-1 mb-2">
                  {segment.talkingPoints.map((point, pi) => (
                    <li key={pi} className="flex items-start gap-2">
                      <span className="w-1 h-1 bg-[#F4A300] rounded-full mt-1.5 flex-shrink-0" />
                      <span className="text-xs text-[#cccccc] leading-relaxed">
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Stats */}
                {segment.statsToMention && segment.statsToMention.length > 0 && (
                  <div className="p-2 bg-[#F4A300]/5 border border-[#F4A300]/20 rounded mt-2">
                    <p className="text-[10px] font-medium text-[#F4A300] mb-1 flex items-center gap-1">
                      <BarChart3 className="h-2.5 w-2.5" />
                      Stats
                    </p>
                    <ul className="space-y-0.5">
                      {segment.statsToMention.map((stat, si) => (
                        <li
                          key={si}
                          className="text-xs text-[#cccccc] flex items-start gap-1.5"
                        >
                          <span className="text-[#F4A300]">&bull;</span>
                          {stat}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Transition */}
                {segment.suggestedTransition && (
                  <p className="text-[10px] text-[#666666] italic mt-2">
                    Transition: {segment.suggestedTransition}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-[#333333] flex gap-2">
          <button
            onClick={handleCopy}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border transition-colors text-sm font-medium ${
              copied
                ? "border-green-500/50 text-green-400"
                : "border-[#333333] text-[#888888] hover:text-white hover:border-[#444444]"
            }`}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-[#333333] text-[#888888] hover:text-white hover:border-[#444444] transition-colors text-sm font-medium"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
      </div>
    </>
  );
}
