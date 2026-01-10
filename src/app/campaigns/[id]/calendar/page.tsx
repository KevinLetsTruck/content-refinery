"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Clock,
  AlertCircle,
  X,
  Edit,
  RefreshCw,
  Loader2,
  Copy,
} from "lucide-react";

interface CalendarDay {
  date: string;
  dayNumber: number;
  phase: string;
  posts: Array<{
    id: string;
    platform: string;
    time: string;
    content: string;
    status: string;
    hasVisual: boolean;
  }>;
  videos: Array<{
    id: string;
    title: string;
    type: string;
    time: string;
    status: string;
  }>;
}

interface CalendarData {
  campaign: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  calendar: CalendarDay[];
  phases: Array<{
    name: string;
    startDay: number;
    endDay: number;
  }>;
}

const platformColors: Record<string, string> = {
  twitter: "text-blue-400 bg-blue-400/10",
  facebook: "text-blue-600 bg-blue-600/10",
  instagram: "text-pink-500 bg-pink-500/10",
  youtube: "text-red-500 bg-red-500/10",
};

const platformLabels: Record<string, string> = {
  twitter: "X",
  facebook: "FB",
  instagram: "IG",
  youtube: "YT",
};

interface SelectedPost {
  id: string;
  platform: string;
  content: string;
  status: string;
  time: string;
  dayNumber: number;
  phase: string;
  hashtags?: string[];
  visualPrompt?: string;
}

