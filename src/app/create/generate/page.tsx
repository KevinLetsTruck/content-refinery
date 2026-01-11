"use client";

import { useRouter } from "next/navigation";
import { useWizardStore } from "../store";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Check,
  Calendar,
  Mail,
  FileText,
  ExternalLink,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";

interface GenerationStatus {
  campaign: "pending" | "generating" | "completed" | "error";
  posts: "pending" | "generating" | "completed" | "error";
  emails: "pending" | "generating" | "completed" | "error" | "skipped";
  landingPage: "pending" | "generating" | "completed" | "error" | "skipped";
}

export default function GeneratePage() {
  const router = useRouter();
  const {
    sourceType,
    sourceData,
    sourceContent,
    campaignConfig,
    contentStrategy,
    emailSequence,
    landingPageConfig,
    interviewAnswers,
    mode,
    reset,
  } = useWizardStore();

  const [status, setStatus] = useState<GenerationStatus>({
    campaign: "pending",
    posts: "pending",
    emails: campaignConfig.includeEmail ? "pending" : "skipped",
    landingPage:
      sourceType === "guide" || sourceType === "product" ? "pending" : "skipped",
  });
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [totalPosts, setTotalPosts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const generateCampaign = useCallback(async () => {
    if (!contentStrategy) {
      setError("No content strategy found. Please go back and try again.");
      return;
    }

    try {
      // Update status
      setStatus((prev) => ({ ...prev, campaign: "generating" }));

      const response = await fetch("/api/wizard/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType,
          sourceData: {
            id: null,
            content: sourceContent,
            ...sourceData,
          },
          campaignConfig,
          contentStrategy,
          emailSequence: campaignConfig.includeEmail ? emailSequence : null,
          landingPageConfig,
          interviewAnswers,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate campaign");
      }

      const data = await response.json();
      setCampaignId(data.campaignId);
      setTotalPosts(data.totalPosts);

      // Update statuses
      setStatus((prev) => ({
        ...prev,
        campaign: "completed",
        posts: "completed",
        emails: campaignConfig.includeEmail ? "completed" : "skipped",
        landingPage:
          sourceType === "guide" || sourceType === "product"
            ? "completed"
            : "skipped",
      }));

      setIsComplete(true);
    } catch (err) {
      console.error("Generation error:", err);
      setError("Failed to generate campaign. Please try again.");
      setStatus((prev) => ({
        ...prev,
        campaign: "error",
        posts: "error",
      }));
    }
  }, [
    contentStrategy,
    sourceType,
    sourceContent,
    sourceData,
    campaignConfig,
    emailSequence,
    landingPageConfig,
    interviewAnswers,
  ]);

  useEffect(() => {
    if (mode !== "campaign") {
      router.push("/create/mode");
      return;
    }
    if (!contentStrategy) {
      router.push("/create/strategy");
      return;
    }
  }, [mode, contentStrategy, router]);

  useEffect(() => {
    if (contentStrategy && !campaignId && !error) {
      generateCampaign();
    }
  }, [contentStrategy, campaignId, error, generateCampaign]);

  const handleViewCampaign = () => {
    if (campaignId) {
      router.push(`/campaigns/${campaignId}`);
    }
  };

  const handleCreateAnother = () => {
    reset();
    router.push("/create");
  };

  const StatusIcon = ({
    status,
  }: {
    status: "pending" | "generating" | "completed" | "error" | "skipped";
  }) => {
    switch (status) {
      case "generating":
        return <Loader2 className="w-5 h-5 text-[#FF4500] animate-spin" />;
      case "completed":
        return (
          <div className="w-5 h-5 bg-[#22C55E] rounded-full flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        );
      case "error":
        return (
          <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">!</span>
          </div>
        );
      case "skipped":
        return (
          <div className="w-5 h-5 bg-[#333333] rounded-full flex items-center justify-center">
            <span className="text-[#666666] text-xs">-</span>
          </div>
        );
      default:
        return <div className="w-5 h-5 bg-[#333333] rounded-full" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {!isComplete && (
        <button
          onClick={() => router.push("/create/review")}
          className="flex items-center gap-2 text-[#888888] hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Review
        </button>
      )}

      <h1 className="text-3xl font-bold mb-2 text-white">
        {isComplete ? "Campaign Created!" : "Generating Your Campaign"}
      </h1>
      <p className="text-[#888888] mb-8">
        {isComplete
          ? `Your ${campaignConfig.duration}-day campaign is ready for review.`
          : "This may take a minute..."}
      </p>

      {/* Progress Steps */}
      <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6 mb-8">
        <div className="space-y-4">
          {/* Campaign Creation */}
          <div className="flex items-center gap-4">
            <StatusIcon status={status.campaign} />
            <div className="flex-1">
              <p
                className={`font-medium ${
                  status.campaign === "completed"
                    ? "text-white"
                    : "text-[#888888]"
                }`}
              >
                Creating campaign structure
              </p>
              <p className="text-sm text-[#666666]">
                {contentStrategy?.campaignName}
              </p>
            </div>
          </div>

          {/* Posts Generation */}
          <div className="flex items-center gap-4">
            <StatusIcon status={status.posts} />
            <div className="flex-1">
              <p
                className={`font-medium ${
                  status.posts === "completed" ? "text-white" : "text-[#888888]"
                }`}
              >
                Generating social posts
              </p>
              <p className="text-sm text-[#666666]">
                {status.posts === "completed"
                  ? `${totalPosts} posts across ${campaignConfig.platforms.length} platforms`
                  : `${campaignConfig.duration} days × ${campaignConfig.platforms.length} platforms`}
              </p>
            </div>
            <Calendar className="w-5 h-5 text-[#888888]" />
          </div>

          {/* Emails */}
          <div className="flex items-center gap-4">
            <StatusIcon status={status.emails} />
            <div className="flex-1">
              <p
                className={`font-medium ${
                  status.emails === "completed"
                    ? "text-white"
                    : status.emails === "skipped"
                    ? "text-[#666666]"
                    : "text-[#888888]"
                }`}
              >
                {status.emails === "skipped"
                  ? "Email sequence (not included)"
                  : "Generating email sequence"}
              </p>
              {status.emails !== "skipped" && (
                <p className="text-sm text-[#666666]">
                  {campaignConfig.emailLength} nurture emails
                </p>
              )}
            </div>
            <Mail className="w-5 h-5 text-[#888888]" />
          </div>

          {/* Landing Page */}
          <div className="flex items-center gap-4">
            <StatusIcon status={status.landingPage} />
            <div className="flex-1">
              <p
                className={`font-medium ${
                  status.landingPage === "completed"
                    ? "text-white"
                    : status.landingPage === "skipped"
                    ? "text-[#666666]"
                    : "text-[#888888]"
                }`}
              >
                {status.landingPage === "skipped"
                  ? "Landing page (not included)"
                  : "Creating landing page"}
              </p>
              {status.landingPage !== "skipped" && landingPageConfig && (
                <p className="text-sm text-[#666666]">
                  {landingPageConfig.template} template
                </p>
              )}
            </div>
            <FileText className="w-5 h-5 text-[#888888]" />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 mb-8">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => {
              setError(null);
              generateCampaign();
            }}
            className="mt-2 text-sm text-red-400 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Completion Actions */}
      {isComplete && (
        <div className="space-y-4">
          <button
            onClick={handleViewCampaign}
            className="w-full flex items-center justify-center gap-2 bg-[#FF4500] hover:bg-[#CC3700] px-6 py-4 rounded-lg font-medium text-white transition-colors"
          >
            View Campaign
            <ExternalLink className="w-4 h-4" />
          </button>

          <button
            onClick={handleCreateAnother}
            className="w-full flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-[#333333] border border-[#333333] px-6 py-4 rounded-lg font-medium text-white transition-colors"
          >
            Create Another
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary Stats (when complete) */}
      {isComplete && (
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="bg-[#1A1A1A] border border-[#333333] rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-white">{totalPosts}</p>
            <p className="text-sm text-[#888888]">Posts Created</p>
          </div>
          <div className="bg-[#1A1A1A] border border-[#333333] rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-white">
              {campaignConfig.duration}
            </p>
            <p className="text-sm text-[#888888]">Days</p>
          </div>
          <div className="bg-[#1A1A1A] border border-[#333333] rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-white">
              {campaignConfig.platforms.length}
            </p>
            <p className="text-sm text-[#888888]">Platforms</p>
          </div>
        </div>
      )}
    </div>
  );
}
