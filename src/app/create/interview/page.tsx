"use client";

import { useRouter } from "next/navigation";
import { useWizardStore } from "../store";
import { ArrowLeft, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

interface InterviewData {
  primaryMessage: string;
  targetAudience: string;
  targetEmotion: string;
  supportingEvidence: string;
  callToAction: string;
  tone: string;
  // Guide-specific (for download_guide CTA)
  guideTitle: string;
  guideTopic: string;
}

const AUDIENCE_OPTIONS = [
  { value: "new_drivers", label: "New Drivers", description: "Newer to the industry, still learning" },
  { value: "experienced_oo", label: "Experienced O/Os", description: "Veterans with years on the road" },
  { value: "company_drivers", label: "Company Drivers", description: "Driving for a carrier, not O/O" },
  { value: "aspiring_oo", label: "Aspiring O/Os", description: "Want to become owner-operators" },
  { value: "all", label: "All Drivers", description: "Broadly applicable to everyone" },
];

const EMOTION_OPTIONS = [
  { value: "wake_up_call", label: "Wake-up Call", description: "Shock them into action with hard truths" },
  { value: "empowerment", label: "Empowerment", description: "Make them feel capable of change" },
  { value: "curiosity", label: "Curiosity", description: "Pique interest to learn more" },
  { value: "frustration", label: "Frustration", description: "Tap into frustration with current health" },
  { value: "hope", label: "Hope", description: "Show possibility of transformation" },
];

const CTA_OPTIONS = [
  { value: "visit_store", label: "Visit Store", description: "Buy from store.letstruck.com" },
  { value: "book_coaching", label: "Book Coaching", description: "Schedule a health coaching session" },
  { value: "download_guide", label: "Download Guide", description: "Get a free guide" },
  { value: "join_community", label: "Join Community", description: "Join The Tribe" },
  { value: "awareness", label: "Awareness Only", description: "No hard CTA, just spreading the word" },
];

const TONE_OPTIONS = [
  { value: "direct", label: "Direct", description: "No-BS, confrontational truth bombs" },
  { value: "educational", label: "Educational", description: "Teaching mode, explaining concepts" },
  { value: "inspirational", label: "Inspirational", description: "Uplifting, transformation-focused" },
  { value: "urgent", label: "Urgent", description: "Time-sensitive, act now messaging" },
  { value: "conversational", label: "Conversational", description: "Casual, like talking to a friend" },
];

export default function InterviewPage() {
  const router = useRouter();
  const {
    sourceType,
    sourceContent,
    sourceTitle,
    mode,
    interviewData,
    setInterviewData,
    setInterviewComplete,
    nextStep,
    prevStep,
    currentStep,
    goToStep,
    contentCategory,
  } = useWizardStore();

  const [formData, setFormData] = useState<InterviewData>({
    primaryMessage: interviewData.primaryMessage || "",
    targetAudience: interviewData.targetAudience || "all",
    targetEmotion: interviewData.targetEmotion || "wake_up_call",
    supportingEvidence: interviewData.supportingEvidence || "",
    callToAction: interviewData.callToAction || "awareness",
    tone: interviewData.tone || "direct",
    guideTitle: interviewData.guideTitle || "",
    guideTopic: interviewData.guideTopic || "",
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingField, setRegeneratingField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const expectedStep = mode === "quick_post" ? 3 : 4;

  useEffect(() => {
    if (!sourceType || !mode) {
      router.push("/create");
      return;
    }
  }, [sourceType, mode, router]);

  useEffect(() => {
    if (currentStep !== expectedStep) {
      goToStep(expectedStep);
    }
  }, [currentStep, expectedStep, goToStep]);

  const generatePrefill = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/wizard/interview/prefill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType,
          sourceContent,
          sourceTitle,
          mode,
          contentCategory,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate content brief");

      const data = await response.json();
      setFormData({
        primaryMessage: data.primaryMessage || "",
        targetAudience: data.targetAudience || "all",
        targetEmotion: data.targetEmotion || "wake_up_call",
        supportingEvidence: data.supportingEvidence || "",
        callToAction: data.callToAction || "awareness",
        tone: data.tone || "direct",
        guideTitle: data.guideTitle || "",
        guideTopic: data.guideTopic || "",
      });
    } catch (err) {
      console.error("Prefill error:", err);
      setError("Failed to generate content brief. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [sourceType, sourceContent, sourceTitle, mode, contentCategory]);

  // Generate prefill on mount if fields are empty
  useEffect(() => {
    if (sourceType && !formData.primaryMessage && !isGenerating) {
      generatePrefill();
    }
  }, [sourceType, formData.primaryMessage, isGenerating, generatePrefill]);

  const regenerateField = async (field: keyof InterviewData) => {
    setRegeneratingField(field);
    try {
      const response = await fetch("/api/wizard/interview/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field,
          sourceType,
          sourceContent,
          sourceTitle,
          currentValues: formData,
          contentCategory,
        }),
      });

      if (!response.ok) throw new Error("Failed to regenerate");

      const data = await response.json();
      if (data[field]) {
        setFormData((prev) => ({ ...prev, [field]: data[field] }));
      }
    } catch (err) {
      console.error("Regenerate error:", err);
    } finally {
      setRegeneratingField(null);
    }
  };

  const handleFieldChange = (field: keyof InterviewData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleContinue = () => {
    // Save to store
    setInterviewData({
      primaryMessage: formData.primaryMessage,
      targetAudience: formData.targetAudience,
      targetEmotion: formData.targetEmotion,
      supportingEvidence: formData.supportingEvidence,
      callToAction: formData.callToAction,
      tone: formData.tone,
      guideTitle: formData.guideTitle,
      guideTopic: formData.guideTopic,
    });
    setInterviewComplete(true);
    nextStep();

    if (mode === "quick_post") {
      router.push("/create/content");
    } else {
      router.push("/create/strategy");
    }
  };

  const handleBack = () => {
    prevStep();
    if (mode === "quick_post") {
      router.push("/create/mode");
    } else {
      router.push("/create/configure");
    }
  };

  const canProceed = formData.primaryMessage.trim() && formData.supportingEvidence.trim();

  if (isGenerating) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#FF4500] animate-spin mb-4" />
        <p className="text-[#888888]">Generating your content brief...</p>
        <p className="text-sm text-[#666666] mt-2">AI is analyzing your content</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-[#888888] hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h1 className="text-3xl font-bold mb-2 text-white">Review Your Content Brief</h1>
      <p className="text-[#888888] mb-8">
        AI has filled in these details based on your source content. Edit anything that doesn&apos;t look right.
      </p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 mb-6">
          <p className="text-red-400 mb-2">{error}</p>
          <button
            onClick={generatePrefill}
            className="text-sm text-red-400 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      <div className="space-y-6">
        {/* Primary Message */}
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-white">Primary Message</label>
            <button
              onClick={() => regenerateField("primaryMessage")}
              disabled={regeneratingField === "primaryMessage"}
              className="flex items-center gap-1 text-sm text-[#FF4500] hover:text-[#FF6633] disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${regeneratingField === "primaryMessage" ? "animate-spin" : ""}`} />
              Regenerate
            </button>
          </div>
          <textarea
            value={formData.primaryMessage}
            onChange={(e) => handleFieldChange("primaryMessage", e.target.value)}
            placeholder="The core message you want to communicate..."
            rows={3}
            className="w-full bg-[#0D0D0D] border border-[#333333] rounded-lg px-4 py-3 text-white placeholder-[#666666] focus:border-[#FF4500] focus:outline-none resize-none"
          />
          <p className="text-xs text-[#666666] mt-2">The main point in 1-2 compelling sentences</p>
        </div>

        {/* Target Audience */}
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-white">Target Audience</label>
            <button
              onClick={() => regenerateField("targetAudience")}
              disabled={regeneratingField === "targetAudience"}
              className="flex items-center gap-1 text-sm text-[#FF4500] hover:text-[#FF6633] disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${regeneratingField === "targetAudience" ? "animate-spin" : ""}`} />
              Regenerate
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {AUDIENCE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFieldChange("targetAudience", option.value)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  formData.targetAudience === option.value
                    ? "border-[#FF4500] bg-[#FF4500]/10"
                    : "border-[#333333] hover:border-[#444444]"
                }`}
              >
                <p className="text-sm font-medium text-white">{option.label}</p>
                <p className="text-xs text-[#888888]">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Target Emotion */}
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-white">Target Emotion</label>
            <button
              onClick={() => regenerateField("targetEmotion")}
              disabled={regeneratingField === "targetEmotion"}
              className="flex items-center gap-1 text-sm text-[#FF4500] hover:text-[#FF6633] disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${regeneratingField === "targetEmotion" ? "animate-spin" : ""}`} />
              Regenerate
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {EMOTION_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFieldChange("targetEmotion", option.value)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  formData.targetEmotion === option.value
                    ? "border-[#FF4500] bg-[#FF4500]/10"
                    : "border-[#333333] hover:border-[#444444]"
                }`}
              >
                <p className="text-sm font-medium text-white">{option.label}</p>
                <p className="text-xs text-[#888888]">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Supporting Evidence */}
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-white">Supporting Evidence</label>
            <button
              onClick={() => regenerateField("supportingEvidence")}
              disabled={regeneratingField === "supportingEvidence"}
              className="flex items-center gap-1 text-sm text-[#FF4500] hover:text-[#FF6633] disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${regeneratingField === "supportingEvidence" ? "animate-spin" : ""}`} />
              Regenerate
            </button>
          </div>
          <textarea
            value={formData.supportingEvidence}
            onChange={(e) => handleFieldChange("supportingEvidence", e.target.value)}
            placeholder="A specific stat, story, or fact that supports your message..."
            rows={3}
            className="w-full bg-[#0D0D0D] border border-[#333333] rounded-lg px-4 py-3 text-white placeholder-[#666666] focus:border-[#FF4500] focus:outline-none resize-none"
          />
          <p className="text-xs text-[#666666] mt-2">Stats, stories, or facts that make it credible</p>
        </div>

        {/* Call to Action */}
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-white">Call to Action</label>
            <button
              onClick={() => regenerateField("callToAction")}
              disabled={regeneratingField === "callToAction"}
              className="flex items-center gap-1 text-sm text-[#FF4500] hover:text-[#FF6633] disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${regeneratingField === "callToAction" ? "animate-spin" : ""}`} />
              Regenerate
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {CTA_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFieldChange("callToAction", option.value)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  formData.callToAction === option.value
                    ? "border-[#FF4500] bg-[#FF4500]/10"
                    : "border-[#333333] hover:border-[#444444]"
                }`}
              >
                <p className="text-sm font-medium text-white">{option.label}</p>
                <p className="text-xs text-[#888888]">{option.description}</p>
              </button>
            ))}
          </div>

          {/* Guide Details - shown when download_guide is selected */}
          {formData.callToAction === "download_guide" && (
            <div className="mt-4 p-4 bg-[#0D0D0D] rounded-lg border border-[#FF4500]/30 space-y-4">
              <div className="flex items-center gap-2 text-[#FF4500]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="text-sm font-medium">Guide Details</span>
              </div>
              <p className="text-xs text-[#888888]">
                We&apos;ll create a landing page for this guide. Fill in the details below.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-[#888888] mb-1">Guide Title</label>
                  <input
                    type="text"
                    value={formData.guideTitle}
                    onChange={(e) => handleFieldChange("guideTitle", e.target.value)}
                    placeholder="e.g., The Driver's Guide to Gut Health"
                    className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm placeholder-[#666666] focus:border-[#FF4500] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#888888] mb-1">Guide Topic</label>
                  <input
                    type="text"
                    value={formData.guideTopic}
                    onChange={(e) => handleFieldChange("guideTopic", e.target.value)}
                    placeholder="e.g., fixing gut health while living on the road"
                    className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm placeholder-[#666666] focus:border-[#FF4500] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tone */}
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-white">Tone</label>
            <button
              onClick={() => regenerateField("tone")}
              disabled={regeneratingField === "tone"}
              className="flex items-center gap-1 text-sm text-[#FF4500] hover:text-[#FF6633] disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${regeneratingField === "tone" ? "animate-spin" : ""}`} />
              Regenerate
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {TONE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFieldChange("tone", option.value)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  formData.tone === option.value
                    ? "border-[#FF4500] bg-[#FF4500]/10"
                    : "border-[#333333] hover:border-[#444444]"
                }`}
              >
                <p className="text-sm font-medium text-white">{option.label}</p>
                <p className="text-xs text-[#888888]">{option.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <div className="mt-8 flex justify-between items-center">
        <button
          onClick={generatePrefill}
          className="flex items-center gap-2 text-[#888888] hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Regenerate All
        </button>
        <button
          onClick={handleContinue}
          disabled={!canProceed}
          className="flex items-center gap-2 bg-[#FF4500] hover:bg-[#CC3700] disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium text-white transition-colors"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