export default function CampaignCalendarPage() {
  const params = useParams();
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<SelectedPost | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchCalendar();
  }, [params.id]);

  const fetchCalendar = async () => {
    try {
      const res = await fetch(`/api/campaigns/${params.id}/calendar`);
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Failed to fetch calendar:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostClick = (post: { id: string; platform: string; content: string; status: string; time: string }, day: CalendarDay) => {
    setSelectedPost({
      ...post,
      dayNumber: day.dayNumber,
      phase: day.phase,
    });
    setEditedContent(post.content);
    setCopied(false);
  };

  const handleSave = async () => {
    if (!selectedPost) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${params.id}/posts/${selectedPost.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editedContent }),
      });
      if (res.ok) {
        await fetchCalendar();
        setSelectedPost(null);
      }
    } catch (error) {
      console.error("Failed to save post:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!selectedPost) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/campaigns/${params.id}/posts/${selectedPost.id}/regenerate`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setEditedContent(data.content);
      }
    } catch (error) {
      console.error("Failed to regenerate:", error);
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "published":
        return <Check className="w-3 h-3 text-green-500" />;
      case "scheduled":
        return <Clock className="w-3 h-3 text-blue-500" />;
      case "failed":
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return <Clock className="w-3 h-3 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-7 gap-4">
              {Array(7)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="h-40 bg-gray-800 rounded"></div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white p-8 text-center">
        <p>Campaign not found</p>
      </div>
    );
  }

  // Group calendar days by week
  const weeks: CalendarDay[][] = [];
  let currentWeek: CalendarDay[] = [];

  // Pad start of first week
  const firstDate = new Date(data.calendar[0]?.date);
  const startPadding = firstDate.getDay();
  for (let i = 0; i < startPadding; i++) {
    currentWeek.push({
      date: "",
      dayNumber: 0,
      phase: "",
      posts: [],
      videos: [],
    });
  }

  for (const day of data.calendar) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({
        date: "",
        dayNumber: 0,
        phase: "",
        posts: [],
        videos: [],
      });
    }
    weeks.push(currentWeek);
  }

  const phaseColors = [
    "border-purple-500/50",
    "border-blue-500/50",
    "border-green-500/50",
    "border-yellow-500/50",
    "border-orange-500/50",
    "border-red-500/50",
  ];

  const phaseBgColors = [
    "bg-purple-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-orange-500",
    "bg-red-500",
  ];

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      {/* Header */}
      <div className="border-b border-[#2A2A2A] p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/campaigns/${params.id}`}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold">{data.campaign.name}</h1>
              <p className="text-sm text-gray-400">
                {new Date(data.campaign.startDate).toLocaleDateString()} -{" "}
                {new Date(data.campaign.endDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Phase Legend */}
          <div className="flex items-center gap-4">
            {data.phases.map((phase, i) => (
              <div key={phase.name} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${phaseBgColors[i % 6]}`} />
                <span className="text-sm text-gray-400">{phase.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="max-w-7xl mx-auto p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-gray-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="space-y-2">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-2">
              {week.map((day, dayIndex) => {
                if (!day.date) {
                  return (
                    <div
                      key={dayIndex}
                      className="min-h-[160px] bg-[#0D0D0D] rounded-lg"
                    />
                  );
                }

                const phaseIndex = data.phases.findIndex(
                  (p) => p.name === day.phase
                );
                const phaseColor = phaseColors[phaseIndex % 6];

                return (
                  <div
                    key={day.date}
                    className={`min-h-[160px] bg-[#1A1A1A] rounded-lg border-t-2 ${phaseColor} p-2`}
                  >
                    {/* Date header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {new Date(day.date).getDate()}
                      </span>
                      <span className="text-xs text-gray-500">
                        Day {day.dayNumber}
                      </span>
                    </div>

                    {/* Phase name */}
                    <div className="text-xs text-gray-500 mb-2 truncate">
                      {day.phase}
                    </div>

                    {/* Posts */}
                    <div className="space-y-1">
                      {day.posts.map((post) => (
                        <div
                          key={post.id}
                          onClick={() => handlePostClick(post, day)}
                          className={`flex items-center gap-1 text-xs p-1 rounded cursor-pointer hover:opacity-80 hover:ring-1 hover:ring-white/30 transition ${platformColors[post.platform]}`}
                          title="Click to view/edit"
                        >
                          <span className="font-medium">{platformLabels[post.platform]}</span>
                          <span className="text-gray-400">
                            {new Date(post.time).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                          {getStatusIcon(post.status)}
                        </div>
                      ))}

                      {/* Videos */}
                      {day.videos.map((video) => (
                        <div
                          key={video.id}
                          className="flex items-center gap-1 text-xs p-1 bg-red-900/20 text-red-400 rounded"
                        >
                          <span className="font-medium">YT</span>
                          <span className="text-gray-400 truncate">
                            {video.type === "short" ? "Short" : "Video"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="flex items-center gap-6 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-blue-400 bg-blue-400/10 text-xs font-medium">X</span>
            Twitter
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-blue-600 bg-blue-600/10 text-xs font-medium">FB</span>
            Facebook
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-pink-500 bg-pink-500/10 text-xs font-medium">IG</span>
            Instagram
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-red-500 bg-red-500/10 text-xs font-medium">YT</span>
            YouTube
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            Published
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            Scheduled
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            Failed
          </div>
        </div>
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded text-sm font-medium ${platformColors[selectedPost.platform]}`}>
                  {selectedPost.platform.charAt(0).toUpperCase() + selectedPost.platform.slice(1)}
                </span>
                <span className="text-gray-400 text-sm">
                  Day {selectedPost.dayNumber} • {selectedPost.phase}
                </span>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="p-1 hover:bg-[#2A2A2A] rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Content Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-400">Post Content</label>
                  {selectedPost.platform === "twitter" && (
                    <span className={`text-xs ${editedContent.length > 280 ? "text-red-500" : "text-gray-500"}`}>
                      {editedContent.length}/280
                    </span>
                  )}
                </div>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={6}
                  className="w-full p-3 bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg text-white resize-none focus:border-[#FF4500] outline-none"
                />
              </div>

              {/* Post Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-[#0D0D0D] p-3 rounded-lg">
                  <div className="text-gray-500 mb-1">Scheduled For</div>
                  <div>{new Date(selectedPost.time).toLocaleString()}</div>
                </div>
                <div className="bg-[#0D0D0D] p-3 rounded-lg">
                  <div className="text-gray-500 mb-1">Status</div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedPost.status)}
                    <span className="capitalize">{selectedPost.status}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-[#2A2A2A]">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-3 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg text-sm transition"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="flex items-center gap-2 px-3 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg text-sm transition disabled:opacity-50"
                >
                  {regenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Regenerate
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedPost(null)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || editedContent === selectedPost.content}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FF4500] hover:bg-[#FF5722] rounded-lg transition disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Edit className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




