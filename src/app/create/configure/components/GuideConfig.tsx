"use client";

import { CampaignConfig } from "../../store";
import { Mail, Package } from "lucide-react";

interface GuideConfigProps {
  sourceData: Record<string, unknown> | null;
  config: CampaignConfig;
  updateConfig: (config: Partial<CampaignConfig>) => void;
}

export default function GuideConfig({
  sourceData,
  config,
  updateConfig,
}: GuideConfigProps) {
  return (
    <div className="space-y-6">
      {/* Email Sequence Toggle */}
      <div className="flex items-center justify-between p-4 bg-[#0D0D0D] rounded-lg border border-[#333333]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FF4500]/10 rounded-lg flex items-center justify-center">
            <Mail className="w-5 h-5 text-[#FF4500]" />
          </div>
          <div>
            <h3 className="font-medium text-white">Email Nurture Sequence</h3>
            <p className="text-sm text-[#888888]">
              Generate automated follow-up emails for leads
            </p>
          </div>
        </div>
        <button
          onClick={() => updateConfig({ includeEmail: !config.includeEmail })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            config.includeEmail ? "bg-[#FF4500]" : "bg-[#333333]"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              config.includeEmail ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Email Sequence Length */}
      {config.includeEmail && (
        <div>
          <label className="block text-sm font-medium mb-2 text-white">
            Email Sequence Length
          </label>
          <select
            value={config.emailLength}
            onChange={(e) =>
              updateConfig({ emailLength: parseInt(e.target.value) })
            }
            className="w-full bg-[#0D0D0D] border border-[#333333] rounded-lg px-4 py-3 text-white focus:border-[#FF4500] focus:outline-none"
          >
            <option value={3}>3 emails (Quick nurture)</option>
            <option value={5}>5 emails (Standard)</option>
            <option value={7}>7 emails (Deep nurture)</option>
          </select>
          <p className="text-sm text-[#666666] mt-1">
            Emails will be sent over{" "}
            {config.emailLength === 3
              ? "7 days"
              : config.emailLength === 5
              ? "14 days"
              : "21 days"}
          </p>
        </div>
      )}

      {/* Product Connection */}
      <div>
        <label className="block text-sm font-medium mb-2 text-white">
          Connect to Product (optional)
        </label>
        <div className="flex items-center gap-3 p-4 bg-[#0D0D0D] rounded-lg border border-[#333333]">
          <div className="w-10 h-10 bg-[#3B82F6]/10 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-[#3B82F6]" />
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={config.productName || ""}
              onChange={(e) => updateConfig({ productName: e.target.value })}
              placeholder="e.g., Cardio Miracle, Lyte Balance"
              className="w-full bg-transparent border-none text-white placeholder-[#666666] focus:outline-none"
            />
          </div>
        </div>
        <p className="text-sm text-[#666666] mt-1">
          AI will naturally weave product mentions into final phase content
        </p>
      </div>

      {/* Guide-specific notes */}
      <div className="p-4 bg-[#FF4500]/5 border border-[#FF4500]/20 rounded-lg">
        <h4 className="text-sm font-medium text-[#FF4500] mb-2">
          Guide Campaign Best Practices
        </h4>
        <ul className="text-sm text-[#888888] space-y-1">
          <li>• Days 1-3: Problem awareness with stats from the guide</li>
          <li>• Days 4-10: Value and education from guide content</li>
          <li>• Days 11-14: Push to landing page with urgency</li>
        </ul>
      </div>
    </div>
  );
}
