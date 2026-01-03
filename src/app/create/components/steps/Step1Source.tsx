"use client";

import { useState } from "react";
import { useWizardStore, SourceType } from "../../store";
import { 
  Lightbulb, 
  BookOpen, 
  Mic, 
  ShoppingBag, 
  Star, 
  BookMarked,
  Sparkles,
  ArrowRight
} from "lucide-react";

const SOURCE_OPTIONS: {
  type: SourceType;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}[] = [
  {
    type: "idea",
    icon: <Lightbulb className="h-6 w-6" />,
    title: "Quick Idea",
    description: "Start with a topic, quote, stat, or tip",
    color: "bg-[#F4A300]/20 text-[#F4A300]",
  },
  {
    type: "guide",
    icon: <BookOpen className="h-6 w-6" />,
    title: "From Guide",
    description: "Extract content from your health guides",
    color: "bg-blue-500/20 text-blue-400",
  },
  {
    type: "episode",
    icon: <Mic className="h-6 w-6" />,
    title: "From Episode",
    description: "Pull quotes from podcast transcripts",
    color: "bg-purple-500/20 text-purple-400",
  },
  {
    type: "product",
    icon: <ShoppingBag className="h-6 w-6" />,
    title: "From Product",
    description: "Spotlight a product from your store",
    color: "bg-[#22C55E]/20 text-[#22C55E]",
  },
  {
    type: "testimonial",
    icon: <Star className="h-6 w-6" />,
    title: "Success Story",
    description: "Share a client transformation",
    color: "bg-[#FF4500]/20 text-[#FF4500]",
  },
  {
    type: "trucktales",
    icon: <BookMarked className="h-6 w-6" />,
    title: "TruckTales",
    description: "Promote your fiction stories",
    color: "bg-rose-500/20 text-rose-400",
  },
];

export function Step1Source() {
  const { setSource, sourceType, sourceContent, nextStep } = useWizardStore();
  const [selectedType, setSelectedType] = useState<SourceType | null>(sourceType);
  const [content, setContent] = useState(sourceContent);
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  const handleSourceSelect = (type: SourceType) => {
    setSelectedType(type);
    if (type !== "idea") {
      // For non-idea sources, we'd show a selector
      // For MVP, we'll just enable the idea input
    }
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    if (selectedType) {
      setSource(selectedType, value);
    }
  };

  const handleQuickCreate = async () => {
    if (!content.trim()) return;
    setSource("idea", content);
    // In quick create mode, AI handles everything
    // For now, just proceed to next step
    nextStep();
  };

  return (
    <div className="space-y-8">
      {/* Quick Create Banner */}
      <div className="bg-gradient-to-r from-[#FF4500]/20 to-[#FF4500]/5 border-2 border-[#FF4500]/40 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-[#FF4500]/20 flex-shrink-0">
            <Sparkles className="h-5 w-5 text-[#FF4500]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-white">Quick Create</h3>
            <p className="text-sm text-[#888888] mt-1 break-words">
              Just type your idea and let AI handle the rest. One click to create, review, and schedule.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="e.g., 70% of drivers have Candida overgrowth"
                className="flex-1 min-w-0 px-4 py-2 rounded border border-[#333333] bg-[#0D0D0D] text-white text-sm focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]/20 placeholder-[#888888]"
              />
              <button
                onClick={handleQuickCreate}
                disabled={!content.trim()}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded bg-gradient-to-r from-[#FF4500] to-[#CC3700] text-white font-medium hover:from-[#FF6633] hover:to-[#FF4500] disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Let AI Handle It</span>
                <span className="sm:hidden">Create</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-[#333333]" />
        <span className="text-sm text-[#888888]">or choose a source</span>
        <div className="flex-1 h-px bg-[#333333]" />
      </div>

      {/* Source Options Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {SOURCE_OPTIONS.map(({ type, icon, title, description, color }) => (
          <button
            key={type}
            onClick={() => handleSourceSelect(type)}
            className={`
              relative p-5 rounded-lg border-2 text-left transition-all duration-200
              hover:-translate-y-0.5
              ${selectedType === type
                ? "border-[#FF4500] bg-[#FF4500]/10"
                : "border-[#333333] bg-[#1A1A1A] hover:border-[#444444]"
              }
            `}
          >
            <div className={`inline-flex p-2 rounded-lg ${color}`}>
              {icon}
            </div>
            <h3 className="font-semibold mt-3 text-white">{title}</h3>
            <p className="text-sm text-[#888888] mt-1">{description}</p>
            
            {selectedType === type && (
              <div className="absolute top-3 right-3">
                <div className="w-2 h-2 rounded-full bg-[#FF4500]" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Content Input for Selected Source */}
      {selectedType === "idea" && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-[#1A1A1A] rounded-lg border border-[#333333] p-6">
            <label className="block text-sm font-medium mb-2 text-white">
              What's your idea?
            </label>
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Share a stat, quote, tip, or topic you want to turn into social content..."
              rows={4}
              className="w-full px-4 py-3 rounded border border-[#333333] bg-[#0D0D0D] text-white resize-none focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]/20 placeholder-[#888888]"
            />
            <p className="text-xs text-[#888888] mt-2">
              Be specific! The more detail you give, the better content I can create.
            </p>
          </div>
        </div>
      )}

      {/* Guide Selector (placeholder for now) */}
      {selectedType === "guide" && (
        <div className="bg-[#1A1A1A] rounded-lg border border-[#333333] p-6 animate-in slide-in-from-bottom-4 duration-300">
          <label className="block text-sm font-medium mb-4 text-white">
            Select a guide to extract content from
          </label>
          <div className="grid gap-3">
            {[
              "Shut Up and Digest",
              "Sleep When You're Dead",
              "Blood Sugar Chaos",
              "The Owner-Operator's Heart",
              "Gut Check",
            ].map((guide) => (
              <button
                key={guide}
                onClick={() => {
                  setContent(`Extract key points from "${guide}" guide`);
                  setSource("guide", guide, guide);
                }}
                className="flex items-center justify-between p-4 rounded border border-[#333333] hover:bg-[#0D0D0D] hover:border-[#444444] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-[#888888]" />
                  <span className="font-medium text-white">{guide}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-[#888888]" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product Selector (placeholder) */}
      {selectedType === "product" && (
        <div className="bg-[#1A1A1A] rounded-lg border border-[#333333] p-6 animate-in slide-in-from-bottom-4 duration-300">
          <label className="block text-sm font-medium mb-4 text-white">
            Select a product to spotlight
          </label>
          <p className="text-sm text-[#888888]">
            Product selector will load from Shopify catalog...
          </p>
          <input
            type="text"
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Or enter a product name manually"
            className="mt-4 w-full px-4 py-2 rounded border border-[#333333] bg-[#0D0D0D] text-white focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]/20 placeholder-[#888888]"
          />
        </div>
      )}

      {/* Testimonial Input */}
      {selectedType === "testimonial" && (
        <div className="bg-[#1A1A1A] rounded-lg border border-[#333333] p-6 animate-in slide-in-from-bottom-4 duration-300">
          <label className="block text-sm font-medium mb-2 text-white">
            Share the success story
          </label>
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="e.g., John lost 40 lbs in 3 months following the proper human diet. His energy is through the roof and he's sleeping 6+ hours for the first time in years..."
            rows={5}
            className="w-full px-4 py-3 rounded border border-[#333333] bg-[#0D0D0D] text-white resize-none focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]/20 placeholder-[#888888]"
          />
          <p className="text-xs text-[#888888] mt-2">
            Use first names only. Focus on specific, measurable results.
          </p>
        </div>
      )}
    </div>
  );
}
