"use client";

import { useRouter } from "next/navigation";
import { useWizardStore, Platform, GammaVisual } from "../store";
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Check,
  X,
  Loader2,
  Image as ImageIcon,
  Download,
  ExternalLink,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Music2,
} from "lucide-react";
import { useEffect, useState } from "react";

const PLATFORM_ICONS: Record<Platform, React.ReactNode> = {
  instagram_feed: <Instagram className="w-5 h-5" />,
  instagram_story: <Instagram className="w-5 h-5" />,
  facebook: <Facebook className="w-5 h-5" />,
  linkedin: <Linkedin className="w-5 h-5" />,
  twitter: <Twitter className="w-5 h-5" />,
  tiktok: <Music2 className="w-5 h-5" />,
};

const PLATFORM_FORMATS: Record<Platform, { width: number; height: number; label: string }> = {
  instagram_feed: { width: 1080, height: 1350, label: "4:5" },
  instagram_story: { width: 1080, height: 1920, label: "9:16" },
  facebook: { width: 1200, height: 630, label: "1.91:1" },
  linkedin: { width: 1200, height: 628, label: "1.91:1" },
  twitter: { width: 1200, height: 675, label: "16:9" },
  tiktok: { width: 1080, height: 1920, label: "9:16" },
};

export default function VisualsPage() {
  const router = useRouter();
  const {
    mode,
    sourceType,
    sourceContent,
    platforms,
    contentOptions,
    selectedContentId,
    editedContent,
    visuals,
    setVisual,
    currentStep,
    goToStep,
    getSteps,
  } = useWizardStore();

  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  // Get the correct step number for visuals
  const steps = getSteps();
  const visualsStep = steps.find((s) => s.path === "/create/visuals");
  const visualsStepNumber = visualsStep?.number || 6;

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
    if (currentStep !== visualsStepNumber) {
      goToStep(visualsStepNumber);
    }
  }, [mode, sourceContent, currentStep, visualsStepNumber, goToStep, router]);

  const generateVisual = async (platform: Platform) => {
    setVisual(platform, { status: "generating" });

    try {
      const format = PLATFORM_FORMATS[platform];
      const response = await fetch("/api/gamma/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: contentText,
          contentType: selectedContent?.type || "quote",
          platform,
          dimensions: { width: format.width, height: format.height },
          waitForResult: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setVisual(platform, {
          status: "completed",
          generationId: data.id,
          gammaUrl: data.gammaUrl,
          imageUrl: data.imageUrl,
          exportUrl: data.exportUrl,
        });
      } else {
        throw new Error("Generation failed");
      }
    } catch (error) {
      console.error("Failed to generate visual:", error);
      setVisual(platform, {
        status: "failed",
        error: "Generation failed. Please try again.",
      });
    }
  };

  const generateAllVisuals = async () => {
    setIsGeneratingAll(true);
    for (const platform of enabledPlatforms) {
      const existing = visuals.find((v) => v.platform === platform.platform);
      if (!existing || existing.status === "failed") {
        await generateVisual(platform.platform);
      }
    }
    setIsGeneratingAll(false);
  };

  const getVisualForPlatform = (platform: Platform): GammaVisual | undefined => {
    return visuals.find((v) => v.platform === platform);
  };

  const handleContinue = () => {
    router.push("/create/review");
  };

  const allVisualsGenerated = enabledPlatforms.every((p) => {
    const visual = getVisualForPlatform(p.platform);
    return visual && visual.status === "completed";
  });

  const someVisualsGenerating = visuals.some((v) => v.status === "generating");

  if (mode !== "quick_post") return null;

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => router.push("/create/platforms")}
        className="flex items-center gap-2 text-[#888888] hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Platforms
      </button>

      <h1 className="text-3xl font-bold mb-2 text-white">Generate Visuals</h1>
      <p className="text-[#888888] mb-8">
        Create on-brand visuals for each platform using Gamma AI. Once generated,
        open in Gamma to customize and download your images.
      </p>

      {/* Generate All Button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={generateAllVisuals}
          disabled={isGeneratingAll || someVisualsGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 rounded-lg text-white font-medium transition-all"
        >
          {isGeneratingAll || someVisualsGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <ImageIcon className="w-4 h-4" />
              Generate All Visuals
            </>
          )}
        </button>
      </div>

      {/* Visual Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {enabledPlatforms.map((platformConfig) => {
          const platform = platformConfig.platform;
          const visual = getVisualForPlatform(platform);
          const format = PLATFORM_FORMATS[platform];

          return (
            <div
              key={platform}
              className="bg-[#1A1A1A] border border-[#333333] rounded-xl overflow-hidden"
            >
              {/* Platform Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#333333]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#333333] rounded-lg flex items-center justify-center text-white">
                    {PLATFORM_ICONS[platform]}
                  </div>
                  <div>
                    <p className="font-medium capitalize text-white">
                      {platform.replace("_", " ")}
                    </p>
                    <p className="text-xs text-[#888888]">{format.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {visual?.status === "completed" && (
                    <Check className="w-5 h-5 text-[#22C55E]" />
                  )}
                  {visual?.status === "failed" && (
                    <X className="w-5 h-5 text-red-400" />
                  )}
                  {visual?.status === "generating" && (
                    <Loader2 className="w-5 h-5 text-[#FF4500] animate-spin" />
                  )}
                </div>
              </div>

              {/* Visual Preview */}
              <div
                className="relative bg-[#0D0D0D] flex items-center justify-center"
                style={{
                  aspectRatio:
                    format.width / format.height > 1
                      ? `${format.width}/${format.height}`
                      : "1/1",
                  minHeight: "200px",
                }}
              >
                {!visual && (
                  <div className="text-center p-6">
                    <ImageIcon className="w-12 h-12 text-[#333333] mx-auto mb-3" />
                    <p className="text-sm text-[#888888]">No visual yet</p>
                    <button
                      onClick={() => generateVisual(platform)}
                      className="mt-3 px-4 py-2 bg-[#333333] hover:bg-[#444444] rounded text-sm text-white transition-colors"
                    >
                      Generate
                    </button>
                  </div>
                )}

                {visual?.status === "generating" && (
                  <div className="text-center p-6">
                    <Loader2 className="w-12 h-12 text-[#FF4500] mx-auto mb-3 animate-spin" />
                    <p className="text-sm text-[#888888]">Generating visual...</p>
                  </div>
                )}

                {visual?.status === "failed" && (
                  <div className="text-center p-6">
                    <X className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <p className="text-sm text-red-400 mb-3">{visual.error}</p>
                    <button
                      onClick={() => generateVisual(platform)}
                      className="px-4 py-2 bg-[#333333] hover:bg-[#444444] rounded text-sm text-white transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 inline mr-2" />
                      Retry
                    </button>
                  </div>
                )}

                {visual?.status === "completed" && (
                  <div className="text-center p-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-[#22C55E]" />
                    </div>
                    <p className="text-white font-medium mb-1">Visual Created!</p>
                    <p className="text-sm text-[#888888] mb-4">
                      Open in Gamma to view, edit, and download
                    </p>
                    {visual.gammaUrl && (
                      <a
                        href={visual.gammaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg text-sm font-medium text-white transition-all"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open in Gamma
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              {visual?.status === "completed" && (
                <div className="flex gap-2 p-3 border-t border-[#333333]">
                  {visual.gammaUrl && (
                    <a
                      href={visual.gammaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#333333] hover:bg-[#444444] rounded text-sm text-white transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Edit in Gamma
                    </a>
                  )}
                  <button
                    onClick={() => generateVisual(platform)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-[#333333] hover:bg-[#444444] rounded text-sm text-white transition-colors"
                    title="Regenerate visual"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        className="w-full flex items-center justify-center gap-2 bg-[#FF4500] hover:bg-[#CC3700] px-6 py-4 rounded-lg font-medium text-white transition-colors"
      >
        Continue to Review
        <ArrowRight className="w-4 h-4" />
      </button>

      {!allVisualsGenerated && (
        <p className="text-center text-sm text-[#888888] mt-4">
          You can continue without generating all visuals
        </p>
      )}
    </div>
  );
}
