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
    color: "bg-amber-500/10 text-amber-600 border-amber-200",
  },
  {
    type: "guide",
    icon: <BookOpen className="h-6 w-6" />,
    title: "From Guide",
    description: "Extract content from your health guides",
    color: "bg-blue-500/10 text-blue-600 border-blue-200",
  },
  {
    type: "episode",
    icon: <Mic className="h-6 w-6" />,
    title: "From Episode",
    description: "Pull quotes from podcast transcripts",
    color: "bg-purple-500/10 text-purple-600 border-purple-200",
  },
  {
    type: "product",
    icon: <ShoppingBag className="h-6 w-6" />,
    title: "From Product",
    description: "Spotlight a product from your store",
    color: "bg-green-500/10 text-green-600 border-green-200",
  },
  {
    type: "testimonial",
    icon: <Star className="h-6 w-6" />,
    title: "Success Story",
    description: "Share a client transformation",
    color: "bg-orange-500/10 text-orange-600 border-orange-200",
  },
  {
    type: "trucktales",
    icon: <BookMarked className="h-6 w-6" />,
    title: "TruckTales",
    description: "Promote your fiction stories",
    color: "bg-rose-500/10 text-rose-600 border-rose-200",
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
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Quick Create</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Just type your idea and let AI handle the rest. One click to create, review, and schedule.
            </p>
            <div className="mt-4 flex gap-3">
              <input
                type="text"
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="e.g., 70% of drivers have Candida overgrowth"
                className="flex-1 px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={handleQuickCreate}
                disabled={!content.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Let AI Handle It
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-sm text-muted-foreground">or choose a source</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Source Options Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {SOURCE_OPTIONS.map(({ type, icon, title, description, color }) => (
          <button
            key={type}
            onClick={() => handleSourceSelect(type)}
            className={`
              relative p-5 rounded-xl border-2 text-left transition-all duration-200
              hover:shadow-md hover:-translate-y-0.5
              ${selectedType === type
                ? "border-primary bg-primary/5"
                : "border-transparent bg-card hover:border-border"
              }
            `}
          >
            <div className={`inline-flex p-2 rounded-lg ${color}`}>
              {icon}
            </div>
            <h3 className="font-semibold mt-3">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
            
            {selectedType === type && (
              <div className="absolute top-3 right-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Content Input for Selected Source */}
      {selectedType === "idea" && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-card rounded-xl border p-6">
            <label className="block text-sm font-medium mb-2">
              What's your idea?
            </label>
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Share a stat, quote, tip, or topic you want to turn into social content..."
              rows={4}
              className="w-full px-4 py-3 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Be specific! The more detail you give, the better content I can create.
            </p>
          </div>
        </div>
      )}

      {/* Guide Selector (placeholder for now) */}
      {selectedType === "guide" && (
        <div className="bg-card rounded-xl border p-6 animate-in slide-in-from-bottom-4 duration-300">
          <label className="block text-sm font-medium mb-4">
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
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{guide}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product Selector (placeholder) */}
      {selectedType === "product" && (
        <div className="bg-card rounded-xl border p-6 animate-in slide-in-from-bottom-4 duration-300">
          <label className="block text-sm font-medium mb-4">
            Select a product to spotlight
          </label>
          <p className="text-sm text-muted-foreground">
            Product selector will load from Shopify catalog...
          </p>
          <input
            type="text"
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Or enter a product name manually"
            className="mt-4 w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      )}

      {/* Testimonial Input */}
      {selectedType === "testimonial" && (
        <div className="bg-card rounded-xl border p-6 animate-in slide-in-from-bottom-4 duration-300">
          <label className="block text-sm font-medium mb-2">
            Share the success story
          </label>
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="e.g., John lost 40 lbs in 3 months following the proper human diet. His energy is through the roof and he's sleeping 6+ hours for the first time in years..."
            rows={5}
            className="w-full px-4 py-3 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Use first names only. Focus on specific, measurable results.
          </p>
        </div>
      )}
    </div>
  );
}
