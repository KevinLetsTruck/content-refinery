"use client";

import { useState } from "react";
import { useWizardStore, Platform, PublishOption } from "../../store";
import { 
  Send, 
  Clock, 
  ListPlus, 
  Save,
  Check,
  Calendar,
  Sparkles,
  ExternalLink,
  PartyPopper,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

const PLATFORM_NAMES: Record<Platform, string> = {
  instagram_feed: "Instagram Feed",
  instagram_story: "Instagram Story",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  twitter: "Twitter/X",
  tiktok: "TikTok",
};

const PUBLISH_OPTIONS: {
  value: PublishOption;
  icon: React.ReactNode;
  title: string;
  description: string;
}[] = [
  {
    value: "now",
    icon: <Send className="h-5 w-5" />,
    title: "Post Now",
    description: "Immediately publish to all selected platforms",
  },
  {
    value: "schedule",
    icon: <Clock className="h-5 w-5" />,
    title: "Schedule for Later",
    description: "Choose a specific date and time",
  },
  {
    value: "queue",
    icon: <ListPlus className="h-5 w-5" />,
    title: "Add to Queue",
    description: "Add to content queue for batch scheduling",
  },
  {
    value: "draft",
    icon: <Save className="h-5 w-5" />,
    title: "Save as Draft",
    description: "Save without scheduling",
  },
];

export function Step7Publish() {
  const {
    publishOption,
    setPublishOption,
    scheduledTime,
    setScheduledTime,
    finalContent,
    platforms,
    visuals,
    reset,
  } = useWizardStore();

  const [isPublishing, setIsPublishing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [publishedIds, setPublishedIds] = useState<string[]>([]);
  const [publishResults, setPublishResults] = useState<Array<{
    platform: string;
    success: boolean;
    postUrl?: string;
    error?: string;
  }>>([]);

  const enabledPlatforms = platforms.filter((p) => p.enabled);

  // AI-suggested time
  const suggestedTime = {
    date: getNextWeekday(),
    time: "09:00",
    reason: "Your audience is most active Tue-Thu 8-10 AM EST",
  };

  function getNextWeekday(): string {
    const today = new Date();
    const day = today.getDay();
    const daysUntilTuesday = day <= 2 ? 2 - day : 9 - day;
    const nextTuesday = new Date(today);
    nextTuesday.setDate(today.getDate() + (daysUntilTuesday || 7));
    return nextTuesday.toISOString().split("T")[0];
  }

  const handleUseSuggestion = () => {
    setScheduleDate(suggestedTime.date);
    setScheduleTime(suggestedTime.time);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setError(null);

    // Combine date and time for scheduling
    let scheduledDateTime: Date | null = null;
    if (publishOption === "schedule" && scheduleDate) {
      scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
      setScheduledTime(scheduledDateTime);
    }

    try {
      // Prepare request body
      const requestBody = {
        content: {
          text: finalContent?.text || "",
          hashtags: finalContent?.hashtags || [],
          platforms: enabledPlatforms.map((p) => p.platform),
        },
        visuals: visuals.map((v) => ({
          platform: v.platform,
          gammaUrl: v.gammaUrl,
          generationId: v.generationId,
        })),
        publishOption,
        scheduledTime: scheduledDateTime?.toISOString() || null,
      };

      console.log("[Step7Publish] Calling API with:", requestBody);

      // Call the publish API
      const response = await fetch("/api/create/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log("[Step7Publish] API response:", data);

      if (!response.ok) {
        throw new Error(data.error || `API error: ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.error || "Unknown error occurred");
      }

      // Store the created content IDs and publish results
      setPublishedIds(data.contentIds || []);
      setPublishResults(data.publishResults || []);
      
      // Show success
      setIsComplete(true);
    } catch (err) {
      console.error("[Step7Publish] Publishing failed:", err);
      setError(err instanceof Error ? err.message : "Publishing failed");
    } finally {
      setIsPublishing(false);
    }
  };

  if (isComplete) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
          <PartyPopper className="h-10 w-10 text-green-600" />
        </div>
        
        <h2 className="text-2xl font-bold mb-2">
          {publishOption === "now" 
            ? "Content Published!"
            : publishOption === "schedule"
            ? "Content Scheduled!"
            : publishOption === "queue"
            ? "Added to Queue!"
            : "Draft Saved!"
          }
        </h2>
        
        <p className="text-muted-foreground mb-8">
          {publishOption === "schedule" && scheduledTime
            ? `Scheduled for ${scheduledTime.toLocaleDateString()} at ${scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : publishOption === "now"
            ? `Published to ${enabledPlatforms.length} platform${enabledPlatforms.length > 1 ? 's' : ''}`
            : "Your content has been saved"
          }
        </p>

        {/* Platform Summary */}
        <div className="flex justify-center gap-4 mb-8">
          {enabledPlatforms.map((platform) => {
            const result = publishResults.find((r) => r.platform === platform.platform);
            const isSuccess = result?.success !== false;
            return (
              <div key={platform.platform} className="text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                  isSuccess 
                    ? "bg-green-100 dark:bg-green-900/30" 
                    : "bg-red-100 dark:bg-red-900/30"
                }`}>
                  {isSuccess ? (
                    <Check className="h-6 w-6 text-green-600" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  )}
                </div>
                <p className="text-sm font-medium">{PLATFORM_NAMES[platform.platform]}</p>
                {result?.postUrl && (
                  <a
                    href={result.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                  >
                    View Post <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {result?.error && (
                  <p className="text-xs text-red-500 mt-1">{result.error}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <Link
            href="/calendar"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-accent transition-colors"
          >
            <Calendar className="h-4 w-4" />
            View in Calendar
          </Link>
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Create Another
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-accent transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Ready to Publish</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Choose how you want to share your content
        </p>
      </div>

      {/* Publish Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PUBLISH_OPTIONS.map(({ value, icon, title, description }) => (
          <button
            key={value}
            onClick={() => setPublishOption(value)}
            className={`
              relative p-5 rounded-xl border-2 text-left transition-all duration-200
              ${publishOption === value
                ? "border-primary bg-primary/5"
                : "border-transparent bg-card hover:border-border"
              }
            `}
          >
            <div className={`
              inline-flex p-2 rounded-lg mb-3
              ${publishOption === value ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}
            `}>
              {icon}
            </div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
            
            {publishOption === value && (
              <div className="absolute top-3 right-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Schedule Options */}
      {publishOption === "schedule" && (
        <div className="bg-card rounded-xl border p-6 animate-in slide-in-from-bottom-4 duration-300">
          <h3 className="font-medium mb-4">Schedule Details</h3>
          
          {/* AI Suggestion */}
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">AI Suggestion</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {suggestedTime.reason}
                </p>
                <button
                  onClick={handleUseSuggestion}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  Use suggested time: {new Date(suggestedTime.date).toLocaleDateString()} at 9:00 AM
                </button>
              </div>
            </div>
          </div>

          {/* Date/Time Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date</label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Time</label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-card rounded-xl border p-4">
        <h3 className="font-medium mb-3">Publishing To</h3>
        <div className="flex flex-wrap gap-2">
          {enabledPlatforms.map((platform) => (
            <div
              key={platform.platform}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted"
            >
              <Check className="h-3.5 w-3.5 text-green-600" />
              <span className="text-sm">{PLATFORM_NAMES[platform.platform]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800 dark:text-red-200">Publishing Failed</p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Publish Button */}
      <button
        onClick={handlePublish}
        disabled={isPublishing || (publishOption === "schedule" && !scheduleDate)}
        className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {isPublishing ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {publishOption === "now" ? "Publishing..." : "Scheduling..."}
          </>
        ) : (
          <>
            {publishOption === "now" && <Send className="h-5 w-5" />}
            {publishOption === "schedule" && <Clock className="h-5 w-5" />}
            {publishOption === "queue" && <ListPlus className="h-5 w-5" />}
            {publishOption === "draft" && <Save className="h-5 w-5" />}
            {publishOption === "now" 
              ? "Publish Now"
              : publishOption === "schedule"
              ? "Schedule Posts"
              : publishOption === "queue"
              ? "Add to Queue"
              : "Save Draft"
            }
          </>
        )}
      </button>
    </div>
  );
}
