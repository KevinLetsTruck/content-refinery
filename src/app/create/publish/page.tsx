"use client";

import { useRouter } from "next/navigation";
import { useWizardStore, PublishOption } from "../store";
import {
  ArrowLeft,
  Send,
  Clock,
  ListPlus,
  FileText,
  Check,
  Loader2,
  ExternalLink,
  Calendar as CalendarIcon,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Music2,
} from "lucide-react";
import { useEffect, useState } from "react";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram_feed: <Instagram className="w-4 h-4" />,
  instagram_story: <Instagram className="w-4 h-4" />,
  facebook: <Facebook className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  twitter: <Twitter className="w-4 h-4" />,
  tiktok: <Music2 className="w-4 h-4" />,
};

const PUBLISH_OPTIONS: {
  id: PublishOption;
  name: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "now",
    name: "Publish Now",
    description: "Post immediately to all selected platforms",
    icon: <Send className="w-5 h-5" />,
  },
  {
    id: "schedule",
    name: "Schedule",
    description: "Pick a specific date and time",
    icon: <Clock className="w-5 h-5" />,
  },
  {
    id: "queue",
    name: "Add to Queue",
    description: "Add to your publishing queue",
    icon: <ListPlus className="w-5 h-5" />,
  },
  {
    id: "draft",
    name: "Save as Draft",
    description: "Save and publish later",
    icon: <FileText className="w-5 h-5" />,
  },
];

