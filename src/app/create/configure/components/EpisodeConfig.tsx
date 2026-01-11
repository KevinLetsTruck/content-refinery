"use client";

import { CampaignConfig } from "../../store";
import { Quote, BarChart3, Flame, MessageSquare, Link2 } from "lucide-react";
import { useState } from "react";

interface EpisodeConfigProps {
  sourceData: Record<string, unknown> | null;
  config: CampaignConfig;
  updateConfig: (config: Partial<CampaignConfig>) => void;
}

const EXTRACTION_TYPES = [
  { id: "quote", name: "Quotables", icon: Quote, description: "Powerful 1-3 sentence statements" },
  { id: "stat", name: "Statistics", icon: BarChart3, description: "Surprising data points" },
  { id: "hot_take", name: "Hot Takes", icon: Flame, description: "Controversial opinions" },
  { id: "caller", name: "Caller Segments", icon: MessageSquare, description: "Memorable caller moments" },
];

const CTA_OPTIONS = [
  { id: "episode", name: "Listen to Full Episode", description: "Drive traffic to podcast" },
  { id: "email_signup", name: "Join Email List", description: "Capture leads for nurturing" },
  { id: "product", name: "Related Product", description: "Connect to recommended product" },
  { id: "coaching", name: "Book Coaching", description: "Drive coaching signups" },
];

export default function EpisodeConfig({
  sourceData,
  config,
  updateConfig,
}: EpisodeConfigProps) {
  const [selectedExtractions, setSelectedExtractions] = useState<string[]>(
    config.selectedExtractions || ["quote", "stat", "hot_take"]
  );

  const toggleExtraction = (id: string) => {
    const updated = selectedExtractions.includes(id)
      ? selectedExtractions.filter((e) => e !== id)
      : [...selectedExtractions, id];
    setSelectedExtractions(updated);
    updateConfig({ selectedExtractions: updated });
  };

  return (
    <div className="space-y-6">
      {/* Extraction Type Selection */}
      <div>
        <label className="block text-sm font-medium mb-3 text-white">
          Content Types to Extract
        </label>
        <div className="grid grid-cols-2 gap-3">
          {EXTRACTION_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => toggleExtraction(type.id)}
              className={`flex items-start gap-3 p-4 rounded-lg border transition-colors text-left ${
                selectedExtractions.includes(type.id)
                  ? "border-[#FF4500] bg-[#FF4500]/10"
                  : "border-[#333333] bg-[#0D0D0D] hover:border-[#444444]"
              }`}
            >
              <type.icon
                className={`w-5 h-5 flex-shrink-0 ${
                  selectedExtractions.includes(type.id)
                    ? "text-[#FF4500]"
                    : "text-[#888888]"
                }`}
              />
              <div>
                <h4 className="font-medium text-white text-sm">{type.name}</h4>
                <p className="text-xs text-[#666666]">{type.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* CTA Selection */}
      <div>
        <label className="block text-sm font-medium mb-3 text-white">
          Campaign Goal
        </label>
        <div className="space-y-2">
          {CTA_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => updateConfig({ ctaType: option.id })}
              className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-colors text-left ${
                config.ctaType === option.id
                  ? "border-[#FF4500] bg-[#FF4500]/10"
                  : "border-[#333333] bg-[#0D0D0D] hover:border-[#444444]"
              }`}
            >
              <Link2
                className={`w-5 h-5 ${
                  config.ctaType === option.id
                    ? "text-[#FF4500]"
                    : "text-[#888888]"
                }`}
              />
              <div>
                <h4 className="font-medium text-white text-sm">{option.name}</h4>
                <p className="text-xs text-[#666666]">{option.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* CTA URL (if episode or product) */}
      {(config.ctaType === "episode" || config.ctaType === "product") && (
        <div>
          <label className="block text-sm font-medium mb-2 text-white">
            {config.ctaType === "episode" ? "Episode URL" : "Product URL"}
          </label>
          <input
            type="url"
            value={config.ctaUrl || ""}
            onChange={(e) => updateConfig({ ctaUrl: e.target.value })}
            placeholder={
              config.ctaType === "episode"
                ? "https://audioroad.com/..."
                : "https://store.letstruck.com/..."
            }
            className="w-full bg-[#0D0D0D] border border-[#333333] rounded-lg px-4 py-3 text-white placeholder-[#666666] focus:border-[#FF4500] focus:outline-none"
          />
        </div>
      )}

      {/* Episode-specific notes */}
      <div className="p-4 bg-[#FF4500]/5 border border-[#FF4500]/20 rounded-lg">
        <h4 className="text-sm font-medium text-[#FF4500] mb-2">
          Episode Campaign Structure
        </h4>
        <ul className="text-sm text-[#888888] space-y-1">
          <li>• Day 1: Lead with the strongest hook or quote</li>
          <li>• Day 2-3: Share stats and supporting content</li>
          <li>• Day 4: Hot take or controversial angle</li>
          <li>• Day 5: CTA to full episode or next action</li>
        </ul>
      </div>
    </div>
  );
}
