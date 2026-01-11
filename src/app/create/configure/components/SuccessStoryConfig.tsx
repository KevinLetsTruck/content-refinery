"use client";

import { CampaignConfig } from "../../store";
import { User, Scale, Droplet, Heart, Brain, Moon, Battery } from "lucide-react";
import { useState, useEffect } from "react";

interface SuccessStoryConfigProps {
  sourceData: Record<string, unknown> | null;
  config: CampaignConfig;
  updateConfig: (config: Partial<CampaignConfig>) => void;
}

const METRIC_OPTIONS = [
  { id: "weight", name: "Weight", icon: Scale, unit: "lbs" },
  { id: "a1c", name: "A1C", icon: Droplet, unit: "%" },
  { id: "blood_pressure", name: "Blood Pressure", icon: Heart, unit: "mmHg" },
  { id: "energy", name: "Energy Level", icon: Battery, unit: "/10" },
  { id: "sleep", name: "Sleep Hours", icon: Moon, unit: "hrs" },
  { id: "focus", name: "Mental Clarity", icon: Brain, unit: "/10" },
];

export default function SuccessStoryConfig({
  sourceData,
  config,
  updateConfig,
}: SuccessStoryConfigProps) {
  const [storyDetails, setStoryDetails] = useState(
    config.storyDetails || {
      clientAlias: "",
      transformationSummary: "",
      beforeMetrics: {},
      afterMetrics: {},
    }
  );

  useEffect(() => {
    updateConfig({ storyDetails });
  }, [storyDetails, updateConfig]);

  const updateMetric = (
    type: "before" | "after",
    metricId: string,
    value: string
  ) => {
    setStoryDetails((prev) => ({
      ...prev,
      [`${type}Metrics`]: {
        ...prev[`${type}Metrics`],
        [metricId]: value,
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Client Info */}
      <div>
        <label className="block text-sm font-medium mb-2 text-white">
          Client Name or Alias
        </label>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#333333] rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-[#888888]" />
          </div>
          <input
            type="text"
            value={storyDetails.clientAlias}
            onChange={(e) =>
              setStoryDetails((prev) => ({
                ...prev,
                clientAlias: e.target.value,
              }))
            }
            placeholder="e.g., Mike, Anonymous Driver, Big Mike from Texas"
            className="flex-1 bg-[#0D0D0D] border border-[#333333] rounded-lg px-4 py-3 text-white placeholder-[#666666] focus:border-[#FF4500] focus:outline-none"
          />
        </div>
        <p className="text-sm text-[#666666] mt-1">
          Use first name only or an alias if they prefer anonymity
        </p>
      </div>

      {/* Transformation Summary */}
      <div>
        <label className="block text-sm font-medium mb-2 text-white">
          Transformation Summary
        </label>
        <textarea
          value={storyDetails.transformationSummary}
          onChange={(e) =>
            setStoryDetails((prev) => ({
              ...prev,
              transformationSummary: e.target.value,
            }))
          }
          placeholder="Brief summary of their journey... e.g., 'Company driver for 20 years, diagnosed pre-diabetic, lost 45lbs in 6 months following the protocol'"
          rows={3}
          className="w-full bg-[#0D0D0D] border border-[#333333] rounded-lg px-4 py-3 text-white placeholder-[#666666] focus:border-[#FF4500] focus:outline-none resize-none"
        />
      </div>

      {/* Before/After Metrics */}
      <div>
        <label className="block text-sm font-medium mb-3 text-white">
          Before/After Metrics (optional but powerful)
        </label>
        <div className="bg-[#0D0D0D] rounded-lg border border-[#333333] overflow-hidden">
          <div className="grid grid-cols-3 gap-px bg-[#333333]">
            <div className="bg-[#1A1A1A] p-3 text-sm text-[#888888]">Metric</div>
            <div className="bg-[#1A1A1A] p-3 text-sm text-[#888888] text-center">
              Before
            </div>
            <div className="bg-[#1A1A1A] p-3 text-sm text-[#888888] text-center">
              After
            </div>
          </div>
          {METRIC_OPTIONS.map((metric) => (
            <div
              key={metric.id}
              className="grid grid-cols-3 gap-px bg-[#333333]"
            >
              <div className="bg-[#1A1A1A] p-3 flex items-center gap-2">
                <metric.icon className="w-4 h-4 text-[#666666]" />
                <span className="text-sm text-white">{metric.name}</span>
              </div>
              <div className="bg-[#1A1A1A] p-2">
                <input
                  type="text"
                  value={storyDetails.beforeMetrics[metric.id] || ""}
                  onChange={(e) =>
                    updateMetric("before", metric.id, e.target.value)
                  }
                  placeholder={metric.unit}
                  className="w-full bg-[#0D0D0D] border border-[#333333] rounded px-2 py-1 text-white text-sm text-center placeholder-[#666666] focus:border-[#FF4500] focus:outline-none"
                />
              </div>
              <div className="bg-[#1A1A1A] p-2">
                <input
                  type="text"
                  value={storyDetails.afterMetrics[metric.id] || ""}
                  onChange={(e) =>
                    updateMetric("after", metric.id, e.target.value)
                  }
                  placeholder={metric.unit}
                  className="w-full bg-[#0D0D0D] border border-[#333333] rounded px-2 py-1 text-white text-sm text-center placeholder-[#666666] focus:border-[#FF4500] focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Success story notes */}
      <div className="p-4 bg-[#FF4500]/5 border border-[#FF4500]/20 rounded-lg">
        <h4 className="text-sm font-medium text-[#FF4500] mb-2">
          Success Story Arc (5 Days)
        </h4>
        <ul className="text-sm text-[#888888] space-y-1">
          <li>
            • Day 1: <strong>The Starting Point</strong> - Where they were, the struggles
          </li>
          <li>
            • Day 2: <strong>The Breaking Point</strong> - What made them change
          </li>
          <li>
            • Day 3: <strong>The Journey</strong> - What they did, challenges faced
          </li>
          <li>
            • Day 4: <strong>The Results</strong> - The transformation, the numbers
          </li>
          <li>
            • Day 5: <strong>The Invitation</strong> - Your turn, how to start
          </li>
        </ul>
      </div>
    </div>
  );
}