export default function PublishPage() {
  const router = useRouter();
  const {
    mode,
    sourceContent,
    platforms,
    contentOptions,
    selectedContentId,
    editedContent,
    visuals,
    publishOption,
    setPublishOption,
    scheduledTime,
    setScheduledTime,
    currentStep,
    goToStep,
    getSteps,
    reset,
  } = useWizardStore();

  const [isPublishing, setIsPublishing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [publishResults, setPublishResults] = useState<
    { platform: string; success: boolean; url?: string; error?: string }[]
  >([]);

  // Get the correct step number for publish
  const steps = getSteps();
  const publishStep = steps.find((s) => s.path === "/create/publish");
  const publishStepNumber = publishStep?.number || 8;

  const enabledPlatforms = platforms.filter((p) => p.enabled);
  const selectedContent = contentOptions.find((o) => o.id === selectedContentId);
  const contentText = editedContent || selectedContent?.text || sourceContent;

  useEffect(() => {
    if (mode !== "quick_post") {
      router.push("/create/mode");
      return;
    }
    if (!sourceContent) {
      router.push("/create");
      return;
    }
    if (currentStep !== publishStepNumber) {
      goToStep(publishStepNumber);
    }
  }, [mode, sourceContent, currentStep, publishStepNumber, goToStep, router]);

  const handlePublish = async () => {
    setIsPublishing(true);

    try {
      const response = await fetch("/api/create/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: contentText,
          hashtags: selectedContent?.hashtags || [],
          platforms: enabledPlatforms.map((p) => p.platform),
          visuals: visuals.filter((v) => v.status === "completed"),
          publishOption,
          scheduledTime: publishOption === "schedule" ? scheduledTime : null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPublishResults(data.results || []);
        setIsComplete(true);
      } else {
        throw new Error("Publishing failed");
      }
    } catch (error) {
      console.error("Failed to publish:", error);
      setPublishResults(
        enabledPlatforms.map((p) => ({
          platform: p.platform,
          success: false,
          error: "Publishing failed. Please try again.",
        }))
      );
    }

    setIsPublishing(false);
  };

  const handleCreateAnother = () => {
    reset();
    router.push("/create");
  };

  const handleViewDashboard = () => {
    router.push("/");
  };

  if (mode !== "quick_post") return null;

  // Completion State
  if (isComplete) {
    const successCount = publishResults.filter((r) => r.success).length;

    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-[#22C55E] rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-3xl font-bold mb-2 text-white">
          {publishOption === "now"
            ? "Content Published!"
            : publishOption === "schedule"
            ? "Content Scheduled!"
            : publishOption === "queue"
            ? "Added to Queue!"
            : "Draft Saved!"}
        </h1>

        <p className="text-[#888888] mb-8">
          {publishOption === "now" && (
            <>
              {publishResults.some(r => r.platform === "facebook" && r.success && !r.url) ? (
                <>
                  Content ready! Click &quot;Post Now&quot; for Facebook to post natively (better reach).
                  {successCount > 1 && ` ${successCount - 1} other platform(s) published automatically.`}
                </>
              ) : (
                <>
                  Successfully posted to {successCount} of{" "}
                  {enabledPlatforms.length} platforms.
                </>
              )}
            </>
          )}
          {publishOption === "schedule" && (
            <>
              Your content will be published on{" "}
              {scheduledTime?.toLocaleString()}.
            </>
          )}
          {publishOption === "queue" && (
            <>Your content has been added to the publishing queue.</>
          )}
          {publishOption === "draft" && (
            <>Your content has been saved as a draft.</>
          )}
        </p>

        {/* Results */}
        {publishOption === "now" && publishResults.length > 0 && (
          <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6 mb-8 text-left">
            <h3 className="font-medium mb-4 text-white">Publishing Results</h3>
            <div className="space-y-3">
              {publishResults.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-[#333333] last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#333333] rounded flex items-center justify-center text-white">
                      {PLATFORM_ICONS[result.platform]}
                    </div>
                    <span className="capitalize text-white">
                      {result.platform.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <>
                        {result.platform === "facebook" && !result.url ? (
                          // Facebook ready for manual posting
                          <a
                            href={`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(contentText || "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                          >
                            <Facebook className="w-4 h-4" />
                            Post Now
                          </a>
                        ) : (
                          <>
                            <Check className="w-4 h-4 text-[#22C55E]" />
                            {result.url && (
                              <a
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#FF4500] hover:underline"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-red-400">
                        {result.error}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleCreateAnother}
            className="flex-1 flex items-center justify-center gap-2 bg-[#FF4500] hover:bg-[#CC3700] px-6 py-4 rounded-lg font-medium text-white transition-colors"
          >
            Create Another
          </button>
          <button
            onClick={handleViewDashboard}
            className="flex-1 flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-[#333333] border border-[#333333] px-6 py-4 rounded-lg font-medium text-white transition-colors"
          >
            View Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => router.push("/create/review")}
        className="flex items-center gap-2 text-[#888888] hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Review
      </button>

      <h1 className="text-3xl font-bold mb-2 text-white">Publish Content</h1>
      <p className="text-[#888888] mb-8">
        Choose when and how to publish your content.
      </p>

      {/* Publish Options */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {PUBLISH_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => setPublishOption(option.id)}
            className={`p-5 rounded-xl border-2 text-left transition-all ${
              publishOption === option.id
                ? "border-[#FF4500] bg-[#FF4500]/5"
                : "border-[#333333] bg-[#1A1A1A] hover:border-[#444444]"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                publishOption === option.id
                  ? "bg-[#FF4500]/20 text-[#FF4500]"
                  : "bg-[#333333] text-[#888888]"
              }`}
            >
              {option.icon}
            </div>
            <h3 className="font-semibold text-white">{option.name}</h3>
            <p className="text-sm text-[#888888] mt-1">{option.description}</p>
          </button>
        ))}
      </div>

      {/* Schedule Picker */}
      {publishOption === "schedule" && (
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6 mb-8">
          <h3 className="font-medium mb-4 text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Select Date & Time
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#888888] mb-2">Date</label>
              <input
                type="date"
                value={
                  scheduledTime
                    ? scheduledTime.toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) => {
                  const date = new Date(e.target.value);
                  if (scheduledTime) {
                    date.setHours(
                      scheduledTime.getHours(),
                      scheduledTime.getMinutes()
                    );
                  }
                  setScheduledTime(date);
                }}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-2 rounded border border-[#333333] bg-[#0D0D0D] text-white focus:outline-none focus:border-[#FF4500]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#888888] mb-2">Time</label>
              <input
                type="time"
                value={
                  scheduledTime
                    ? `${String(scheduledTime.getHours()).padStart(
                        2,
                        "0"
                      )}:${String(scheduledTime.getMinutes()).padStart(2, "0")}`
                    : ""
                }
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(":").map(Number);
                  const date = scheduledTime ? new Date(scheduledTime) : new Date();
                  date.setHours(hours, minutes);
                  setScheduledTime(date);
                }}
                className="w-full px-4 py-2 rounded border border-[#333333] bg-[#0D0D0D] text-white focus:outline-none focus:border-[#FF4500]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Content Preview */}
      <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6 mb-8">
        <h3 className="font-medium mb-4 text-white">Content Preview</h3>
        <p className="text-white whitespace-pre-wrap mb-4">{contentText}</p>
        <div className="flex flex-wrap gap-2">
          {selectedContent?.hashtags?.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-1 bg-[#FF4500]/10 text-[#FF4500] rounded"
            >
              #{tag}
            </span>
          ))}
        </div>
        <div className="flex gap-2 mt-4 pt-4 border-t border-[#333333]">
          {enabledPlatforms.map((p) => (
            <div
              key={p.platform}
              className="w-8 h-8 bg-[#333333] rounded flex items-center justify-center text-white"
            >
              {PLATFORM_ICONS[p.platform]}
            </div>
          ))}
        </div>
      </div>

      {/* Publish Button */}
      <button
        onClick={handlePublish}
        disabled={
          isPublishing ||
          (publishOption === "schedule" && !scheduledTime)
        }
        className="w-full flex items-center justify-center gap-2 bg-[#FF4500] hover:bg-[#CC3700] disabled:opacity-50 disabled:cursor-not-allowed px-6 py-4 rounded-lg font-medium text-white transition-colors"
      >
        {isPublishing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {publishOption === "now" ? "Publishing..." : "Saving..."}
          </>
        ) : (
          <>
            {publishOption === "now" && <Send className="w-5 h-5" />}
            {publishOption === "schedule" && <Clock className="w-5 h-5" />}
            {publishOption === "queue" && <ListPlus className="w-5 h-5" />}
            {publishOption === "draft" && <FileText className="w-5 h-5" />}
            {PUBLISH_OPTIONS.find((o) => o.id === publishOption)?.name}
          </>
        )}
      </button>
    </div>
  );
}
