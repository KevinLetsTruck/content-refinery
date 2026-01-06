"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Twitter,
  Facebook,
  Instagram,
  Youtube,
  Plus,
  Clock,
  Check,
  AlertCircle,
  Loader2,
  LayoutGrid,
  List,
  CalendarDays,
  X,
} from "lucide-react";
import Link from "next/link";
import { Sidebar } from "@/components/navigation/Sidebar";

type ViewMode = "month" | "week" | "day";
type PostStatus = "draft" | "scheduled" | "publishing" | "published" | "failed";

interface ScheduledPost {
  id: string;
  type: "content" | "campaign";
  title: string;
  text: string;
  platform: string;
  scheduledFor: string;
  status: PostStatus;
  campaignId?: string;
  campaignName?: string;
  imageUrl?: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  posts: ScheduledPost[];
}

const platformIcons: Record<string, React.ElementType> = {
  twitter: Twitter,
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
};

const platformColors: Record<string, string> = {
  twitter: "bg-blue-500",
  facebook: "bg-blue-600",
  instagram: "bg-pink-500",
  youtube: "bg-red-500",
};

const platformTextColors: Record<string, string> = {
  twitter: "text-blue-500",
  facebook: "text-blue-600",
  instagram: "text-pink-500",
  youtube: "text-red-500",
};

