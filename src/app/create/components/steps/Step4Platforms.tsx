"use client";

import { useWizardStore, Platform } from "../../store";
import {
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Music2,
  Check,
  AlertTriangle,
  Sparkles,
  Video
} from "lucide-react";

// Platforms that support/recommend video content
const VIDEO_PLATFORMS: Platform[] = ["tiktok", "instagram_story"];

const PLATFORM_CONFIG: {
  platform: Platform;
  name: string;
  icon: React.ReactNode;
  color: string;
  formats: { value: string; label: string; recommended?: boolean }[];
  description: string;
}[] = [
  {
    platform: "instagram_feed",
    name: "Instagram Feed",
    icon: <Instagram className="h-5 w-5" />,
    color: "from-pink-500 to-purple-500",
    formats: [
      { value: "4:5", label: "Portrait (4:5)", recommended: true },
      { value: "1:1", label: "Square (1:1)" },
      { value: "1.91:1", label: "Landscape (1.91:1)" },
    ],
    description: "Best for visual content with longer captions",
  },
  {
    platform: "instagram_story",
    name: "Instagram Story",
    icon: <Instagram className="h-5 w-5" />,
    color: "from-purple-500 to-pink-500",
    formats: [
      { value: "9:16", label: "Vertical (9:16)", recommended: true },
    ],
    description: "24-hour visibility, video recommended",
  },
  {
    platform: "facebook",
    name: "Facebook",
    icon: <Facebook className="h-5 w-5" />,
    color: "from-blue-600 to-blue-500",
    formats: [
      { value: "1.91:1", label: "Landscape (1.91:1)", recommended: true },
      { value: "1:1", label: "Square (1:1)" },
    ],
    description: "Older demographic, longer content OK",
  },
  {
    platform: "linkedin",
    name: "LinkedIn",
    icon: <Linkedin className="h-5 w-5" />,
    color: "from-blue-700 to-blue-600",
    formats: [
      { value: "1.91:1", label: "Landscape (1.91:1)", recommended: true },
      { value: "1:1", label: "Square (1:1)" },
    ],
    description: "Professional tone, B2B focus",
  },
  {
    platform: "twitter",
    name: "Twitter/X",
    icon: <Twitter className="h-5 w-5" />,
    color: "from-gray-800 to-gray-700",
    formats: [
      { value: "16:9", label: "Landscape (16:9)", recommended: true },
      { value: "1:1", label: "Square (1:1)" },
    ],
    description: "Short, punchy, 280 char limit",
  },
  {
    platform: "tiktok",
    name: "TikTok",
    icon: <Music2 className="h-5 w-5" />,
    color: "from-gray-900 to-gray-800",
    formats: [
      { value: "9:16", label: "Vertical (9:16)", recommended: true },
    ],
    description: "Video-first platform, AI video enabled",
  },
];

export function Step4Platforms() {
  const { platforms, togglePlatform, setPlatformConfig, contentOptions, selectedContentId } = useWizardStore();

  const selectedContent = contentOptions.find((o) => o.id === selectedContentId);
  const enabledPlatforms = platforms.filter((p) => p.enabled);

  // AI recommendations based on content type
  const getRecommendation = (platform: Platform): "recommended" | "good" | "fair" => {
    const contentType = selectedContent?.type;
    
    if (contentType === "stat") {
      if (platform === "instagram_feed" || platform === "linkedin") return "recommended";
      if (platform === "facebook" || platform === "twitter") return "good";
    }
    if (contentType === "hook" || contentType === "teaser") {
      if (platform === "instagram_story" || platform === "tiktok") return "recommended";
    }
    if (contentType === "educational") {
      if (platform === "linkedin" || platform === "facebook") return "recommended";
    }
    return "fair";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Where Should This Go?</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Select platforms and formats for your content
        </p>
      </div>

      {/* AI Recommendation */}
      <div className="bg-gradient-to-r from-primary/5 to-transparent border border-primary/10 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground">AI Recommendation</p>
            <p className="text-muted-foreground mt-1">
              {selectedContent?.type === "stat" 
                ? "Stat-based content performs best on Instagram Feed and LinkedIn. Your stats posts get 2.3x more engagement there."
                : selectedContent?.type === "hook"
                ? "Hook content works great on Stories and TikTok where curiosity drives engagement."
                : "This content type works well across most platforms. I'd suggest starting with Instagram Feed and LinkedIn."
              }
            </p>
          </div>
        </div>
      </div>

      {/* Platform Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLATFORM_CONFIG.map(({ platform, name, icon, color, formats, description }) => {
          const config = platforms.find((p) => p.platform === platform);
          const isEnabled = config?.enabled || false;
          const recommendation = getRecommendation(platform);
          const isVideoPlatform = VIDEO_PLATFORMS.includes(platform);

          return (
            <div
              key={platform}
              className={`
                relative rounded-xl border-2 p-5 transition-all duration-200 cursor-pointer
                ${isEnabled
                  ? "border-primary bg-primary/5"
                  : "border-transparent bg-card hover:border-border"
                }
              `}
              onClick={() => togglePlatform(platform)}
            >
              {/* Recommendation Badge */}
              {recommendation === "recommended" && (
                <div className="absolute -top-2 -right-2">
                  <span className="px-2 py-1 rounded-full bg-green-500 text-white text-xs font-medium">
                    ✓ Recommended
                  </span>
                </div>
              )}

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg bg-gradient-to-br ${color} text-white`}>
                    {icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{name}</h3>
                      {isVideoPlatform && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center gap-0.5">
                          <Video className="h-3 w-3" />
                          Video
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                </div>

                <div
                  className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                    ${isEnabled
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30"
                    }
                  `}
                >
                  {isEnabled && <Check className="h-4 w-4" />}
                </div>
              </div>

              {/* Format Selection */}
              {isEnabled && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Format:</p>
                  <div className="flex flex-wrap gap-2">
                    {formats.map(({ value, label, recommended }) => (
                      <button
                        key={value}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlatformConfig(platform, { format: value });
                        }}
                        className={`
                          px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                          ${config?.format === value
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                          }
                        `}
                      >
                        {label}
                        {recommended && config?.format !== value && " ★"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {enabledPlatforms.length > 0 && (
        <div className="bg-card rounded-xl border p-4">
          <h3 className="font-medium text-sm mb-3">Visual Generation Summary</h3>
          <div className="space-y-2">
            {enabledPlatforms.map((p) => {
              const config = PLATFORM_CONFIG.find((c) => c.platform === p.platform);
              const isVideo = VIDEO_PLATFORMS.includes(p.platform);
              return (
                <div key={p.platform} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    {config?.name}
                    {isVideo && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                        8s video
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground">{p.format}</span>
                </div>
              );
            })}
          </div>

          {/* Video generation note */}
          {enabledPlatforms.some((p) => VIDEO_PLATFORMS.includes(p.platform)) && (
            <div className="mt-3 pt-3 border-t flex items-start gap-2 text-purple-600 dark:text-purple-400">
              <Video className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p className="text-xs">
                AI videos will be generated using Veo 3 (Google Gemini). Video generation takes 30-60 seconds.
              </p>
            </div>
          )}

          {enabledPlatforms.length > 2 && (
            <div className="mt-3 pt-3 border-t flex items-start gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p className="text-xs">
                Generating {enabledPlatforms.length} visuals may take longer.
                Consider starting with 1-2 platforms.
              </p>
            </div>
          )}
        </div>
      )}

      {enabledPlatforms.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Select at least one platform to continue</p>
        </div>
      )}
    </div>
  );
}
