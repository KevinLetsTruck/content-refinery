"use client";

import { useRouter } from "next/navigation";
import { useWizardStore, ContentOption } from "../store";
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Check,
  Sparkles,
  Heart,
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

const CONTENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  stat: <TrendingUp className="w-4 h-4" />,
  quote: <MessageSquare className="w-4 h-4" />,
  hook: <Sparkles className="w-4 h-4" />,
  tip: <Lightbulb className="w-4 h-4" />,
  testimonial: <Heart className="w-4 h-4" />,
  teaser: <AlertTriangle className="w-4 h-4" />,
  educational: <Lightbulb className="w-4 h-4" />,
};

export default function ContentPage() {
  const router = useRouter();
  const {
    mode,
    sourceType,
    sourceContent,
    interviewData,
    contentOptions,
    setContentOptions,
    selectedContentId,
    selectContent,
    editedContent,
    editContent,
    currentStep,
    goToStep,
    getSteps,
    quickLandingPage,
    setQuickLandingPage,
  } = useWizardStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingLandingPage, setIsGeneratingLandingPage] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");

  // Get the correct step number for content
  const steps = getSteps();
  const contentStep = steps.find((s) => s.path === "/create/content");
  const contentStepNumber = contentStep?.number || 4;

  useEffect(() => {
    if (mode !== "quick_post") {
      router.push("/create/mode");
      return;
    }
    if (!sourceContent) {
      router.push("/create");
      return;
    }
    if (currentStep !== contentStepNumber) {
      goToStep(contentStepNumber);
    }

    // Generate content if not already done
    if (contentOptions.length === 0 && !isGenerating) {
      generateContent();
    }
  }, [mode, sourceContent, contentOptions.length, currentStep, contentStepNumber, goToStep, router, isGenerating]);

  const generateContent = async () => {
    setIsGenerating(true);

    let landingPageUrl: string | undefined;

    // If download_guide CTA is selected and we have guide info, generate landing page first
    if (
      interviewData.callToAction === "download_guide" &&
      interviewData.guideTitle &&
      interviewData.guideTopic &&
      !quickLandingPage?.url // Don't regenerate if we already have one
    ) {
      setIsGeneratingLandingPage(true);
      setQuickLandingPage({ generating: true });

      try {
        const lpResponse = await fetch("/api/create/landing-page", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guideTitle: interviewData.guideTitle,
            guideTopic: interviewData.guideTopic,
            generateGuide: true, // Also generate the PDF guide
          }),
        });

        if (lpResponse.ok) {
          const lpData = await lpResponse.json();
          landingPageUrl = lpData.url;
          setQuickLandingPage({
            generating: false,
            url: lpData.url,
            gammaUrl: lpData.landingPage?.gammaUrl,
            guideUrl: lpData.guide?.gammaUrl,
          });
        } else {
          const error = await lpResponse.json();
          setQuickLandingPage({
            generating: false,
            error: error.error || "Failed to generate landing page",
          });
        }
      } catch (error) {
        console.error("Failed to generate landing page:", error);
        setQuickLandingPage({
          generating: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
      setIsGeneratingLandingPage(false);
    } else if (quickLandingPage?.url) {
      // Use existing landing page URL
      landingPageUrl = quickLandingPage.url;
    }

    try {
      const response = await fetch("/api/create/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType,
          sourceContent,
          interviewData,
          landingPageUrl, // Pass the landing page URL to content generation
          count: 3,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.options && Array.isArray(data.options)) {
          setContentOptions(data.options);
          // Auto-select first option
          if (data.options.length > 0) {
            selectContent(data.options[0].id);
          }
        }
      }
    } catch (error) {
      console.error("Failed to generate content:", error);
    }
    setIsGenerating(false);
  };

  const handleSelectContent = (id: string) => {
    selectContent(id);
    setIsEditing(false);
    setEditText("");
  };

  const handleStartEdit = () => {
    const selected = contentOptions.find((o) => o.id === selectedContentId);
    if (selected) {
      setEditText(editedContent || selected.text);
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    editContent(editText);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText("");
  };

  const handleContinue = () => {
    if (!selectedContentId) return;
    router.push("/create/platforms");
  };

  const selectedOption = contentOptions.find((o) => o.id === selectedContentId);
  const displayText = editedContent || selectedOption?.text || "";
  const canProceed = !!selectedContentId;

  if (mode !== "quick_post") return null;

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => router.push("/create/interview")}
        className="flex items-center gap-2 text-[#888888] hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Interview
      </button>

      <h1 className="text-3xl font-bold mb-2 text-white">Choose Your Content</h1>
      <p className="text-[#888888] mb-8">
        Select one of the AI-generated options or edit to make it your own.
      </p>

      {/* Loading State */}
      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-12 h-12 border-4 border-[#FF4500]/20 border-t-[#FF4500] rounded-full animate-spin mb-4" />
          <p className="text-[#888888]">
            {isGeneratingLandingPage
              ? "Creating your landing page and guide..."
              : "Generating content options..."}
          </p>
          {isGeneratingLandingPage && (
            <p className="text-xs text-[#666666] mt-2">This may take a minute</p>
          )}
        </div>
      )}

      {/* Content Options */}
      {!isGenerating && contentOptions.length > 0 && (
        <div className="space-y-4 mb-8">
          {contentOptions.map((option, index) => (
            <button
              key={option.id}
              onClick={() => handleSelectContent(option.id)}
              className={`w-full text-left p-6 rounded-xl border-2 transition-all ${
                selectedContentId === option.id
                  ? "border-[#FF4500] bg-[#FF4500]/5"
                  : "border-[#333333] bg-[#1A1A1A] hover:border-[#444444]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-[#888888]">
                      Option {index + 1}
                    </span>
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-[#333333] rounded text-xs text-white capitalize">
                      {CONTENT_TYPE_ICONS[option.type]}
                      {option.type}
                    </span>
                  </div>
                  <p className="text-white whitespace-pre-wrap">{option.text}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-xs px-2 py-1 bg-[#333333] rounded text-[#888888]">
                      Emotion: {option.emotion}
                    </span>
                    {option.hashtags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-1 bg-[#FF4500]/10 text-[#FF4500] rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    selectedContentId === option.id
                      ? "bg-[#FF4500]"
                      : "bg-[#333333]"
                  }`}
                >
                  {selectedContentId === option.id && (
                    <Check className="w-4 h-4 text-white" />
                  )}
                </div>
              </div>
            </button>
          ))}

          {/* Regenerate Button */}
          <button
            onClick={generateContent}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-[#333333] rounded-xl text-[#888888] hover:text-white hover:border-[#444444] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
            Generate New Options
          </button>
        </div>
      )}

      {/* Edit Panel */}
      {selectedContentId && !isEditing && (
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Your Content</h2>
            <button
              onClick={handleStartEdit}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#333333] hover:bg-[#444444] text-sm text-white transition-colors"
            >
              Edit
            </button>
          </div>
          <p className="text-white whitespace-pre-wrap">{displayText}</p>
          <p className="text-sm text-[#888888] mt-4">
            {displayText.length} characters
          </p>
        </div>
      )}

      {/* Editing Mode */}
      {isEditing && (
        <div className="bg-[#1A1A1A] border border-[#FF4500]/50 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-white">Edit Content</h2>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={6}
            className="w-full px-4 py-3 rounded border border-[#333333] bg-[#0D0D0D] text-white resize-none focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]/20"
          />
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-[#888888]">{editText.length} characters</p>
            <div className="flex gap-2">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 rounded border border-[#333333] hover:bg-[#333333] text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded bg-[#FF4500] hover:bg-[#CC3700] text-white transition-colors"
              >
                Save Changes
              </button>
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
        Continue to Platforms
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
