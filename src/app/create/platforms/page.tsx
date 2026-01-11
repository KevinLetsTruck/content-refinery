"use client";

import { useRouter } from "next/navigation";
import { useWizardStore, Platform } from "../store";
import {
  ArrowLeft,
  ArrowRight,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Music2,
  Check,
  Minus,
  Plus,
} from "lucide-react";
import { useEffect } from "react";

const PLATFORM_INFO: Record<
  Platform,
  {
    name: string;
    icon: React.ReactNode;
    color: string;
    description: string;
    supportsFrequency?: boolean;
  }
> = {
  instagram_feed: {
    name: "Instagram Feed",
    icon: <Instagram className="w-5 h-5" />,
    color: "bg-gradient-to-br from-purple-500 to-pink-500",
    description: "Photo and carousel posts",
    supportsFrequency: true,
  },
  instagram_story: {
    name: "Instagram Stories",
    icon: <Instagram className="w-5 h-5" />,
    color: "bg-gradient-to-br from-pink-500 to-orange-400",
    description: "24-hour story content",
    supportsFrequency: false,
  },
  facebook: {
    name: "Facebook",
    icon: <Facebook className="w-5 h-5" />,
    color: "bg-blue-600",
    description: "Feed posts and shares",
    supportsFrequency: true,
  },
  linkedin: {
    name: "LinkedIn",
    icon: <Linkedin className="w-5 h-5" />,
    color: "bg-blue-700",
    description: "Professional posts",
    supportsFrequency: true,
  },
  twitter: {
    name: "X (Twitter)",
    icon: <Twitter className="w-5 h-5" />,
    color: "bg-black",
    description: "Tweets and threads",
    supportsFrequency: true,
  },
  tiktok: {
    name: "TikTok",
    icon: <Music2 className="w-5 h-5" />,
    color: "bg-black",
    description: "Short-form video",
    supportsFrequency: false,
  },
};

