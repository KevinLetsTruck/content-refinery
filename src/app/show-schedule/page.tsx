"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/navigation/Sidebar";
import {
  Radio,
  Plus,
  Eye,
  Pencil,
  Clock,
  FileText,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  eachDayOfInterval,
  format,
  isToday,
} from "date-fns";

// ============================================
// Types
// ============================================

type ShowName = "tbb" | "destination_health" | "power_hour" | "coffee_with_kevin" | "custom";

interface ShowNotesItem {
  id: string;
  showName: ShowName;
  customShowName: string | null;
  episodeTitle: string | null;
  status: string;
  showDate: string | null;
  teaserScheduledFor: string | null;
  teaserText: string | null;
  teaserContentId: string | null;
  outline: { segments?: { id: string }[]; estimatedDuration?: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface ScheduleEntry {
  type: "air" | "teaser";
  showNotes: ShowNotesItem;
  date: Date;
}

// ============================================
// Constants
// ============================================

const SHOW_CONFIG: Record<
  ShowName,
  { label: string; color: string; bg: string; border: string }
> = {
  tbb: {
    label: "TBB",
    color: "text-[#FF4500]",
    bg: "bg-[#FF4500]/10",
    border: "border-[#FF4500]/30",
  },
  destination_health: {
    label: "Destination Health",
    color: "text-[#F4A300]",
    bg: "bg-[#F4A300]/10",
    border: "border-[#F4A300]/30",
  },
  power_hour: {
    label: "Power Hour",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  coffee_with_kevin: {
    label: "Coffee with Kevin",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
  custom: {
    label: "Custom",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
  },
};

const SHOW_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Shows" },
  { value: "tbb", label: "Trucking Business & Beyond" },
  { value: "destination_health", label: "Destination Health" },
  { value: "power_hour", label: "Power Hour" },
  { value: "coffee_with_kevin", label: "Coffee with Kevin" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "text-[#888888]" },
  ready: { label: "Ready", color: "text-emerald-400" },
  used: { label: "Used", color: "text-blue-400" },
  archived: { label: "Archived", color: "text-[#555555]" },
};

// ============================================
// Component
// ============================================

export default function ShowSchedulePage() {
  const router = useRouter();
  const [scheduledNotes, setScheduledNotes] = useState<ShowNotesItem[]>([]);
  const [unscheduledNotes, setUnscheduledNotes] = useState<ShowNotesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const weeksToShow = 3;
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday

  // ============================================
  // Data Fetching
  // ============================================

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (filter !== "all") params.set("show", filter);

      // Fetch upcoming + unscheduled in parallel
      const [upcomingRes, unscheduledRes] = await Promise.all([
        fetch(`/api/show-notes?upcoming=true&${params.toString()}`),
        fetch(`/api/show-notes?unscheduled=true&${params.toString()}`),
      ]);

      if (upcomingRes.ok) {
        const data = await upcomingRes.json();
        setScheduledNotes(data.showNotes || []);
      }
      if (unscheduledRes.ok) {
        const data = await unscheduledRes.json();
        setUnscheduledNotes(data.showNotes || []);
      }
    } catch (err) {
      console.error("Failed to fetch show schedule:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============================================
  // Helpers
  // ============================================

  const getShowLabel = (note: ShowNotesItem) => {
    if (note.showName === "custom" && note.customShowName) return note.customShowName;
    return SHOW_CONFIG[note.showName]?.label || note.showName;
  };

  const getShowConfig = (showName: ShowName) => {
    return SHOW_CONFIG[showName] || SHOW_CONFIG.custom;
  };

  const getSegmentCount = (note: ShowNotesItem) => {
    if (!note.outline || !note.outline.segments) return 0;
    return note.outline.segments.length;
  };

  const getWeekLabel = (weekIdx: number) => {
    if (weekIdx === 0) return "THIS WEEK";
    if (weekIdx === 1) return "NEXT WEEK";
    return `WEEK OF`;
  };

  // Build schedule entries for each day
  const buildScheduleEntries = (): Map<string, ScheduleEntry[]> => {
    const entries = new Map<string, ScheduleEntry[]>();

    for (const note of scheduledNotes) {
      // Add "ON AIR" entry on showDate
      if (note.showDate) {
        const d = new Date(note.showDate);
        const key = format(d, "yyyy-MM-dd");
        if (!entries.has(key)) entries.set(key, []);
        entries.get(key)!.push({ type: "air", showNotes: note, date: d });
      }

      // Add "TEASER" entry on teaserScheduledFor
      if (note.teaserScheduledFor) {
        const d = new Date(note.teaserScheduledFor);
        const key = format(d, "yyyy-MM-dd");
        if (!entries.has(key)) entries.set(key, []);
        entries.get(key)!.push({ type: "teaser", showNotes: note, date: d });
      }
    }

    return entries;
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete these show notes?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/show-notes/${id}`, { method: "DELETE" });
      if (res.ok) {
        setScheduledNotes((prev) => prev.filter((n) => n.id !== id));
        setUnscheduledNotes((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const scheduleEntries = buildScheduleEntries();

  // ============================================
  // Render
  // ============================================

  return (
    <div className="flex min-h-screen bg-[#0D0D0D]">
      <Sidebar />

      <main className="flex-1 ml-64">
        {/* Top Accent */}
        <div className="h-1 bg-gradient-to-r from-[#FF4500] to-[#F4A300]" />

        <div className="max-w-5xl mx-auto px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#F4A300]/10">
                <Radio className="h-6 w-6 text-[#F4A300]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Show Schedule</h1>
                <p className="text-sm text-[#888888]">Upcoming shows and prep status</p>
              </div>
            </div>

            <button
              onClick={() => router.push("/create")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#FF4500] to-[#CC3700] hover:from-[#FF5500] hover:to-[#DD4700] text-white font-medium transition-all"
            >
              <Plus className="h-4 w-4" />
              New Show Notes
            </button>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-3 mb-8">
            <span className="text-sm text-[#888888]">Filter:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#333333] bg-[#1A1A1A] text-white text-sm focus:outline-none focus:border-[#F4A300]"
            >
              {SHOW_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-[#F4A300] animate-spin" />
            </div>
          ) : (
            <>
              {/* Week Sections */}
              {Array.from({ length: weeksToShow }, (_, weekIdx) => {
                const wStart = addWeeks(weekStart, weekIdx);
                const wEnd = endOfWeek(wStart, { weekStartsOn: 1 });
                const days = eachDayOfInterval({ start: wStart, end: wEnd });
                const weekLabel = getWeekLabel(weekIdx);
                const weekRange = `${format(wStart, "MMM d")} – ${format(wEnd, "MMM d")}`;

                // Check if this week has any entries
                const weekHasEntries = days.some((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  return scheduleEntries.has(key);
                });

                return (
                  <div key={weekIdx} className="mb-10">
                    {/* Week Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <h2 className="text-xs font-semibold text-[#F4A300] uppercase tracking-wider">
                        {weekLabel}
                      </h2>
                      <span className="text-xs text-[#555555]">{weekRange}</span>
                      <div className="flex-1 h-px bg-[#222222]" />
                    </div>

                    {!weekHasEntries ? (
                      <p className="text-sm text-[#444444] italic pl-4 py-3">
                        No shows scheduled
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {days.map((day) => {
                          const key = format(day, "yyyy-MM-dd");
                          const entries = scheduleEntries.get(key) || [];
                          const dayIsToday = isToday(day);

                          return (
                            <div key={key} className="flex gap-4">
                              {/* Day Label */}
                              <div
                                className={`w-24 shrink-0 py-2 text-right ${
                                  dayIsToday ? "text-[#F4A300]" : "text-[#666666]"
                                }`}
                              >
                                <div className="text-xs font-medium uppercase">
                                  {format(day, "EEE")}
                                </div>
                                <div className="text-sm">
                                  {format(day, "MMM d")}
                                </div>
                              </div>

                              {/* Day Content */}
                              <div className="flex-1 min-h-[40px] py-1">
                                {entries.length === 0 ? (
                                  <div className="border-b border-dotted border-[#222222] h-full min-h-[32px]" />
                                ) : (
                                  <div className="space-y-2">
                                    {entries.map((entry, i) => (
                                      <ScheduleCard
                                        key={`${entry.showNotes.id}-${entry.type}-${i}`}
                                        entry={entry}
                                        getShowLabel={getShowLabel}
                                        getShowConfig={getShowConfig}
                                        getSegmentCount={getSegmentCount}
                                        onView={() => router.push(`/show-schedule/${entry.showNotes.id}`)}
                                        onDelete={() => handleDelete(entry.showNotes.id)}
                                        isDeleting={deletingId === entry.showNotes.id}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Unscheduled Section */}
              {unscheduledNotes.length > 0 && (
                <div className="mt-12 pt-8 border-t border-dashed border-[#333333]">
                  <div className="flex items-center gap-2 mb-6">
                    <FileText className="h-4 w-4 text-[#888888]" />
                    <h2 className="text-sm font-semibold text-[#888888] uppercase tracking-wider">
                      Unscheduled
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-[#1A1A1A] text-[#888888] border border-[#333333]">
                      {unscheduledNotes.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {unscheduledNotes.map((note) => {
                      const config = getShowConfig(note.showName);
                      const statusCfg = STATUS_CONFIG[note.status] || STATUS_CONFIG.draft;

                      return (
                        <div
                          key={note.id}
                          className={`bg-[#1A1A1A] border ${config.border} rounded-lg p-4 flex items-center justify-between`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.color}`}
                            >
                              {getShowLabel(note)}
                            </span>
                            <span className="text-sm text-white">
                              {note.episodeTitle || "Untitled"}
                            </span>
                            <span className={`text-xs ${statusCfg.color}`}>
                              {statusCfg.label}
                            </span>
                            <span className="text-xs text-[#555555]">
                              Created {format(new Date(note.createdAt), "MMM d")}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/show-schedule/${note.id}`)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#333333] text-[#888888] hover:text-white hover:border-[#444444] transition-colors text-xs"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </button>
                            <button
                              onClick={() => handleDelete(note.id)}
                              disabled={deletingId === note.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#333333] text-[#888888] hover:text-red-400 hover:border-red-400/50 transition-colors text-xs disabled:opacity-50"
                            >
                              {deletingId === note.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {scheduledNotes.length === 0 && unscheduledNotes.length === 0 && (
                <div className="text-center py-20">
                  <Radio className="h-12 w-12 text-[#333333] mx-auto mb-4" />
                  <p className="text-[#666666] mb-2">No show notes yet</p>
                  <p className="text-sm text-[#444444] mb-6">
                    Create show notes from the wizard and they&apos;ll appear here.
                  </p>
                  <button
                    onClick={() => router.push("/create")}
                    className="px-4 py-2 rounded-lg bg-[#F4A300] text-black font-medium hover:bg-[#F4A300]/90 transition-colors"
                  >
                    Create Show Notes
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// ============================================
// Schedule Card Component
// ============================================

function ScheduleCard({
  entry,
  getShowLabel,
  getShowConfig,
  getSegmentCount,
  onView,
  onDelete,
  isDeleting,
}: {
  entry: ScheduleEntry;
  getShowLabel: (note: ShowNotesItem) => string;
  getShowConfig: (showName: ShowName) => { label: string; color: string; bg: string; border: string };
  getSegmentCount: (note: ShowNotesItem) => number;
  onView: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const { showNotes, type, date } = entry;
  const config = getShowConfig(showNotes.showName);
  const statusCfg = STATUS_CONFIG[showNotes.status] || STATUS_CONFIG.draft;
  const segmentCount = getSegmentCount(showNotes);
  const timeStr = format(date, "h:mm a");

  return (
    <div
      className={`bg-[#1A1A1A] border ${config.border} rounded-lg p-4 transition-colors hover:border-opacity-60`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Type + Show Badge */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                type === "air"
                  ? `${config.bg} ${config.color}`
                  : "bg-[#333333] text-[#cccccc]"
              }`}
            >
              {type === "air" ? "ON AIR" : "TEASER"}
            </span>
            <span className={`text-sm ${config.color}`}>
              {getShowLabel(showNotes)}
            </span>
          </div>

          {/* Title */}
          <p className="text-white text-sm font-medium mb-1.5">
            {showNotes.episodeTitle || "Untitled"}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-[#666666]">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeStr}
            </span>
            {type === "air" && segmentCount > 0 && (
              <span>{segmentCount} segments</span>
            )}
            {type === "air" && showNotes.outline?.estimatedDuration && (
              <span>~{showNotes.outline.estimatedDuration}</span>
            )}
            {type === "teaser" && (
              <span>
                {showNotes.teaserText ? "Teaser ready" : "No teaser text"}
              </span>
            )}
            <span className={statusCfg.color}>{statusCfg.label}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 ml-4">
          <button
            onClick={onView}
            className="p-1.5 rounded text-[#888888] hover:text-white hover:bg-[#333333] transition-colors"
            title="View"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={onView}
            className="p-1.5 rounded text-[#888888] hover:text-[#F4A300] hover:bg-[#333333] transition-colors"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-1.5 rounded text-[#888888] hover:text-red-400 hover:bg-[#333333] transition-colors disabled:opacity-50"
            title="Delete"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
