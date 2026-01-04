"use client";

import { useState, useEffect } from "react";
import { useWizardStore, GammaVisual, Platform } from "../../store";
import { 
  Loader2, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink,
  Image as ImageIcon,
  Sparkles
} from "lucide-react";

const PLATFORM_NAMES: Record<Platform, string> = {
  instagram_feed: "Instagram Feed",
  instagram_story: "Instagram Story",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  twitter: "Twitter/X",
  tiktok: "TikTok",
};

const PLATFORM_DIMENSIONS: Record<string, string> = {
  "4:5": "1080 × 1350",
  "1:1": "1080 × 1080",
  "9:16": "1080 × 1920",
  "16:9": "1920 × 1080",
  "1.91:1": "1200 × 627",
};

export function Step5Visuals() {
  const {
    platforms,
    contentOptions,
    selectedContentId,
    visuals,
    setVisual,
    setLoading,
    isLoading,
  } = useWizardStore();

  const [generatingAll, setGeneratingAll] = useState(false);

  const enabledPlatforms = platforms.filter((p) => p.enabled);
  const selectedContent = contentOptions.find((o) => o.id === selectedContentId);

  // Start generating visuals on mount
  useEffect(() => {
    if (visuals.length === 0 && enabledPlatforms.length > 0) {
      generateAllVisuals();
    }
  }, []);

  const generateAllVisuals = async () => {
    setGeneratingAll(true);
    setLoading(true);

    for (const platform of enabledPlatforms) {
      setVisual(platform.platform, { status: "generating" });
      
      try {
        console.log(`[Step5] Generating visual for ${platform.platform} (${platform.format})...`);
        
        const response = await fetch("/api/gamma/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: selectedContent?.text || "",
            contentType: selectedContent?.type || "educational",
            format: platform.format,
            platform: platform.platform,
            waitForResult: true,
          }),
        });

        const data = await response.json();
        console.log(`[Step5] Response for ${platform.platform}:`, data);

        if (response.ok && data.gammaUrl) {
          setVisual(platform.platform, {
            status: "completed",
            generationId: data.generationId,
            gammaUrl: data.gammaUrl,
          });
        } else {
          // Show the actual error from the API
          const errorMessage = data.error || `Generation failed (HTTP ${response.status})`;
          console.error(`[Step5] Generation failed for ${platform.platform}:`, errorMessage);
          setVisual(platform.platform, {
            status: "failed",
            error: errorMessage,
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Network error";
        console.error(`[Step5] Network error for ${platform.platform}:`, error);
        setVisual(platform.platform, {
          status: "failed",
          error: errorMessage,
        });
      }
    }

    setGeneratingAll(false);
    setLoading(false);
  };

  const regenerateSingle = async (platform: Platform) => {
    const config = platforms.find((p) => p.platform === platform);
    if (!config) return;

    setVisual(platform, { status: "generating" });

    try {
      console.log(`[Step5] Regenerating visual for ${platform} (${config.format})...`);
      
      const response = await fetch("/api/gamma/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: selectedContent?.text || "",
          contentType: selectedContent?.type || "educational",
          format: config.format,
          platform: platform,
          waitForResult: true,
        }),
      });

      const data = await response.json();
      console.log(`[Step5] Regenerate response for ${platform}:`, data);

      if (response.ok && data.gammaUrl) {
        setVisual(platform, {
          status: "completed",
          generationId: data.generationId,
          gammaUrl: data.gammaUrl,
        });
      } else {
        const errorMessage = data.error || `Generation failed (HTTP ${response.status})`;
        console.error(`[Step5] Regeneration failed for ${platform}:`, errorMessage);
        setVisual(platform, {
          status: "failed",
          error: errorMessage,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Network error";
      console.error(`[Step5] Network error for ${platform}:`, error);
      setVisual(platform, {
        status: "failed",
        error: errorMessage,
      });
    }
  };

  const getVisualForPlatform = (platform: Platform): GammaVisual | undefined => {
    return visuals.find((v) => v.platform === platform);
  };

  const allCompleted = enabledPlatforms.every((p) => {
    const visual = getVisualForPlatform(p.platform);
    return visual?.status === "completed";
  });

  const anyFailed = enabledPlatforms.some((p) => {
    const visual = getVisualForPlatform(p.platform);
    return visual?.status === "failed";
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Creating Your Visuals</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gamma is generating on-brand graphics for each platform
          </p>
        </div>
        
        {!generatingAll && (
          <button
            onClick={generateAllVisuals}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border hover:bg-accent transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Regenerate All
          </button>
        )}
      </div>

      {/* Progress Overview */}
      {generatingAll && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
            <div>
              <p className="font-medium">Generating visuals...</p>
              <p className="text-sm text-muted-foreground">
                Using Let's Truck theme with brand voice rules
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Visual Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {enabledPlatforms.map((platform) => {
          const visual = getVisualForPlatform(platform.platform);
          const dimensions = PLATFORM_DIMENSIONS[platform.format] || platform.format;

          return (
            <div
              key={platform.platform}
              className="bg-card rounded-xl border overflow-hidden"
            >
              {/* Platform Header */}
              <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{PLATFORM_NAMES[platform.platform]}</h3>
                  <p className="text-xs text-muted-foreground">{dimensions}</p>
                </div>
                <StatusBadge status={visual?.status || "pending"} />
              </div>

              {/* Preview Area */}
              <div className="aspect-square bg-muted/50 flex items-center justify-center relative">
                {visual?.status === "generating" && (
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground mt-3">Generating...</p>
                  </div>
                )}

                {visual?.status === "completed" && visual.gammaUrl && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                    <ImageIcon className="h-12 w-12 text-primary/40" />
                    <p className="text-sm font-medium mt-3">Visual Ready</p>
                    <a
                      href={visual.gammaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary text-sm mt-2 hover:underline"
                    >
                      View in Gamma
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {visual?.status === "failed" && (
                  <div className="text-center">
                    <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
                    <p className="text-sm text-destructive mt-3">{visual.error}</p>
                  </div>
                )}

                {(!visual || visual.status === "pending") && !generatingAll && (
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8 mx-auto opacity-50" />
                    <p className="text-sm mt-3">Waiting to generate</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-4 py-3 border-t flex items-center justify-between">
                <button
                  onClick={() => regenerateSingle(platform.platform)}
                  disabled={visual?.status === "generating"}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Regenerate
                </button>

                {visual?.gammaUrl && (
                  <a
                    href={visual.gammaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    Open
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion Status */}
      {allCompleted && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-full bg-green-500 text-white">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium text-green-700 dark:text-green-300">
                All visuals generated!
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Click Continue to review and finalize your content.
              </p>
            </div>
          </div>
        </div>
      )}

      {anyFailed && !generatingAll && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-300">
                Some visuals failed to generate
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Try regenerating them or continue with what's available.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Brand Notice */}
      <div className="flex items-start gap-3 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <p>
          All visuals are generated with your Let's Truck brand theme and voice rules applied. 
          The AI will never use "trucker" - always "driver", "O/O", or "The Tribe".
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: GammaVisual["status"] }) {
  switch (status) {
    case "pending":
      return (
        <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs">
          Pending
        </span>
      );
    case "generating":
      return (
        <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Generating
        </span>
      );
    case "completed":
      return (
        <span className="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs flex items-center gap-1">
          <Check className="h-3 w-3" />
          Ready
        </span>
      );
    case "failed":
      return (
        <span className="px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs">
          Failed
        </span>
      );
  }
}