export default function PlatformsPage() {
  const router = useRouter();
  const {
    mode,
    sourceType,
    platforms,
    campaignConfig,
    togglePlatform,
    updateCampaignConfig,
    currentStep,
    goToStep,
    getSteps,
  } = useWizardStore();

  // Get the correct step number for platforms
  const steps = getSteps();
  const platformStep = steps.find((s) => s.path === "/create/platforms");
  const platformStepNumber = platformStep?.number || 5;

  useEffect(() => {
    if (!sourceType) {
      router.push("/create");
      return;
    }
    if (currentStep !== platformStepNumber) {
      goToStep(platformStepNumber);
    }
  }, [sourceType, currentStep, platformStepNumber, goToStep, router]);

  // Determine back path based on mode
  const getBackPath = () => {
    if (mode === "quick_post") {
      return "/create/content";
    }
    return "/create/strategy";
  };

  // Determine next path based on mode and source type
  const getNextPath = () => {
    if (mode === "quick_post") {
      return "/create/visuals";
    }
    // Campaign mode
    if (sourceType === "guide" || sourceType === "product") {
      return "/create/landing-page";
    }
    if (campaignConfig.includeEmail) {
      return "/create/email";
    }
    return "/create/review";
  };

  const handleFrequencyChange = (platform: string, delta: number) => {
    const current = campaignConfig.frequency[platform] || 1;
    const newValue = Math.max(1, Math.min(5, current + delta));
    updateCampaignConfig({
      frequency: { ...campaignConfig.frequency, [platform]: newValue },
    });
  };

  const enabledPlatforms = platforms.filter((p) => p.enabled);
  const canProceed = enabledPlatforms.length > 0;

  const handleContinue = () => {
    if (!canProceed) return;

    // Update campaign config with selected platforms
    const selectedPlatformNames = enabledPlatforms.map((p) =>
      p.platform.replace("instagram_feed", "instagram").replace("instagram_story", "instagram_story")
    );

    updateCampaignConfig({
      platforms: selectedPlatformNames,
    });

    router.push(getNextPath());
  };

  if (!sourceType) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => router.push(getBackPath())}
        className="flex items-center gap-2 text-[#888888] hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {mode === "quick_post" ? "Back to Content" : "Back to Strategy"}
      </button>

      <h1 className="text-3xl font-bold mb-2 text-white">Select Platforms</h1>
      <p className="text-[#888888] mb-8">
        {mode === "campaign"
          ? "Choose where to publish your campaign content and set posting frequency."
          : "Choose which platforms to create content for."}
      </p>

      {/* Platform Grid */}
      <div className="grid gap-4 mb-8">
        {platforms.map((platform) => {
          const info = PLATFORM_INFO[platform.platform];
          if (!info) return null;

          return (
            <div
              key={platform.platform}
              className={`bg-[#1A1A1A] border rounded-xl p-5 transition-all ${
                platform.enabled
                  ? "border-[#FF4500] ring-1 ring-[#FF4500]/20"
                  : "border-[#333333] hover:border-[#444444]"
              }`}
            >
              <div className="flex items-center justify-between">
                {/* Left side - Platform info and toggle */}
                <button
                  onClick={() => togglePlatform(platform.platform)}
                  className="flex items-center gap-4 flex-1 text-left"
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${info.color}`}
                  >
                    {info.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{info.name}</h3>
                    <p className="text-sm text-[#888888]">{info.description}</p>
                  </div>
                </button>

                {/* Right side - Toggle and frequency */}
                <div className="flex items-center gap-4">
                  {/* Frequency control (campaign mode only) */}
                  {mode === "campaign" &&
                    platform.enabled &&
                    info.supportsFrequency && (
                      <div className="flex items-center gap-2 mr-4">
                        <span className="text-sm text-[#888888]">
                          Posts/day:
                        </span>
                        <div className="flex items-center gap-1 bg-[#0D0D0D] rounded-lg border border-[#333333]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFrequencyChange(
                                platform.platform === "instagram_feed"
                                  ? "instagram"
                                  : platform.platform,
                                -1
                              );
                            }}
                            className="p-1.5 hover:bg-[#333333] rounded-l-lg transition-colors"
                          >
                            <Minus className="w-4 h-4 text-[#888888]" />
                          </button>
                          <span className="w-8 text-center font-medium text-white">
                            {campaignConfig.frequency[
                              platform.platform === "instagram_feed"
                                ? "instagram"
                                : platform.platform
                            ] || 1}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFrequencyChange(
                                platform.platform === "instagram_feed"
                                  ? "instagram"
                                  : platform.platform,
                                1
                              );
                            }}
                            className="p-1.5 hover:bg-[#333333] rounded-r-lg transition-colors"
                          >
                            <Plus className="w-4 h-4 text-[#888888]" />
                          </button>
                        </div>
                      </div>
                    )}

                  {/* Toggle */}
                  <button
                    onClick={() => togglePlatform(platform.platform)}
                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                      platform.enabled
                        ? "bg-[#FF4500] text-white"
                        : "bg-[#333333] text-transparent"
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Platform details when enabled */}
              {platform.enabled && (
                <div className="mt-4 pt-4 border-t border-[#333333] flex gap-4 text-sm text-[#666666]">
                  <span>Max: {platform.characterLimit.toLocaleString()} chars</span>
                  <span>Format: {platform.format}</span>
                  <span>Hashtags: {platform.hashtagLimit}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {enabledPlatforms.length > 0 && (
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-4 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">
                {enabledPlatforms.length} platform
                {enabledPlatforms.length !== 1 ? "s" : ""} selected
              </p>
              <p className="text-sm text-[#888888]">
                {mode === "campaign" &&
                  `~${Object.values(campaignConfig.frequency).reduce(
                    (a, b) => a + b,
                    0
                  )} posts per day across all platforms`}
              </p>
            </div>
            <div className="flex gap-2">
              {enabledPlatforms.slice(0, 4).map((p) => {
                const info = PLATFORM_INFO[p.platform];
                return (
                  <div
                    key={p.platform}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm ${info.color}`}
                  >
                    {info.icon}
                  </div>
                );
              })}
              {enabledPlatforms.length > 4 && (
                <div className="w-8 h-8 rounded-lg bg-[#333333] flex items-center justify-center text-white text-xs">
                  +{enabledPlatforms.length - 4}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        disabled={!canProceed}
        className="w-full flex items-center justify-center gap-2 bg-[#FF4500] hover:bg-[#CC3700] disabled:opacity-50 disabled:cursor-not-allowed px-6 py-4 rounded-lg font-medium text-white transition-colors"
      >
        Continue
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
