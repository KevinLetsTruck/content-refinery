"use client";

import { useMemo } from "react";
import {
  FileText,
  Rocket,
  Clock,
  ShoppingBag,
  Check,
  Sparkles,
  Layout,
  Mail,
  ListChecks,
} from "lucide-react";
import {
  LANDING_PAGE_TEMPLATES,
  TEMPLATE_ORDER,
  getTemplateRecommendation,
  LandingPageTemplateConfig,
} from "@/lib/landing-pages/templates";

interface ExtractedData {
  title?: string;
  subtitle?: string;
  summary?: string;
  keyMessages?: string[];
  stats?: string[];
  hooks?: string[];
  chapters?: string[];
}

interface Props {
  leadMagnet: { id: string; title: string; description?: string | null };
  extractedData: ExtractedData;
  onSelect: (templateId: string) => void;
  selectedTemplate?: string;
}

const ICON_MAP = {
  FileText,
  Rocket,
  Clock,
  ShoppingBag,
};

export default function Step2Template({
  leadMagnet,
  extractedData,
  onSelect,
  selectedTemplate,
}: Props) {
  // Get AI recommendation
  const recommendation = useMemo(() => {
    return getTemplateRecommendation(extractedData);
  }, [extractedData]);

  // Get selected template config
  const selectedConfig = selectedTemplate
    ? LANDING_PAGE_TEMPLATES[selectedTemplate]
    : null;

  return (
    <div className="space-y-6">
      {/* AI Recommendation */}
      <div className="p-4 bg-[#FF4500]/10 border border-[#FF4500]/30 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FF4500]/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-[#FF4500]" />
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">AI Recommendation</h3>
            <p className="text-sm text-gray-300">
              Based on <span className="text-[#FF4500]">{leadMagnet.title}</span>,
              we recommend{" "}
              <button
                onClick={() => onSelect(recommendation.templateId)}
                className="text-[#FF4500] font-medium hover:underline"
              >
                {LANDING_PAGE_TEMPLATES[recommendation.templateId].name}
              </button>
              . {recommendation.reason}
            </p>
          </div>
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TEMPLATE_ORDER.map((templateId) => {
          const template = LANDING_PAGE_TEMPLATES[templateId];
          const Icon = ICON_MAP[template.icon];
          const isSelected = selectedTemplate === templateId;
          const isRecommended = recommendation.templateId === templateId;

          return (
            <button
              key={templateId}
              onClick={() => onSelect(templateId)}
              className={`relative text-left p-5 rounded-xl border-2 transition-all ${
                isSelected
                  ? "border-[#FF4500] bg-[#FF4500]/10"
                  : "border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#3A3A3A]"
              }`}
            >
              {/* Selected Checkmark */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#FF4500] flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              {/* Recommended Badge */}
              {isRecommended && !isSelected && (
                <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-[#FF4500]/20 text-[#FF4500] text-xs font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Recommended
                </div>
              )}

              {/* Icon */}
              <div
                className={`w-12 h-12 rounded-lg ${template.iconBgColor} flex items-center justify-center mb-3`}
              >
                <Icon className={`w-6 h-6 ${template.iconColor}`} />
              </div>

              {/* Content */}
              <h3 className="font-semibold text-white mb-1">{template.name}</h3>
              <p className="text-sm text-gray-400 mb-3">{template.description}</p>

              {/* Best For */}
              <p className="text-xs text-gray-500">
                <span className="text-gray-400 font-medium">Best for:</span>{" "}
                {template.bestFor}
              </p>
            </button>
          );
        })}
      </div>

      {/* Preview Section */}
      {selectedConfig && (
        <div className="p-5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Layout className="w-4 h-4 text-gray-400" />
            What AI Will Generate
          </h3>

          <div className="space-y-4">
            {/* Preview Headline */}
            <div className="p-4 bg-[#0D0D0D] rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Landing Page Headline
              </p>
              <p className="text-lg font-semibold text-white">
                {extractedData.title || selectedConfig.defaultHeadline}
              </p>
              {extractedData.subtitle && (
                <p className="text-sm text-gray-400 mt-1">
                  {extractedData.subtitle}
                </p>
              )}
            </div>

            {/* Preview Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-[#0D0D0D] rounded-lg text-center">
                <ListChecks className="w-5 h-5 text-[#FF4500] mx-auto mb-1" />
                <p className="text-lg font-bold text-white">
                  {extractedData.keyMessages?.length || 5}
                </p>
                <p className="text-xs text-gray-500">Benefits</p>
              </div>
              <div className="p-3 bg-[#0D0D0D] rounded-lg text-center">
                <Mail className="w-5 h-5 text-[#FF4500] mx-auto mb-1" />
                <p className="text-lg font-bold text-white">
                  {selectedConfig.formFields.length}
                </p>
                <p className="text-xs text-gray-500">Form Fields</p>
              </div>
              <div className="p-3 bg-[#0D0D0D] rounded-lg text-center">
                <FileText className="w-5 h-5 text-[#FF4500] mx-auto mb-1" />
                <p className="text-lg font-bold text-white">
                  {selectedConfig.features.length}
                </p>
                <p className="text-xs text-gray-500">Sections</p>
              </div>
            </div>

            {/* Features Preview */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                Included Sections
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedConfig.features.map((feature, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-xs rounded-full bg-[#2A2A2A] text-gray-400"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
