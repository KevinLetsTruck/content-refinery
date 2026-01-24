"use client";

import { CampaignConfig } from "../../store";
import { Layers, TrendingUp, BookOpen, Lightbulb, Rss, Newspaper, MessageSquare } from "lucide-react";

interface FeedlyConfigProps {
  sourceData: Record<string, unknown> | null;
  config: CampaignConfig;
  updateConfig: (config: Partial<CampaignConfig>) => void;
}

const STRUCTURE_OPTIONS = [
  {
    id: "news_commentary",
    name: "News Commentary",
    icon: MessageSquare,
    description: "Summarize article with Kevin's expert analysis",
    example: "Summary → What they got wrong → The real story → Action",
  },
  {
    id: "angle_variation",
    name: "Angle Variation",
    icon: Layers,
    description: "Same message from different angles each day",
    example: "Day 1: Problem, Day 2: Stats, Day 3: Solution...",
  },
  {
    id: "progressive",
    name: "Progressive Education",
    icon: TrendingUp,
    description: "Build understanding day by day",
    example: "Problem → Why → Solution → Action → CTA",
  },
  {
    id: "storytelling",
    name: "Story Arc",
    icon: BookOpen,
    description: "Narrative structure with tension and resolution",
    example: "Hook → Conflict → Journey → Transformation",
  },
];

export default function FeedlyConfig({
  sourceData,
  config,
  updateConfig,
}: FeedlyConfigProps) {
  const articleUrl = sourceData?.url as string | undefined;
  const articleSource = sourceData?.source as string | undefined;

  return (
    <div className="space-y-6">
      {/* Article info */}
      {(articleSource || articleUrl) && (
        <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Rss className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-green-400 font-medium">
                Feedly Article Source
              </p>
              {articleSource && (
                <p className="text-sm text-[#888888] mt-1">{articleSource}</p>
              )}
              {articleUrl && (
                <a
                  href={articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-400 hover:underline mt-1 inline-block"
                >
                  View original article →
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Structure Selection */}
      <div>
        <label className="block text-sm font-medium mb-3 text-white">
          Campaign Structure
        </label>
        <div className="space-y-3">
          {STRUCTURE_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => updateConfig({ style: option.id })}
              className={`w-full flex items-start gap-4 p-4 rounded-lg border transition-colors text-left ${
                config.style === option.id
                  ? "border-[#FF4500] bg-[#FF4500]/10"
                  : "border-[#333333] bg-[#0D0D0D] hover:border-[#444444]"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  config.style === option.id
                    ? "bg-[#FF4500]/20"
                    : "bg-[#333333]"
                }`}
              >
                <option.icon
                  className={`w-5 h-5 ${
                    config.style === option.id
                      ? "text-[#FF4500]"
                      : "text-[#888888]"
                  }`}
                />
              </div>
              <div>
                <h4 className="font-medium text-white">{option.name}</h4>
                <p className="text-sm text-[#888888]">{option.description}</p>
                <p className="text-xs text-[#666666] mt-1">{option.example}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* AI Auto-Select */}
      {!config.style && (
        <div className="flex items-start gap-3 p-4 bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-lg">
          <Lightbulb className="w-5 h-5 text-[#3B82F6] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-[#3B82F6] font-medium">
              Let AI Decide
            </p>
            <p className="text-sm text-[#888888]">
              Skip selection and AI will choose the best structure based on the
              article content during the interview.
            </p>
          </div>
        </div>
      )}

      {/* Connect to Guide */}
      <div>
        <label className="block text-sm font-medium mb-2 text-white">
          Connect to Lead Magnet (optional)
        </label>
        <select
          value={config.productId || ""}
          onChange={(e) =>
            updateConfig({
              productId: e.target.value || null,
              ctaType: e.target.value ? "email_signup" : config.ctaType,
            })
          }
          className="w-full bg-[#0D0D0D] border border-[#333333] rounded-lg px-4 py-3 text-white focus:border-[#FF4500] focus:outline-none"
        >
          <option value="">No lead magnet</option>
          <option value="gut-health-guide">Gut Health Guide</option>
          <option value="sleep-protocol">Sleep Protocol</option>
          <option value="blood-sugar-guide">Blood Sugar Guide</option>
          <option value="cardio-protocol">Cardio Protocol</option>
        </select>
        <p className="text-sm text-[#666666] mt-1">
          If this article relates to an existing guide, AI can build the campaign
          around driving downloads.
        </p>
      </div>

      {/* Feedly campaign notes */}
      <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
        <h4 className="text-sm font-medium text-green-400 mb-2">
          <Newspaper className="w-4 h-4 inline mr-2" />
          News Commentary Best Practices
        </h4>
        <ul className="text-sm text-[#888888] space-y-1">
          <li>• Summarize key points, don't just regurgitate</li>
          <li>• Add Kevin's contrarian take or analysis</li>
          <li>• Connect it to trucker health where relevant</li>
          <li>• Challenge mainstream narratives with data</li>
          <li>• End with actionable advice drivers can use</li>
        </ul>
      </div>
    </div>
  );
}
