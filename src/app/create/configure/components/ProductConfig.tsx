"use client";

import { CampaignConfig } from "../../store";
import { Rocket, GraduationCap, Target, Sparkles } from "lucide-react";

interface ProductConfigProps {
  sourceData: Record<string, unknown> | null;
  config: CampaignConfig;
  updateConfig: (config: Partial<CampaignConfig>) => void;
}

const CAMPAIGN_STYLES = [
  {
    id: "launch",
    name: "Product Launch",
    icon: Rocket,
    description: "Build anticipation with teaser → reveal → hard sell",
    recommended: "New products, limited editions, seasonal items",
  },
  {
    id: "education",
    name: "Education First",
    icon: GraduationCap,
    description: "Problem awareness → solution education → product intro",
    recommended: "Complex or premium products",
  },
  {
    id: "problem_solution",
    name: "Problem/Solution",
    icon: Target,
    description: "Agitate pain points → present solution → drive to purchase",
    recommended: "Products solving specific health issues",
  },
];

export default function ProductConfig({
  sourceData,
  config,
  updateConfig,
}: ProductConfigProps) {
  return (
    <div className="space-y-6">
      {/* Campaign Style Selection */}
      <div>
        <label className="block text-sm font-medium mb-3 text-white">
          Campaign Style
        </label>
        <div className="space-y-3">
          {CAMPAIGN_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => updateConfig({ style: style.id })}
              className={`w-full flex items-start gap-4 p-4 rounded-lg border transition-colors text-left ${
                config.style === style.id
                  ? "border-[#FF4500] bg-[#FF4500]/10"
                  : "border-[#333333] bg-[#0D0D0D] hover:border-[#444444]"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  config.style === style.id
                    ? "bg-[#FF4500]/20"
                    : "bg-[#333333]"
                }`}
              >
                <style.icon
                  className={`w-5 h-5 ${
                    config.style === style.id
                      ? "text-[#FF4500]"
                      : "text-[#888888]"
                  }`}
                />
              </div>
              <div>
                <h4 className="font-medium text-white">{style.name}</h4>
                <p className="text-sm text-[#888888]">{style.description}</p>
                <p className="text-xs text-[#666666] mt-1">
                  Best for: {style.recommended}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* AI Style Recommendation */}
      {!config.style && (
        <div className="flex items-start gap-3 p-4 bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-lg">
          <Sparkles className="w-5 h-5 text-[#3B82F6] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-[#3B82F6] font-medium">
              AI Recommendation
            </p>
            <p className="text-sm text-[#888888]">
              Select a style above, or leave empty to let AI choose based on your
              product and interview answers.
            </p>
          </div>
        </div>
      )}

      {/* Product URL */}
      <div>
        <label className="block text-sm font-medium mb-2 text-white">
          Product URL
        </label>
        <input
          type="url"
          value={config.ctaUrl || ""}
          onChange={(e) => updateConfig({ ctaUrl: e.target.value })}
          placeholder="https://store.letstruck.com/products/..."
          className="w-full bg-[#0D0D0D] border border-[#333333] rounded-lg px-4 py-3 text-white placeholder-[#666666] focus:border-[#FF4500] focus:outline-none"
        />
      </div>

      {/* Product-specific notes */}
      <div className="p-4 bg-[#FF4500]/5 border border-[#FF4500]/20 rounded-lg">
        <h4 className="text-sm font-medium text-[#FF4500] mb-2">
          Product Campaign Tips
        </h4>
        <ul className="text-sm text-[#888888] space-y-1">
          <li>• Include driver-specific use cases (in the cab, at rest stops)</li>
          <li>• Share Kevin's personal experience with the product</li>
          <li>• Reference specific health metrics the product supports</li>
        </ul>
      </div>
    </div>
  );
}
