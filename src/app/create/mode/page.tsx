"use client";

import { useRouter } from "next/navigation";
import { useWizardStore } from "../store";
import { Zap, Calendar, ArrowLeft } from "lucide-react";
import { useEffect } from "react";

export default function ModePage() {
  const router = useRouter();
  const { sourceType, sourceTitle, sourceContent, setMode, nextStep, currentStep, goToStep } = useWizardStore();

  // Redirect if no source selected
  useEffect(() => {
    if (!sourceType || !sourceContent) {
      router.push("/create");
    }
  }, [sourceType, sourceContent, router]);

  // Ensure we're on step 2
  useEffect(() => {
    if (currentStep !== 2) {
      goToStep(2);
    }
  }, [currentStep, goToStep]);

  const handleModeSelect = (mode: "quick_post" | "campaign") => {
    setMode(mode);
    nextStep();

    if (mode === "quick_post") {
      router.push("/create/interview");
    } else {
      router.push("/create/configure");
    }
  };

  if (!sourceType) {
    return null;
  }

  // Get recommended duration based on source type
  const getRecommendedDuration = () => {
    switch (sourceType) {
      case "guide":
        return "14";
      case "episode":
      case "success_story":
        return "5";
      default:
        return "7";
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
        onClick={() => router.push("/create")}
        className="flex items-center gap-2 text-[#888888] hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Source
      </button>

      <h1 className="text-3xl font-bold mb-2 text-white">What do you want to create?</h1>
      <p className="text-[#888888] mb-8">
        From:{" "}
        <span className="text-[#FF4500]">
          {sourceTitle || getSourceTypeDisplay()}
        </span>
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Quick Post Card */}
        <button
          onClick={() => handleModeSelect("quick_post")}
          className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-8 text-left hover:border-[#FF4500]/50 transition-all group"
        >
          <div className="w-14 h-14 bg-[#FF4500]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#FF4500]/20 transition-colors">
            <Zap className="w-7 h-7 text-[#FF4500]" />
          </div>

          <h2 className="text-2xl font-bold mb-3 text-white">Quick Post</h2>
          <p className="text-[#888888] mb-6">
            Create a single post or set of platform variations. Perfect for
            sharing one idea quickly.
          </p>

          <ul className="space-y-2 text-sm text-[#666666]">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#444444] rounded-full" />
              One message, multiple platforms
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#444444] rounded-full" />
              Publish now or schedule once
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#444444] rounded-full" />
              ~5 minutes to complete
            </li>
          </ul>
        </button>

        {/* Campaign Card */}
        <button
          onClick={() => handleModeSelect("campaign")}
          className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-8 text-left hover:border-[#3B82F6]/50 transition-all group"
        >
          <div className="w-14 h-14 bg-[#3B82F6]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#3B82F6]/20 transition-colors">
            <Calendar className="w-7 h-7 text-[#3B82F6]" />
          </div>

          <h2 className="text-2xl font-bold mb-3 text-white">Campaign</h2>
          <p className="text-[#888888] mb-6">
            Create a multi-day coordinated content push with optional landing
            page and email sequence.
          </p>

          <ul className="space-y-2 text-sm text-[#666666]">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#444444] rounded-full" />
              Multiple posts over {getRecommendedDuration()} days
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#444444] rounded-full" />
              {sourceType === "guide" || sourceType === "product"
                ? "Landing page included"
                : "Coordinated messaging"}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#444444] rounded-full" />
              {sourceType === "guide"
                ? "Email sequence available"
                : "AI-powered strategy"}
            </li>
          </ul>
        </button>
      </div>
    </div>
  );
}
