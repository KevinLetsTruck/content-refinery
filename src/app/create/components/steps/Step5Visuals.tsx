"use client";

import { useState, useEffect } from "react";
import { useWizardStore, GammaVisual, Platform, MediaType } from "../../store";
import {
  Loader2,
  Check,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Image as ImageIcon,
  Video,
  Play,
  Sparkles
} from "lucide-react";

// Platforms that work best with video content
const VIDEO_PREFERRED_PLATFORMS: Platform[] = ["tiktok", "instagram_story"];

// Check if a platform is video-preferred
const isVideoPlatform = (platform: Platform): boolean => {
  return VIDEO_PREFERRED_PLATFORMS.includes(platform);
};

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
    editedContent,
    sourceContent,
    visuals,
    setVisual,
    setLoading,
    isLoading,
  } = useWizardStore();

  const [generatingAll, setGeneratingAll] = useState(false);
  // Track media type selection per platform (video-preferred platforms default to video)
  const [mediaTypeOverrides, setMediaTypeOverrides] = useState<Record<Platform, MediaType>>({} as Record<Platform, MediaType>);

  // Get the media type for a platform (uses override or default based on platform type)
  const getMediaTypeForPlatform = (platform: Platform): MediaType => {
    if (mediaTypeOverrides[platform]) {
      return mediaTypeOverrides[platform];
    }
    return isVideoPlatform(platform) ? "video" : "image";
  };

  // Toggle media type for a platform
  const toggleMediaType = (platform: Platform) => {
    const current = getMediaTypeForPlatform(platform);
    setMediaTypeOverrides(prev => ({
      ...prev,
      [platform]: current === "video" ? "image" : "video"
    }));
  };

  const enabledPlatforms = platforms.filter((p) => p.enabled);
  const selectedContent = contentOptions.find((o) => o.id === selectedContentId);

  // Get the actual text to use for image generation
  const contentText = editedContent || selectedContent?.text || sourceContent || "";

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
      const mediaType = getMediaTypeForPlatform(platform.platform);
      setVisual(platform.platform, { status: "generating", mediaType });

      try {
        if (mediaType === "video") {
          // Generate video using Veo 3
          console.log(`[Step5] Generating VIDEO for ${platform.platform} using Veo 3...`);

          const response = await fetch("/api/videos/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: contentText,
              contentType: selectedContent?.type || "educational",
              platform: platform.platform,
              duration: 8, // Default 8 seconds
            }),
          });

          const data = await response.json();
          console.log(`[Step5] Veo 3 Response for ${platform.platform}:`, data);

          if (response.ok && data.videoUrl) {
            setVisual(platform.platform, {
              status: "completed",
              mediaType: "video",
              videoUrl: data.videoUrl,
              duration: data.duration || 8,
            });
          } else {
            const errorMessage = data.error || `Video generation failed (HTTP ${response.status})`;
            console.error(`[Step5] Veo 3 failed for ${platform.platform}:`, errorMessage);
            setVisual(platform.platform, {
              status: "failed",
              mediaType: "video",
              error: errorMessage,
            });
          }
        } else {
          // Generate image using Nano Banana (Google Gemini)
          console.log(`[Step5] Generating IMAGE for ${platform.platform} using Nano Banana...`);

          const response = await fetch("/api/images/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: contentText,
              contentType: selectedContent?.type || "educational",
              platform: platform.platform,
            }),
          });

          const data = await response.json();
          console.log(`[Step5] Nano Banana Response for ${platform.platform}:`, data);

          if (response.ok && data.imageUrl) {
            setVisual(platform.platform, {
              status: "completed",
              mediaType: "image",
              generationId: data.filename,
              gammaUrl: data.imageUrl,
              imageUrl: data.imageUrl,
            });
          } else {
            const errorMessage = data.error || `Image generation failed (HTTP ${response.status})`;
            console.error(`[Step5] Nano Banana failed for ${platform.platform}:`, errorMessage);
            setVisual(platform.platform, {
              status: "failed",
              mediaType: "image",
              error: errorMessage,
            });
          }
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

    const mediaType = getMediaTypeForPlatform(platform);
    setVisual(platform, { status: "generating", mediaType });

    try {
      if (mediaType === "video") {
        console.log(`[Step5] Regenerating VIDEO for ${platform} using Veo 3...`);

        const response = await fetch("/api/videos/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: contentText,
            contentType: selectedContent?.type || "educational",
            platform: platform,
            duration: 8,
          }),
        });

        const data = await response.json();
        console.log(`[Step5] Veo 3 Regenerate response for ${platform}:`, data);

        if (response.ok && data.videoUrl) {
          setVisual(platform, {
            status: "completed",
            mediaType: "video",
            videoUrl: data.videoUrl,
            duration: data.duration || 8,
          });
        } else {
          const errorMessage = data.error || `Video generation failed (HTTP ${response.status})`;
          console.error(`[Step5] Veo 3 Regeneration failed for ${platform}:`, errorMessage);
          setVisual(platform, {
            status: "failed",
            mediaType: "video",
            error: errorMessage,
          });
        }
      } else {
        console.log(`[Step5] Regenerating IMAGE for ${platform} using Nano Banana...`);

        const response = await fetch("/api/images/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: contentText,
            contentType: selectedContent?.type || "educational",
            platform: platform,
          }),
        });

        const data = await response.json();
        console.log(`[Step5] Nano Banana Regenerate response for ${platform}:`, data);

        if (response.ok && data.imageUrl) {
          setVisual(platform, {
            status: "completed",
            mediaType: "image",
            generationId: data.filename,
            gammaUrl: data.imageUrl,
            imageUrl: data.imageUrl,
          });
        } else {
          const errorMessage = data.error || `Image generation failed (HTTP ${response.status})`;
          console.error(`[Step5] Nano Banana Regeneration failed for ${platform}:`, errorMessage);
          setVisual(platform, {
            status: "failed",
            mediaType: "image",
            error: errorMessage,
          });
        }
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
            AI is generating on-brand graphics for each platform
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

      {/* Info Note */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <ImageIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-blue-700 dark:text-blue-300">Visual Generation</p>
            <p className="text-muted-foreground mt-1">
              AI-generated images are created using Google Gemini and automatically attached to your posts.
            </p>
          </div>
        </div>
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
          const mediaType = getMediaTypeForPlatform(platform.platform);
          const isVideoRecommended = isVideoPlatform(platform.platform);

          return (
            <div
              key={platform.platform}
              className="bg-card rounded-xl border overflow-hidden"
            >
              {/* Platform Header */}
              <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{PLATFORM_NAMES[platform.platform]}</h3>
                    {isVideoRecommended && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                        <Video className="h-3 w-3" />
                        Video
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{dimensions}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={visual?.status || "pending"} mediaType={mediaType} duration={visual?.duration} />
                </div>
              </div>

              {/* Media Type Toggle - only for video-recommended platforms */}
              {isVideoRecommended && !generatingAll && visual?.status !== "generating" && (
                <div className="px-4 py-2 border-b bg-muted/10 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Media type:</span>
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                    <button
                      onClick={() => mediaType === "video" && toggleMediaType(platform.platform)}
                      className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                        mediaType === "image"
                          ? "bg-background shadow text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <ImageIcon className="h-3 w-3" />
                      Image
                    </button>
                    <button
                      onClick={() => mediaType === "image" && toggleMediaType(platform.platform)}
                      className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                        mediaType === "video"
                          ? "bg-background shadow text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Video className="h-3 w-3" />
                      Video
                    </button>
                  </div>
                </div>
              )}

              {/* Preview Area */}
              <div className="aspect-square bg-muted/50 flex items-center justify-center relative">
                {visual?.status === "generating" && (
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground mt-3">
                      {mediaType === "video" ? "Generating video..." : "Generating image..."}
                    </p>
                    {mediaType === "video" && (
                      <p className="text-xs text-muted-foreground mt-1">This may take 30-60 seconds</p>
                    )}
                  </div>
                )}

                {/* Completed VIDEO preview */}
                {visual?.status === "completed" && visual.videoUrl && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-500/10 to-purple-500/5">
                    <video
                      src={visual.videoUrl}
                      className="absolute inset-0 w-full h-full object-cover opacity-50"
                      muted
                      loop
                      playsInline
                    />
                    <div className="relative z-10 text-center">
                      <div className="p-3 rounded-full bg-purple-500/20 mx-auto w-fit">
                        <Play className="h-10 w-10 text-purple-500" />
                      </div>
                      <p className="text-sm font-medium mt-3">Video Ready</p>
                      {visual.duration && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs">
                          {visual.duration}s
                        </span>
                      )}
                      <a
                        href={visual.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary text-sm mt-2 hover:underline justify-center"
                      >
                        Watch Video
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Completed IMAGE preview */}
                {visual?.status === "completed" && visual.imageUrl && !visual.videoUrl && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                    <img
                      src={visual.imageUrl}
                      alt={`${PLATFORM_NAMES[platform.platform]} visual`}
                      className="absolute inset-0 w-full h-full object-cover opacity-50"
                    />
                    <div className="relative z-10 text-center">
                      <Check className="h-12 w-12 text-green-500 mx-auto" />
                      <p className="text-sm font-medium mt-3">Image Ready</p>
                      <a
                        href={visual.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary text-sm mt-2 hover:underline"
                      >
                        View Image
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
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
                    {mediaType === "video" ? (
                      <Video className="h-8 w-8 mx-auto opacity-50" />
                    ) : (
                      <ImageIcon className="h-8 w-8 mx-auto opacity-50" />
                    )}
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

                {visual?.videoUrl && (
                  <a
                    href={visual.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    Watch Video
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}

                {visual?.imageUrl && !visual.videoUrl && (
                  <a
                    href={visual.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    View Image
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

function StatusBadge({
  status,
  mediaType = "image",
  duration
}: {
  status: GammaVisual["status"];
  mediaType?: MediaType;
  duration?: number;
}) {
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
          {mediaType === "video" ? "Rendering" : "Generating"}
        </span>
      );
    case "completed":
      return (
        <div className="flex items-center gap-1.5">
          {mediaType === "video" && duration && (
            <span className="px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs">
              {duration}s
            </span>
          )}
          <span className="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs flex items-center gap-1">
            <Check className="h-3 w-3" />
            Ready
          </span>
        </div>
      );
    case "failed":
      return (
        <span className="px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs">
          Failed
        </span>
      );
  }
}
