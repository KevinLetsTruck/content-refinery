"use client";

import { useRouter } from "next/navigation";
import { useWizardStore } from "../store";
import { ArrowLeft, ArrowRight, RefreshCw, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

export default function StrategyPage() {
  const router = useRouter();
  const {
    sourceType,
    sourceData,
    sourceContent,
    sourceTitle,
    contentCategory,
    campaignConfig,
    interviewAnswers,
    contentStrategy,
    setContentStrategy,
    nextStep,
    prevStep,
    currentStep,
    goToStep,
    mode,
  } = useWizardStore();

  const [loading, setLoading] = useState(!contentStrategy);
  const [error, setError] = useState<string | null>(null);

  const generateStrategy = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/wizard/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType,
          sourceData: {
            ...sourceData,
            // Include the actual content the user typed (this is the key field!)
            content: sourceContent,
            title: sourceTitle,
          },
          sourceContent,
          sourceTitle,
          contentCategory,
          campaignConfig,
          interviewAnswers,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate strategy");

      const { strategy } = await response.json();
      setContentStrategy(strategy);
    } catch (err) {
      setError("Failed to generate strategy. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [sourceType, sourceData, sourceContent, sourceTitle, contentCategory, campaignConfig, interviewAnswers, setContentStrategy]);

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

  useEffect(() => {
    if (currentStep !== 5) {
      goToStep(5);
    }
  }, [currentStep, goToStep]);

  useEffect(() => {
    if (!contentStrategy && sourceType) {
      generateStrategy();
    }
  }, [contentStrategy, sourceType, generateStrategy]);

  const handleContinue = () => {
    nextStep();
    router.push("/create/platforms");
  };

  const handleBack = () => {
    prevStep();
    router.push("/create/interview");
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-[#FF4500] animate-spin mb-4" />
        <h2 className="text-xl font-semibold mb-2 text-white">
          Generating Your Campaign Strategy
        </h2>
        <p className="text-[#888888]">
          AI is crafting a custom content plan...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={generateStrategy}
            className="bg-[#FF4500] hover:bg-[#CC3700] px-4 py-2 rounded-lg text-white"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!contentStrategy) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-[#888888] hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white">
            {contentStrategy.campaignName}
          </h1>
          <p className="text-[#888888]">
            {campaignConfig.duration} days &bull;{" "}
            {campaignConfig.platforms.join(", ")}
          </p>
        </div>
        <button
          onClick={generateStrategy}
          className="flex items-center gap-2 text-[#888888] hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Regenerate
        </button>
      </div>

      {/* Key Messages */}
      <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-white">Key Messages</h2>
        <ul className="space-y-2">
          {contentStrategy.keyMessages.map((msg, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-6 h-6 bg-[#FF4500]/20 text-[#FF4500] rounded-full flex items-center justify-center text-sm flex-shrink-0">
                {i + 1}
              </span>
              <span className="text-[#CCCCCC]">{msg}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Phases */}
      <div className="space-y-4 mb-8">
        <h2 className="text-lg font-semibold text-white">Campaign Phases</h2>
        {contentStrategy.phases.map((phase, i) => (
          <div
            key={i}
            className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">{phase.name}</h3>
              <span className="text-sm text-[#666666]">
                Days {phase.dayRange[0]}-{phase.dayRange[1]}
              </span>
            </div>
            <p className="text-[#888888] mb-4">{phase.purpose}</p>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-[#666666] mb-2">
                  Themes
                </h4>
                <div className="flex flex-wrap gap-2">
                  {phase.themes.map((theme, j) => (
                    <span
                      key={j}
                      className="bg-[#333333] px-3 py-1 rounded-full text-sm text-white"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-[#666666] mb-2">
                  Hooks
                </h4>
                <div className="flex flex-wrap gap-2">
                  {phase.hooks.map((hook, j) => (
                    <span
                      key={j}
                      className="bg-[#FF4500]/10 text-[#FF4500] px-3 py-1 rounded-full text-sm"
                    >
                      {hook}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Landing Page Preview (if applicable) */}
      {contentStrategy.landingPageCopy && (
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-white">
            Landing Page Copy
          </h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-[#666666]">Headline:</span>
              <p className="text-xl font-bold text-white">
                {contentStrategy.landingPageCopy.headline}
              </p>
            </div>
            <div>
              <span className="text-sm text-[#666666]">Subhead:</span>
              <p className="text-[#CCCCCC]">
                {contentStrategy.landingPageCopy.subhead}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#666666]">CTA Button:</span>
              <span className="bg-[#FF4500] px-4 py-1 rounded text-sm text-white">
                {contentStrategy.landingPageCopy.cta}
              </span>
            </div>
            {contentStrategy.landingPageCopy.bullets && (
              <div>
                <span className="text-sm text-[#666666]">Key Points:</span>
                <ul className="list-disc list-inside text-[#CCCCCC] mt-1">
                  {contentStrategy.landingPageCopy.bullets.map((bullet, i) => (
                    <li key={i}>{bullet}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Email Subjects (if applicable) */}
      {contentStrategy.emailSubjects && contentStrategy.emailSubjects.length > 0 && (
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-white">
            Email Subjects
          </h2>
          <ul className="space-y-2">
            {contentStrategy.emailSubjects.map((subject, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="text-sm text-[#666666] w-16">
                  Email {i + 1}:
                </span>
                <span className="text-[#CCCCCC]">{subject}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Continue */}
      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          className="flex items-center gap-2 bg-[#FF4500] hover:bg-[#CC3700] px-6 py-3 rounded-lg font-medium text-white transition-colors"
        >
          Approve &amp; Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