const statusColors: Record<PostStatus, string> = {
  draft: "border-gray-500",
  scheduled: "border-blue-500",
  publishing: "border-yellow-500",
  published: "border-green-500",
  failed: "border-red-500",
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "twitter",
    "facebook",
    "instagram",
    "youtube",
  ]);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);

  useEffect(() => {
    fetchScheduledContent();
  }, [currentDate, viewMode]);

  const fetchScheduledContent = async () => {
    try {
      setLoading(true);

      const startDate = getStartDate();
      const endDate = getEndDate();

      const params = new URLSearchParams({
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      });

      const res = await fetch(`/api/calendar?${params.toString()}`);
      const data = await res.json();

      setPosts(data.posts || []);
    } catch (error) {
      console.error("Failed to fetch calendar data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = (): Date => {
    const date = new Date(currentDate);
    if (viewMode === "month") {
      date.setDate(1);
      date.setDate(date.getDate() - date.getDay());
    } else if (viewMode === "week") {
      date.setDate(date.getDate() - date.getDay());
    }
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const getEndDate = (): Date => {
    const date = new Date(currentDate);
    if (viewMode === "month") {
      date.setMonth(date.getMonth() + 1, 0);
      date.setDate(date.getDate() + (6 - date.getDay()));
    } else if (viewMode === "week") {
      date.setDate(date.getDate() + (6 - date.getDay()));
    }
    date.setHours(23, 59, 59, 999);
    return date;
  };

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const togglePlatform = (platform: string) => {
    if (selectedPlatforms.includes(platform)) {
      setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform]);
    }
  };

  const getCalendarDays = (): CalendarDay[] => {
    const days: CalendarDay[] = [];
    const startDate = getStartDate();
    const endDate = getEndDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const current = new Date(startDate);
    while (current <= endDate) {
      const dayPosts = posts.filter((post) => {
        const postDate = new Date(post.scheduledFor);
        return (
          postDate.toDateString() === current.toDateString() &&
          selectedPlatforms.includes(post.platform)
        );
      });

      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === currentDate.getMonth(),
        isToday: current.toDateString() === today.toDateString(),
        posts: dayPosts.sort(
          (a, b) =>
            new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
        ),
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const formatDateHeader = (): string => {
    if (viewMode === "month") {
      return currentDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } else if (viewMode === "week") {
      const start = getStartDate();
      const end = getEndDate();
      return `${start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} - ${end.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;
    } else {
      return currentDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  const calendarDays = getCalendarDays();

  return (
    <div className="flex min-h-screen bg-[#0D0D0D]">
      <Sidebar />

      <main className="flex-1 ml-64">
        {/* Orange accent line */}
        <div className="h-1 bg-gradient-to-r from-[#FF4500] to-[#F4A300]" />

        {/* Header */}
        <div className="border-b border-[#2A2A2A] p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Title and Navigation */}
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <CalendarIcon className="w-7 h-7 text-[#FF4500]" />
                  Content Calendar
                </h1>

                <div className="flex items-center gap-2">
                  <button
                    onClick={navigatePrevious}
                    className="p-2 hover:bg-[#2A2A2A] rounded-lg transition text-white"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={goToToday}
                    className="px-3 py-1.5 text-sm bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-lg transition text-white"
                  >
                    Today
                  </button>
                  <button
                    onClick={navigateNext}
                    className="p-2 hover:bg-[#2A2A2A] rounded-lg transition text-white"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <h2 className="text-lg font-medium text-gray-300">
                  {formatDateHeader()}
                </h2>
              </div>

              {/* View Mode and Actions */}
              <div className="flex items-center gap-3">
                {/* View Mode Toggle */}
                <div className="flex bg-[#1A1A1A] rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("month")}
                    className={`px-3 py-1.5 text-sm rounded-md transition ${
                      viewMode === "month"
                        ? "bg-[#FF4500] text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                    title="Month view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("week")}
                    className={`px-3 py-1.5 text-sm rounded-md transition ${
                      viewMode === "week"
                        ? "bg-[#FF4500] text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                    title="Week view"
                  >
                    <CalendarDays className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("day")}
                    className={`px-3 py-1.5 text-sm rounded-md transition ${
                      viewMode === "day"
                        ? "bg-[#FF4500] text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                    title="Day view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Platform Filters */}
                <div className="flex items-center gap-1 bg-[#1A1A1A] rounded-lg p-1">
                  {Object.entries(platformIcons).map(([platform, Icon]) => (
                    <button
                      key={platform}
                      onClick={() => togglePlatform(platform)}
                      className={`p-2 rounded-md transition ${
                        selectedPlatforms.includes(platform)
                          ? `${platformColors[platform]} text-white`
                          : "text-gray-500 hover:text-gray-300"
                      }`}
                      title={platform}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>

                <Link
                  href="/create"
                  className="flex items-center gap-2 px-4 py-2 bg-[#FF4500] hover:bg-[#FF5722] rounded-lg transition text-white"
                >
                  <Plus className="w-4 h-4" />
                  Create
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="max-w-7xl mx-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#FF4500]" />
            </div>
          ) : viewMode === "month" ? (
            <MonthView days={calendarDays} onSelectPost={setSelectedPost} />
          ) : viewMode === "week" ? (
            <WeekView days={calendarDays} onSelectPost={setSelectedPost} />
          ) : (
            <DayView
              date={currentDate}
              posts={posts.filter((p) => {
                const postDate = new Date(p.scheduledFor);
                return (
                  postDate.toDateString() === currentDate.toDateString() &&
                  selectedPlatforms.includes(p.platform)
                );
              })}
              onSelectPost={setSelectedPost}
            />
          )}
        </div>

        {/* Post Detail Modal */}
        {selectedPost && (
          <PostDetailModal
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
          />
        )}
      </main>
    </div>
  );
}

// Month View Component
function MonthView({
  days,
  onSelectPost,
}: {
  days: CalendarDay[];
  onSelectPost: (post: ScheduledPost) => void;
}) {
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b border-[#2A2A2A]">
        {weekDays.map((day) => (
          <div
            key={day}
            className="p-3 text-center text-sm font-medium text-gray-400"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7">
        {days.map((day, index) => (
          <div
            key={index}
            className={`min-h-[120px] border-b border-r border-[#2A2A2A] p-2 ${
              !day.isCurrentMonth ? "bg-[#0D0D0D]/50" : ""
            } ${day.isToday ? "bg-[#FF4500]/5" : ""}`}
          >
            {/* Date number */}
            <div
              className={`text-sm mb-2 ${
                day.isToday
                  ? "w-7 h-7 bg-[#FF4500] rounded-full flex items-center justify-center font-bold text-white"
                  : day.isCurrentMonth
                  ? "text-gray-300"
                  : "text-gray-600"
              }`}
            >
              {day.date.getDate()}
            </div>

            {/* Posts */}
            <div className="space-y-1">
              {day.posts.slice(0, 3).map((post) => (
                <PostPill
                  key={post.id}
                  post={post}
                  onClick={() => onSelectPost(post)}
                />
              ))}
              {day.posts.length > 3 && (
                <div className="text-xs text-gray-500 pl-1">
                  +{day.posts.length - 3} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Week View Component
function WeekView({
  days,
  onSelectPost,
}: {
  days: CalendarDay[];
  onSelectPost: (post: ScheduledPost) => void;
}) {
  const weekDays = days.slice(0, 7);

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
      <div className="grid grid-cols-7">
        {weekDays.map((day, index) => (
          <div
            key={index}
            className={`border-r border-[#2A2A2A] last:border-r-0 ${
              day.isToday ? "bg-[#FF4500]/5" : ""
            }`}
          >
            {/* Day header */}
            <div className="p-3 border-b border-[#2A2A2A] text-center">
              <div className="text-xs text-gray-500">
                {day.date.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div
                className={`text-lg font-medium ${
                  day.isToday
                    ? "w-8 h-8 bg-[#FF4500] rounded-full flex items-center justify-center mx-auto text-white"
                    : "text-white"
                }`}
              >
                {day.date.getDate()}
              </div>
            </div>

            {/* Posts */}
            <div className="p-2 min-h-[400px] space-y-2">
              {day.posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={() => onSelectPost(post)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Day View Component
function DayView({
  date,
  posts,
  onSelectPost,
}: {
  date: Date;
  posts: ScheduledPost[];
  onSelectPost: (post: ScheduledPost) => void;
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getPostsForHour = (hour: number) => {
    return posts.filter((post) => {
      const postHour = new Date(post.scheduledFor).getHours();
      return postHour === hour;
    });
  };

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
      <div className="divide-y divide-[#2A2A2A]">
        {hours.map((hour) => {
          const hourPosts = getPostsForHour(hour);
          const tempDate = new Date(date);
          tempDate.setHours(hour, 0, 0, 0);
          const timeLabel = tempDate.toLocaleTimeString("en-US", {
            hour: "numeric",
            hour12: true,
          });

          return (
            <div key={hour} className="flex">
              <div className="w-20 p-3 text-sm text-gray-500 border-r border-[#2A2A2A]">
                {timeLabel}
              </div>
              <div className="flex-1 p-2 min-h-[60px]">
                <div className="flex flex-wrap gap-2">
                  {hourPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onClick={() => onSelectPost(post)}
                      horizontal
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Post Pill (for month view)
function PostPill({
  post,
  onClick,
}: {
  post: ScheduledPost;
  onClick: () => void;
}) {
  const Icon = platformIcons[post.platform] || Clock;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs text-left truncate border-l-2 ${
        statusColors[post.status]
      } bg-[#0D0D0D] hover:bg-[#2A2A2A] transition`}
    >
      <Icon className={`w-3 h-3 flex-shrink-0 ${platformTextColors[post.platform]}`} />
      <span className="truncate text-white">
        {post.title || post.text.substring(0, 30)}
      </span>
    </button>
  );
}

// Post Card (for week/day view)
function PostCard({
  post,
  onClick,
  horizontal = false,
}: {
  post: ScheduledPost;
  onClick: () => void;
  horizontal?: boolean;
}) {
  const Icon = platformIcons[post.platform] || Clock;
  const time = new Date(post.scheduledFor).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <button
      onClick={onClick}
      className={`text-left p-3 rounded-lg border-l-2 ${statusColors[post.status]} bg-[#0D0D0D] hover:bg-[#2A2A2A] transition ${
        horizontal ? "flex-1 min-w-[200px] max-w-[300px]" : "w-full"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded ${platformColors[post.platform]}`}>
            <Icon className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs text-gray-400">{time}</span>
        </div>
        {post.status === "published" && (
          <Check className="w-3 h-3 text-green-500" />
        )}
        {post.status === "failed" && (
          <AlertCircle className="w-3 h-3 text-red-500" />
        )}
      </div>
      <p className="text-sm line-clamp-2 text-white">
        {post.title || post.text.substring(0, 60)}
      </p>
      {post.campaignName && (
        <div className="mt-1 text-xs text-[#F4A300]">{post.campaignName}</div>
      )}
    </button>
  );
}

// Post Detail Modal
function PostDetailModal({
  post,
  onClose,
}: {
  post: ScheduledPost;
  onClose: () => void;
}) {
  const Icon = platformIcons[post.platform] || Clock;
  const scheduledDate = new Date(post.scheduledFor);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${platformColors[post.platform]}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold capitalize text-white">{post.platform}</h3>
              <p className="text-sm text-gray-400">
                {scheduledDate.toLocaleDateString()} at{" "}
                {scheduledDate.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {post.title && (
            <div>
              <label className="text-xs text-gray-500 uppercase">Title</label>
              <p className="font-medium text-white">{post.title}</p>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 uppercase">Content</label>
            <p className="text-gray-300 whitespace-pre-wrap">{post.text}</p>
          </div>

          {post.campaignName && (
            <div>
              <label className="text-xs text-gray-500 uppercase">Campaign</label>
              <Link
                href={`/campaigns/${post.campaignId}`}
                className="text-[#FF4500] hover:underline block"
              >
                {post.campaignName}
              </Link>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 uppercase">Status</label>
            <div className="flex items-center gap-2 mt-1">
              {post.status === "scheduled" && (
                <>
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-blue-400">Scheduled</span>
                </>
              )}
              {post.status === "published" && (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-green-400">Published</span>
                </>
              )}
              {post.status === "failed" && (
                <>
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-red-400">Failed</span>
                </>
              )}
              {post.status === "draft" && (
                <>
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-400">Draft</span>
                </>
              )}
            </div>
          </div>

          {post.imageUrl && (
            <div>
              <label className="text-xs text-gray-500 uppercase">Image</label>
              <img
                src={post.imageUrl}
                alt=""
                className="mt-1 rounded-lg max-h-40 object-cover"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-[#2A2A2A]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition"
          >
            Close
          </button>
          {post.status === "scheduled" && (
            <Link
              href={
                post.type === "campaign"
                  ? `/campaigns/${post.campaignId}`
                  : `/queue`
              }
              className="px-4 py-2 bg-[#FF4500] hover:bg-[#FF5722] rounded-lg transition text-white"
            >
              Edit Post
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}




