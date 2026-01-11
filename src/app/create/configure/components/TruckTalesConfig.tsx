"use client";

import { CampaignConfig } from "../../store";
import { BookOpen, Mic, Users, Calendar, Sparkles } from "lucide-react";

interface TruckTalesConfigProps {
  sourceData: Record<string, unknown> | null;
  config: CampaignConfig;
  updateConfig: (config: Partial<CampaignConfig>) => void;
}

const CAMPAIGN_TRIGGERS = [
  {
    id: "new_story",
    name: "New Story Launch",
    icon: BookOpen,
    description: "Full campaign for a new story release",
    recommended: "7 days before and through launch",
  },
  {
    id: "new_chapter",
    name: "New Chapter Drop",
    icon: Calendar,
    description: "Promote a new chapter in an ongoing story",
    recommended: "3-5 days",
  },
  {
    id: "character_spotlight",
    name: "Character Spotlight",
    icon: Users,
    description: "Deep dive on a character readers love",
    recommended: "3 days",
  },
  {
    id: "audio_release",
    name: "Audio Version Release",
    icon: Mic,
    description: "Promote the audio/podcast version",
    recommended: "5 days",
  },
];

export default function TruckTalesConfig({
  sourceData,
  config,
  updateConfig,
}: TruckTalesConfigProps) {
  return (
    <div className="space-y-6">
      {/* Campaign Trigger Selection */}
      <div>
        <label className="block text-sm font-medium mb-3 text-white">
          What are you promoting?
        </label>
        <div className="space-y-3">
          {CAMPAIGN_TRIGGERS.map((trigger) => (
            <button
              key={trigger.id}
              onClick={() => updateConfig({ style: trigger.id })}
              className={`w-full flex items-start gap-4 p-4 rounded-lg border transition-colors text-left ${
                config.style === trigger.id
                  ? "border-[#FF4500] bg-[#FF4500]/10"
                  : "border-[#333333] bg-[#0D0D0D] hover:border-[#444444]"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  config.style === trigger.id
                    ? "bg-[#FF4500]/20"
                    : "bg-[#333333]"
                }`}
              >
                <trigger.icon
                  className={`w-5 h-5 ${
                    config.style === trigger.id
                      ? "text-[#FF4500]"
                      : "text-[#888888]"
                  }`}
                />
              </div>
              <div>
                <h4 className="font-medium text-white">{trigger.name}</h4>
                <p className="text-sm text-[#888888]">{trigger.description}</p>
                <p className="text-xs text-[#666666] mt-1">
                  Recommended: {trigger.recommended}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Story URL */}
      <div>
        <label className="block text-sm font-medium mb-2 text-white">
          Story/Chapter URL
        </label>
        <input
          type="url"
          value={config.ctaUrl || ""}
          onChange={(e) => updateConfig({ ctaUrl: e.target.value })}
          placeholder="https://trucktales.com/stories/..."
          className="w-full bg-[#0D0D0D] border border-[#333333] rounded-lg px-4 py-3 text-white placeholder-[#666666] focus:border-[#FF4500] focus:outline-none"
        />
      </div>

      {/* Voice Profile Note */}
      <div className="flex items-start gap-3 p-4 bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 rounded-lg">
        <Sparkles className="w-5 h-5 text-[#8B5CF6] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-[#8B5CF6] font-medium">
            TruckTales Voice Profile Active
          </p>
          <p className="text-sm text-[#888888]">
            This campaign will use the TruckTales Storyteller voice - focused on
            fiction storytelling, building suspense, and engaging the reader.
            No health content will be mixed in.
          </p>
        </div>
      </div>

      {/* TruckTales campaign notes */}
      <div className="p-4 bg-[#FF4500]/5 border border-[#FF4500]/20 rounded-lg">
        <h4 className="text-sm font-medium text-[#FF4500] mb-2">
          TruckTales Campaign Best Practices
        </h4>
        <ul className="text-sm text-[#888888] space-y-1">
          <li>• Build suspense and curiosity without spoilers</li>
          <li>• Use compelling excerpts that leave readers wanting more</li>
          <li>• Introduce characters with intrigue, not full backstory</li>
          <li>• Create cliffhangers that drive to the full story</li>
          <li>• Save the resolution/payoff for those who read</li>
        </ul>
      </div>
    </div>
  );
}
