"use client";

import { useState, useEffect } from "react";
import { useWizardStore, ContentOption } from "../../store";
import { Sparkles, Check, Edit3, RefreshCw, Combine, Loader2 } from "lucide-react";

export function Step3Content() {
  const {
    sourceContent,
    sourceType,
    interviewData,
    contentOptions,
    setContentOptions,
    selectedContentId,
    selectContent,
    editedContent,
    editContent,
    setLoading,
    isLoading,
    quickIdeaType,
    contentLength,
    contentCategory,
  } = useWizardStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // Generate content options on mount
  useEffect(() => {
    if (contentOptions.length === 0) {
      generateContentOptions();
    }
  }, []);

  const generateContentOptions = async () => {
    setLoading(true);
    
    try {
      const response = await fetch("/api/create/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType,
          sourceContent,
          interviewData,
          quickIdeaType,
          contentLength,
          contentCategory,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setContentOptions(data.options);
      } else {
        // Fallback to mock data if API fails
        setContentOptions(generateMockOptions());
      }
    } catch (error) {
      console.error("Failed to generate content:", error);
      setContentOptions(generateMockOptions());
    } finally {
      setLoading(false);
    }
  };

  const generateMockOptions = (): ContentOption[] => {
    const baseMessage = sourceContent || "Your health is your responsibility";
    const evidence = interviewData.supportingEvidence || "";
    
    return [
      {
        id: "option-1",
        text: `${baseMessage}\n\n${evidence ? evidence + "\n\n" : ""}Your gut is under attack. Time to fight back.`,
        type: "stat",
        emotion: "wake_up_call",
        cta: "Learn more",
        hashtags: ["#LetsTruck", "#DriverHealth", "#GutHealth", "#OwnerOperator", "#TheTribe"],
      },
      {
        id: "option-2",
        text: `Why do professional drivers struggle with gut issues more than anyone else?\n\n${evidence ? "Hint: " + evidence + "\n\n" : ""}It's not just the food. It's worse.`,
        type: "hook",
        emotion: "curiosity",
        cta: "Read more",
        hashtags: ["#LetsTruck", "#ProperHumanDiet", "#DriverWellness", "#HealthCoaching"],
      },
      {
        id: "option-3",
        text: `I've tested over 500 professional drivers.\n\n${evidence ? evidence + "\n\n" : ""}The conventional health industry doesn't understand what you face every day behind the wheel. But I do.\n\nYou're the owner-operator of your own health.`,
        type: "educational",
        emotion: "empowerment",
        cta: "Get started",
        hashtags: ["#LetsTruck", "#FNTP", "#OwnerOperator", "#TakeBackControl", "#TheTribe"],
      },
    ];
  };

  const handleEdit = (option: ContentOption) => {
    setEditingId(option.id);
    setEditText(option.text);
  };

  const handleSaveEdit = () => {
    if (editingId) {
      const updatedOptions = contentOptions.map((opt) =>
        opt.id === editingId ? { ...opt, text: editText } : opt
      );
      setContentOptions(updatedOptions);
      setEditingId(null);
      setEditText("");
    }
  };

  const handleSelect = (id: string) => {
    selectContent(id);
    const selected = contentOptions.find((o) => o.id === id);
    if (selected) {
      editContent(selected.text);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <Loader2 className="absolute -top-1 -right-1 h-6 w-6 text-primary animate-spin" />
        </div>
        <h3 className="mt-6 text-lg font-semibold">Generating Content Options</h3>
        <p className="text-muted-foreground text-sm mt-2">
          AI is crafting variations based on your brief...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Choose Your Content</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Select the version that best captures your message
          </p>
        </div>
        <button
          onClick={generateContentOptions}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border hover:bg-accent transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Regenerate All
        </button>
      </div>

      {/* Content Options */}
      <div className="space-y-4">
        {contentOptions.map((option, index) => (
          <div
            key={option.id}
            className={`
              relative bg-card rounded-xl border-2 p-6 transition-all duration-200
              ${selectedContentId === option.id
                ? "border-primary shadow-lg"
                : "border-transparent hover:border-border"
              }
            `}
          >
            {/* Option Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-bold">
                  {String.fromCharCode(65 + index)}
                </span>
                <div>
                  <span className="text-sm font-medium capitalize">
                    {option.type.replace("_", " ")} Style
                  </span>
                  <span className="mx-2 text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground capitalize">
                    {option.emotion.replace("_", " ")}
                  </span>
                </div>
              </div>
              
              {selectedContentId === option.id && (
                <div className="flex items-center gap-1 text-primary text-sm font-medium">
                  <Check className="h-4 w-4" />
                  Selected
                </div>
              )}
            </div>

            {/* Content */}
            {editingId === option.id ? (
              <div className="space-y-3">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                {option.text}
              </p>
            )}

            {/* Hashtags */}
            <div className="mt-4 flex flex-wrap gap-2">
              {option.hashtags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(option)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Regenerate
                </button>
              </div>

              <button
                onClick={() => handleSelect(option.id)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${selectedContentId === option.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary hover:bg-secondary/80"
                  }
                `}
              >
                {selectedContentId === option.id ? "Selected" : "Select This"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* AI Insight */}
      <div className="bg-gradient-to-r from-primary/5 to-transparent border border-primary/10 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground">AI Insight</p>
            <p className="text-muted-foreground mt-1">
              Option A uses a stat-forward approach which typically gets 2.3x more shares. 
              Option C has a more personal, authoritative tone that builds trust. 
              Both work well for your audience.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
