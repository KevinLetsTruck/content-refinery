"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWizardStore, ShowNotesSegment } from "../../store";
import { WizardProgress } from "../../components/WizardProgress";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Clock,
  Link2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Save,
  Loader2,
  BarChart3,
  X,
  Edit3,
  Check,
} from "lucide-react";

// ============================================
// Constants
// ============================================

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

const SEGMENT_TYPES: ShowNotesSegment["type"][] = [
  "opening",
  "topic",
  "deep_dive",
  "caller_segment",
  "product_mention",
  "closing",
];

// ============================================
// Component
// ============================================

export default function ShowNotesOutlinePage() {
  const router = useRouter();
  const {
    showNotesData,
    updateOutlineSegment,
    removeOutlineSegment,
    reorderOutlineSegment,
    addOutlineSegment,
    setPublicShowNotes,
    setShowNotesSavedId,
    currentStep,
    goToStep,
  } = useWizardStore();

  const [publicNotesOpen, setPublicNotesOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [editingPointKey, setEditingPointKey] = useState<string | null>(null);
  const [editPointValue, setEditPointValue] = useState("");
  const [newPointSegmentId, setNewPointSegmentId] = useState<string | null>(
    null
  );
  const [newPointValue, setNewPointValue] = useState("");
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const outline = showNotesData.outline;
  const publicNotes = showNotesData.publicNotes;

  // Ensure we're on step 5
  useEffect(() => {
    if (currentStep !== 5) {
      goToStep(5);
    }
  }, [currentStep, goToStep]);

  // Redirect if no outline
  useEffect(() => {
    if (!outline) {
      router.push("/create/show-notes/sources");
    }
  }, [outline, router]);

  // Close export menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target as Node)
      ) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!outline) return null;

  // ============================================
  // Helpers
  // ============================================

  const getSourceTitle = (sourceId: string) => {
    const item = showNotesData.sourceItems.find((s) => s.id === sourceId);
    return item?.title || "Unknown Source";
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

  // ============================================
  // Handlers
  // ============================================

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/show-notes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          show: showNotesData.show,
          customShowName: showNotesData.customShowName,
          sourceItems: showNotesData.sourceItems,
          outline: showNotesData.outline,
          publicNotes: showNotesData.publicNotes,
          teaserText: showNotesData.teaserText,
        }),
      });

      if (!res.ok) throw new Error("Save failed");

      const data = await res.json();
      if (data.id) {
        setShowNotesSavedId(data.id);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      alert("Failed to save show notes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyToClipboard = async () => {
    const md = buildMarkdown();
    await navigator.clipboard.writeText(md);
    setExportMenuOpen(false);
  };

  const handleDownloadMarkdown = () => {
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
    setExportMenuOpen(false);
  };

  const handleAddSegment = () => {
    const newSeg: ShowNotesSegment = {
      id: crypto.randomUUID(),
      order: outline.segments.length,
      title: "New Segment",
      talkingPoints: [""],
      suggestedTransition: "",
      sourceItemIds: [],
      type: "topic",
    };
    addOutlineSegment(newSeg);
  };

  const handleStartEditTitle = (seg: ShowNotesSegment) => {
    setEditingTitleId(seg.id);
    setEditTitleValue(seg.title);
  };

  const handleSaveTitle = (segId: string) => {
    if (editTitleValue.trim()) {
      updateOutlineSegment(segId, { title: editTitleValue.trim() });
    }
    setEditingTitleId(null);
  };

  const handleStartEditPoint = (segId: string, pointIndex: number) => {
    const key = `${segId}-${pointIndex}`;
    const seg = outline.segments.find((s) => s.id === segId);
    if (!seg) return;
    setEditingPointKey(key);
    setEditPointValue(seg.talkingPoints[pointIndex]);
  };

  const handleSavePoint = (segId: string, pointIndex: number) => {
    const seg = outline.segments.find((s) => s.id === segId);
    if (!seg) return;
    const updated = [...seg.talkingPoints];
    updated[pointIndex] = editPointValue;
    updateOutlineSegment(segId, { talkingPoints: updated });
    setEditingPointKey(null);
  };

  const handleDeletePoint = (segId: string, pointIndex: number) => {
    const seg = outline.segments.find((s) => s.id === segId);
    if (!seg) return;
    const updated = seg.talkingPoints.filter((_, i) => i !== pointIndex);
    updateOutlineSegment(segId, {
      talkingPoints: updated.length > 0 ? updated : [""],
    });
  };

  const handleAddPoint = (segId: string) => {
    if (!newPointValue.trim()) return;
    const seg = outline.segments.find((s) => s.id === segId);
    if (!seg) return;
    updateOutlineSegment(segId, {
      talkingPoints: [...seg.talkingPoints, newPointValue.trim()],
    });
    setNewPointValue("");
    setNewPointSegmentId(null);
  };

  const handleMoveSegmentUp = (index: number) => {
    if (index <= 0) return;
    reorderOutlineSegment(index, index - 1);
  };

  const handleMoveSegmentDown = (index: number) => {
    if (index >= outline.segments.length - 1) return;
    reorderOutlineSegment(index, index + 1);
  };

  // ============================================
  // Public Notes Editing
  // ============================================

  const handlePublicNoteChange = (
    field: "title" | "description",
    value: string
  ) => {
    if (!publicNotes) return;
    setPublicShowNotes({ ...publicNotes, [field]: value });
  };

  const handleTopicChange = (index: number, value: string) => {
    if (!publicNotes) return;
    const updated = [...publicNotes.topicsList];
    updated[index] = value;
    setPublicShowNotes({ ...publicNotes, topicsList: updated });
  };

  const handleTakeawayChange = (index: number, value: string) => {
    if (!publicNotes) return;
    const updated = [...publicNotes.keyTakeaways];
    updated[index] = value;
    setPublicShowNotes({ ...publicNotes, keyTakeaways: updated });
  };

  const handleAddTopic = () => {
    if (!publicNotes) return;
    setPublicShowNotes({
      ...publicNotes,
      topicsList: [...publicNotes.topicsList, ""],
    });
  };

  const handleRemoveTopic = (index: number) => {
    if (!publicNotes) return;
    setPublicShowNotes({
      ...publicNotes,
      topicsList: publicNotes.topicsList.filter((_, i) => i !== index),
    });
  };

  const handleAddTakeaway = () => {
    if (!publicNotes) return;
    setPublicShowNotes({
      ...publicNotes,
      keyTakeaways: [...publicNotes.keyTakeaways, ""],
    });
  };

  const handleRemoveTakeaway = (index: number) => {
    if (!publicNotes) return;
    setPublicShowNotes({
      ...publicNotes,
      keyTakeaways: publicNotes.keyTakeaways.filter((_, i) => i !== index),
    });
  };

  // ============================================
  // Render
  // ============================================

  return (
    <>
      <WizardProgress />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push("/create/show-notes/sources")}
          className="flex items-center gap-2 text-[#888888] hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sources
        </button>

        {/* ============================================ */}
        {/* Two Column Layout */}
        {/* ============================================ */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Outline (2/3 width) */}
          <div className="lg:col-span-2">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">
                  Show Prep Outline
                </h1>
                {outline.estimatedDuration && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4A300]/10 text-[#F4A300] text-sm font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    {outline.estimatedDuration}
                  </span>
                )}
              </div>
            </div>

            {/* Segment Cards */}
            <div className="space-y-4">
              {outline.segments.map((segment, index) => {
                const badge = SEGMENT_TYPE_BADGES[segment.type];
                return (
                  <div
                    key={segment.id}
                    className="bg-[#1A1A1A] border border-[#333333] rounded-xl overflow-hidden group"
                  >
                    {/* Segment Header */}
                    <div className="flex items-start gap-3 p-5 pb-3">
                      {/* Reorder controls */}
                      <div className="flex flex-col gap-1 pt-0.5">
                        <button
                          onClick={() => handleMoveSegmentUp(index)}
                          disabled={index === 0}
                          className="p-1 rounded hover:bg-[#333333] disabled:opacity-20 disabled:cursor-not-allowed text-[#888888] hover:text-white transition-colors"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleMoveSegmentDown(index)}
                          disabled={index === outline.segments.length - 1}
                          className="p-1 rounded hover:bg-[#333333] disabled:opacity-20 disabled:cursor-not-allowed text-[#888888] hover:text-white transition-colors"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Title and badges */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {/* Editable title */}
                          {editingTitleId === segment.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={editTitleValue}
                                onChange={(e) =>
                                  setEditTitleValue(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    handleSaveTitle(segment.id);
                                  if (e.key === "Escape")
                                    setEditingTitleId(null);
                                }}
                                autoFocus
                                className="flex-1 px-2 py-1 rounded border border-[#F4A300] bg-[#0D0D0D] text-white text-lg font-semibold focus:outline-none"
                              />
                              <button
                                onClick={() => handleSaveTitle(segment.id)}
                                className="p-1 rounded hover:bg-[#333333] text-green-400"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <h3
                              onClick={() => handleStartEditTitle(segment)}
                              className="text-lg font-semibold text-white cursor-pointer hover:text-[#F4A300] transition-colors"
                              title="Click to edit"
                            >
                              {segment.title}
                            </h3>
                          )}
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                          {segment.estimatedMinutes && (
                            <span className="text-xs text-[#666666] flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {segment.estimatedMinutes} min
                            </span>
                          )}
                        </div>

                        {/* Type selector */}
                        <select
                          value={segment.type}
                          onChange={(e) =>
                            updateOutlineSegment(segment.id, {
                              type: e.target
                                .value as ShowNotesSegment["type"],
                            })
                          }
                          className="text-xs bg-[#0D0D0D] border border-[#333333] rounded px-2 py-1 text-[#888888] focus:outline-none focus:border-[#F4A300] mt-1"
                        >
                          {SEGMENT_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {SEGMENT_TYPE_BADGES[t].label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Delete segment */}
                      <button
                        onClick={() => removeOutlineSegment(segment.id)}
                        className="p-1.5 rounded hover:bg-red-500/20 text-[#666666] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete segment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Talking Points */}
                    <div className="px-5 pb-3">
                      <p className="text-xs font-medium text-[#888888] uppercase tracking-wider mb-2">
                        Talking Points
                      </p>
                      <ul className="space-y-1.5">
                        {segment.talkingPoints.map((point, pi) => {
                          const pointKey = `${segment.id}-${pi}`;
                          return (
                            <li
                              key={pi}
                              className="flex items-start gap-2 group/point"
                            >
                              <span className="w-1.5 h-1.5 bg-[#F4A300] rounded-full mt-2 flex-shrink-0" />
                              {editingPointKey === pointKey ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <input
                                    type="text"
                                    value={editPointValue}
                                    onChange={(e) =>
                                      setEditPointValue(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter")
                                        handleSavePoint(segment.id, pi);
                                      if (e.key === "Escape")
                                        setEditingPointKey(null);
                                    }}
                                    autoFocus
                                    className="flex-1 px-2 py-1 rounded border border-[#F4A300] bg-[#0D0D0D] text-white text-sm focus:outline-none"
                                  />
                                  <button
                                    onClick={() =>
                                      handleSavePoint(segment.id, pi)
                                    }
                                    className="p-1 rounded hover:bg-[#333333] text-green-400"
                                  >
                                    <Check className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span
                                    onClick={() =>
                                      handleStartEditPoint(segment.id, pi)
                                    }
                                    className="text-sm text-[#cccccc] cursor-pointer hover:text-white transition-colors flex-1"
                                    title="Click to edit"
                                  >
                                    {point}
                                  </span>
                                  <div className="flex items-center gap-1 opacity-0 group-hover/point:opacity-100 transition-opacity">
                                    <button
                                      onClick={() =>
                                        handleStartEditPoint(segment.id, pi)
                                      }
                                      className="p-0.5 rounded hover:bg-[#333333] text-[#666666] hover:text-white"
                                    >
                                      <Edit3 className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeletePoint(segment.id, pi)
                                      }
                                      className="p-0.5 rounded hover:bg-red-500/20 text-[#666666] hover:text-red-400"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                </>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                      {/* Add new talking point */}
                      {newPointSegmentId === segment.id ? (
                        <div className="flex items-center gap-2 mt-2 ml-3.5">
                          <input
                            type="text"
                            value={newPointValue}
                            onChange={(e) => setNewPointValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleAddPoint(segment.id);
                              if (e.key === "Escape") {
                                setNewPointSegmentId(null);
                                setNewPointValue("");
                              }
                            }}
                            autoFocus
                            placeholder="New talking point..."
                            className="flex-1 px-2 py-1 rounded border border-[#333333] bg-[#0D0D0D] text-white text-sm focus:outline-none focus:border-[#F4A300] placeholder-[#666666]"
                          />
                          <button
                            onClick={() => handleAddPoint(segment.id)}
                            disabled={!newPointValue.trim()}
                            className="p-1 rounded hover:bg-[#333333] text-green-400 disabled:opacity-30"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => {
                              setNewPointSegmentId(null);
                              setNewPointValue("");
                            }}
                            className="p-1 rounded hover:bg-[#333333] text-[#666666]"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setNewPointSegmentId(segment.id)}
                          className="flex items-center gap-1.5 mt-2 ml-3.5 text-xs text-[#666666] hover:text-[#F4A300] transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Add point
                        </button>
                      )}
                    </div>

                    {/* Stats to Mention */}
                    {segment.statsToMention &&
                      segment.statsToMention.length > 0 && (
                        <div className="mx-5 mb-3 p-3 bg-[#F4A300]/5 border border-[#F4A300]/20 rounded-lg">
                          <p className="text-xs font-medium text-[#F4A300] mb-1.5 flex items-center gap-1.5">
                            <BarChart3 className="h-3 w-3" />
                            Stats to Mention
                          </p>
                          <ul className="space-y-1">
                            {segment.statsToMention.map((stat, si) => (
                              <li
                                key={si}
                                className="text-sm text-[#cccccc] flex items-start gap-2"
                              >
                                <span className="text-[#F4A300] mt-0.5">
                                  &bull;
                                </span>
                                {stat}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {/* Transition */}
                    {segment.suggestedTransition && (
                      <div className="px-5 pb-3">
                        <p className="text-sm text-[#666666] italic">
                          Transition: {segment.suggestedTransition}
                        </p>
                      </div>
                    )}

                    {/* Source References */}
                    {segment.sourceItemIds.length > 0 && (
                      <div className="px-5 pb-4 flex items-center gap-1.5 flex-wrap">
                        <Link2 className="h-3 w-3 text-[#555555]" />
                        {segment.sourceItemIds.map((sid) => (
                          <span
                            key={sid}
                            className="text-xs px-2 py-0.5 rounded bg-[#0D0D0D] border border-[#333333] text-[#888888] truncate max-w-[180px]"
                            title={getSourceTitle(sid)}
                          >
                            {getSourceTitle(sid)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Segment Button */}
            <button
              onClick={handleAddSegment}
              className="w-full mt-4 py-3 rounded-xl border-2 border-dashed border-[#333333] hover:border-[#F4A300]/50 text-[#888888] hover:text-[#F4A300] transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Segment
            </button>
          </div>

          {/* Right Column - Connection Map (1/3 width) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Link2 className="h-4 w-4 text-[#F4A300]" />
                Connections
              </h2>

              {outline.connectionMap.length === 0 ? (
                <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6 text-center">
                  <Link2 className="h-8 w-8 text-[#444444] mx-auto mb-2" />
                  <p className="text-sm text-[#666666]">
                    No connections identified between sources.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {outline.connectionMap.map((conn, ci) => (
                    <div
                      key={ci}
                      className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-4"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">
                            {getSourceTitle(conn.fromSourceId)}
                          </p>
                          <div className="flex items-center gap-1 my-1 text-[#666666]">
                            <ArrowDown className="h-3 w-3" />
                          </div>
                          <p className="text-sm text-white truncate">
                            {getSourceTitle(conn.toSourceId)}
                          </p>
                        </div>
                      </div>
                      <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-[#F4A300]/10 text-[#F4A300] font-medium mb-2">
                        {conn.connectionType}
                      </span>
                      <p className="text-xs text-[#888888]">
                        {conn.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* Public Show Notes Preview (Collapsible) */}
        {/* ============================================ */}
        {publicNotes && (
          <div className="mt-8 bg-[#1A1A1A] border border-[#333333] rounded-xl overflow-hidden">
            <button
              onClick={() => setPublicNotesOpen(!publicNotesOpen)}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[#222222] transition-colors"
            >
              <h2 className="text-lg font-semibold text-white">
                Public Show Notes Preview
              </h2>
              {publicNotesOpen ? (
                <ChevronUp className="h-5 w-5 text-[#888888]" />
              ) : (
                <ChevronDown className="h-5 w-5 text-[#888888]" />
              )}
            </button>

            {publicNotesOpen && (
              <div className="px-6 pb-6 space-y-5 border-t border-[#333333] pt-5">
                {/* Episode Title */}
                <div>
                  <label className="block text-xs font-medium text-[#888888] uppercase tracking-wider mb-1.5">
                    Episode Title
                  </label>
                  <input
                    type="text"
                    value={publicNotes.title}
                    onChange={(e) =>
                      handlePublicNoteChange("title", e.target.value)
                    }
                    className="w-full px-4 py-2 rounded border border-[#333333] bg-[#0D0D0D] text-white focus:outline-none focus:border-[#F4A300] focus:ring-1 focus:ring-[#F4A300]/20"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-[#888888] uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={publicNotes.description}
                    onChange={(e) =>
                      handlePublicNoteChange("description", e.target.value)
                    }
                    rows={4}
                    className="w-full px-4 py-2 rounded border border-[#333333] bg-[#0D0D0D] text-white resize-none focus:outline-none focus:border-[#F4A300] focus:ring-1 focus:ring-[#F4A300]/20"
                  />
                </div>

                {/* Topics */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-[#888888] uppercase tracking-wider">
                      Topics
                    </label>
                    <button
                      onClick={handleAddTopic}
                      className="text-xs text-[#F4A300] hover:text-[#D48F00] flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {publicNotes.topicsList.map((topic, ti) => (
                      <div key={ti} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={topic}
                          onChange={(e) =>
                            handleTopicChange(ti, e.target.value)
                          }
                          className="flex-1 px-3 py-1.5 rounded border border-[#333333] bg-[#0D0D0D] text-white text-sm focus:outline-none focus:border-[#F4A300]"
                        />
                        <button
                          onClick={() => handleRemoveTopic(ti)}
                          className="p-1 rounded hover:bg-red-500/20 text-[#666666] hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key Takeaways */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-[#888888] uppercase tracking-wider">
                      Key Takeaways
                    </label>
                    <button
                      onClick={handleAddTakeaway}
                      className="text-xs text-[#F4A300] hover:text-[#D48F00] flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {publicNotes.keyTakeaways.map((takeaway, ki) => (
                      <div key={ki} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={takeaway}
                          onChange={(e) =>
                            handleTakeawayChange(ki, e.target.value)
                          }
                          className="flex-1 px-3 py-1.5 rounded border border-[#333333] bg-[#0D0D0D] text-white text-sm focus:outline-none focus:border-[#F4A300]"
                        />
                        <button
                          onClick={() => handleRemoveTakeaway(ki)}
                          className="p-1 rounded hover:bg-red-500/20 text-[#666666] hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* Sticky Action Bar */}
        {/* ============================================ */}
        <div className="sticky bottom-0 mt-8 -mx-6 px-6 py-4 bg-[#0D0D0D]/95 backdrop-blur border-t border-[#333333]">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button
              onClick={() => router.push("/create/show-notes/sources")}
              className="flex items-center gap-2 px-4 py-2 rounded border border-[#333333] text-[#888888] hover:text-white hover:border-[#444444] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <div className="flex items-center gap-3">
              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center gap-2 px-4 py-2 rounded border transition-colors ${
                  saveSuccess
                    ? "border-green-500/50 text-green-400"
                    : "border-[#333333] text-[#888888] hover:text-white hover:border-[#444444]"
                }`}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saveSuccess ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saveSuccess ? "Saved" : "Save"}
              </button>

              {/* Export Dropdown */}
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  className="flex items-center gap-2 px-4 py-2 rounded border border-[#333333] text-[#888888] hover:text-white hover:border-[#444444] transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export
                  <ChevronDown className="h-3 w-3" />
                </button>
                {exportMenuOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-52 bg-[#1A1A1A] border border-[#333333] rounded-lg shadow-xl overflow-hidden z-10">
                    <button
                      onClick={handleCopyToClipboard}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#cccccc] hover:bg-[#222222] hover:text-white transition-colors"
                    >
                      <Copy className="h-4 w-4" />
                      Copy to Clipboard
                    </button>
                    <button
                      onClick={handleDownloadMarkdown}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#cccccc] hover:bg-[#222222] hover:text-white transition-colors border-t border-[#333333]"
                    >
                      <Download className="h-4 w-4" />
                      Download Markdown
                    </button>
                  </div>
                )}
              </div>

              {/* Continue to Teaser */}
              <button
                onClick={() => router.push("/create/show-notes/teaser")}
                className="flex items-center gap-2 px-6 py-2 rounded bg-gradient-to-r from-[#FF4500] to-[#CC3700] hover:from-[#FF5500] hover:to-[#DD4700] text-white font-medium transition-all"
              >
                Create Teaser Post
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
