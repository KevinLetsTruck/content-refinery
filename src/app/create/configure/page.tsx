"use client";

import { useRouter } from "next/navigation";
import { useWizardStore, SourceType, CampaignConfig } from "../store";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";

// Source-specific configuration components
import GuideConfig from "./components/GuideConfig";
import ProductConfig from "./components/ProductConfig";
import EpisodeConfig from "./components/EpisodeConfig";
import IdeaConfig from "./components/IdeaConfig";
import SuccessStoryConfig from "./components/SuccessStoryConfig";
import TruckTalesConfig from "./components/TruckTalesConfig";
import FeedlyConfig from "./components/FeedlyConfig";

const CONFIG_COMPONENTS: Record<
  SourceType,
  React.ComponentType<{
    sourceData: Record<string, unknown> | null;
    config: CampaignConfig;
    updateConfig: (config: Partial<CampaignConfig>) => void;
  }>
> = {
  guide: GuideConfig,
  product: ProductConfig,
  episode: EpisodeConfig,
  quick_idea: IdeaConfig,
  feedly: FeedlyConfig,
  success_story: SuccessStoryConfig,
  trucktales: TruckTalesConfig,
};

export default function ConfigurePage() {
  const router = useRouter();
  const {
    sourceType,
    sourceData,
    sourceTitle,
    campaignConfig,
    updateCampaignConfig,
    nextStep,
    prevStep,
    currentStep,
    goToStep,
    mode,
  } = useWizardStore();
  const [isValid, setIsValid] = useState(false);

  // Redirect if not in campaign mode
  useEffect(() => {
    if (mode !== "campaign") {
      router.push("/create/mode");
      return;
    }
    if (!sourceType) {
      router.push("/create");
      return;
    }
  }, [mode, sourceType, router]);

  // Ensure we're on step 3
  useEffect(() => {
    if (currentStep !== 3) {
      goToStep(3);
    }
  }, [currentStep, goToStep]);

  useEffect(() => {
    // Validate config
    setIsValid(
      campaignConfig.name.trim() !== "" &&
        campaignConfig.duration > 0 &&
        campaignConfig.platforms.length > 0
    );
  }, [campaignConfig]);

  // Set default campaign name if empty
  useEffect(() => {
    if (!campaignConfig.name && sourceTitle) {
      updateCampaignConfig({ name: `${sourceTitle} Campaign` });
    }
  }, [campaignConfig.name, sourceTitle, updateCampaignConfig]);

  if (!sourceType || mode !== "campaign") {
    return null;
  }

  const ConfigComponent = CONFIG_COMPONENTS[sourceType];

  const handleContinue = () => {
    nextStep();
    router.push("/create/interview");
  };

  const handleBack = () => {
    prevStep();
    router.push("/create/mode");
  };

  // Get recommended duration based on source type
  const getRecommendedDuration = () => {
    switch (sourceType) {
      case "guide":
        return "14 days";
      case "episode":
      case "success_story":
        return "5 days";
      default:
        return "7 days";
    }
  };

  // Get source type display name
  const getSourceTypeDisplay = () => {
    switch (sourceType) {
      case "quick_idea":
        return "Quick Idea";
      case "guide":
        return "Lead Magnet Guide";
      case "episode":
        return "Podcast Episode";
      case "product":
        return "Product";
      case "success_story":
        return "Success Story";
      case "trucktales":
        return "TruckTales Story";
      default:
        return sourceType;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-[#888888] hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h1 className="text-3xl font-bold mb-2 text-white">
        Configure Your Campaign
      </h1>
      <p className="text-[#888888] mb-8">
        Set up your {getSourceTypeDisplay().toLowerCase()} campaign
      </p>

      {/* Campaign Name */}
      <div className="mb-8">
        <label className="block text-sm font-medium mb-2 text-white">
          Campaign Name
        </label>
        <input
          type="text"
          value={campaignConfig.name}
          onChange={(e) => updateCampaignConfig({ name: e.target.value })}
          placeholder={`${sourceTitle || "My"} Campaign`}
          className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-4 py-3 text-white placeholder-[#666666] focus:border-[#FF4500] focus:outline-none focus:ring-1 focus:ring-[#FF4500]"
        />
      </div>

      {/* Duration */}
      <div className="mb-8">
        <label className="block text-sm font-medium mb-2 text-white">
          Duration
        </label>
        <select
          value={campaignConfig.duration}
          onChange={(e) =>
            updateCampaignConfig({ duration: parseInt(e.target.value) })
          }
          className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-4 py-3 text-white focus:border-[#FF4500] focus:outline-none focus:ring-1 focus:ring-[#FF4500]"
        >
          <option value={5}>5 days</option>
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={21}>21 days</option>
          <option value={30}>30 days</option>
        </select>
        <p className="text-sm text-[#666666] mt-1">
          Recommended: {getRecommendedDuration()}
        </p>
      </div>

      {/* CTA Type */}
      <div className="mb-8">
        <label className="block text-sm font-medium mb-2 text-white">
          Campaign Goal (CTA Type)
        </label>
        <select
          value={campaignConfig.ctaType}
          onChange={(e) => updateCampaignConfig({ ctaType: e.target.value })}
          className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-4 py-3 text-white focus:border-[#FF4500] focus:outline-none focus:ring-1 focus:ring-[#FF4500]"
        >
          <option value="email_signup">Email Signup (Lead Magnet)</option>
          <option value="product">Product Purchase</option>
          <option value="coaching">Coaching Signup</option>
          <option value="episode">Listen to Episode</option>
          <option value="app">Download App</option>
          <option value="custom">Custom URL</option>
        </select>
      </div>

      {/* CTA URL (if needed) */}
      {(campaignConfig.ctaType === "product" ||
        campaignConfig.ctaType === "custom" ||
        campaignConfig.ctaType === "episode") && (
        <div className="mb-8">
          <label className="block text-sm font-medium mb-2 text-white">
            CTA URL
          </label>
          <input
            type="url"
            value={campaignConfig.ctaUrl || ""}
            onChange={(e) => updateCampaignConfig({ ctaUrl: e.target.value })}
            placeholder="https://..."
            className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-4 py-3 text-white placeholder-[#666666] focus:border-[#FF4500] focus:outline-none focus:ring-1 focus:ring-[#FF4500]"
          />
        </div>
      )}

      {/* Source-specific configuration */}
      <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-[#FF4500]" />
          <h2 className="text-lg font-semibold text-white">
            {getSourceTypeDisplay()} Options
          </h2>
        </div>

        <ConfigComponent
          sourceData={sourceData}
          config={campaignConfig}
          updateConfig={updateCampaignConfig}
        />
      </div>

      {/* Continue Button */}
      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={!isValid}
          className="flex items-center gap-2 bg-[#FF4500] hover:bg-[#CC3700] disabled:bg-[#333333] disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium text-white transition-colors"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
