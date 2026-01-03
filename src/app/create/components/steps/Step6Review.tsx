"use client";

import { useState, useEffect } from "react";
import { useWizardStore, Platform, ComplianceIssue } from "../../store";
import { 
  Check, 
  AlertTriangle, 
  XCircle, 
  Edit3, 
  ExternalLink,
  Hash,
  Sparkles,
  Shield
} from "lucide-react";

const PLATFORM_NAMES: Record<Platform, string> = {
  instagram_feed: "Instagram Feed",
  instagram_story: "Instagram Story",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  twitter: "Twitter/X",
  tiktok: "TikTok",
};

// Banned terms for compliance
const BANNED_TERMS = [
  { term: "trucker", replacement: "driver" },
  { term: "truckers", replacement: "drivers" },
  { term: "truck driver", replacement: "professional driver" },
  { term: "big rig", replacement: "truck" },
  { term: "18-wheeler", replacement: "rig" },
  { term: "semi", replacement: "truck" },
];

export function Step6Review() {
  const {
    contentOptions,
    selectedContentId,
    editedContent,
    editContent,
    platforms,
    visuals,
    complianceIssues,
    setComplianceIssues,
    setFinalContent,
  } = useWizardStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);

  const selectedContent = contentOptions.find((o) => o.id === selectedContentId);
  const currentText = editedContent || selectedContent?.text || "";
  const enabledPlatforms = platforms.filter((p) => p.enabled);

  // Run compliance check on mount
  useEffect(() => {
    const issues = checkCompliance(currentText);
    setComplianceIssues(issues);
    setHashtags(selectedContent?.hashtags || []);
    
    // Set final content
    setFinalContent({
      text: currentText,
      hashtags: selectedContent?.hashtags || [],
      platforms: enabledPlatforms.map((p) => p.platform),
    });
  }, [currentText]);

  const checkCompliance = (text: string): ComplianceIssue[] => {
    const issues: ComplianceIssue[] = [];
    const lowerText = text.toLowerCase();

    // Check for banned terms
    for (const { term, replacement } of BANNED_TERMS) {
      if (lowerText.includes(term)) {
        issues.push({
          type: "error",
          message: `Contains "${term}" - use "${replacement}" instead`,
          suggestion: replacement,
          autoFixable: true,
        });
      }
    }

    // Check for medical claims
    const medicalTerms = ["cure", "treat", "diagnose", "prescription", "medical advice"];
    for (const term of medicalTerms) {
      if (lowerText.includes(term)) {
        issues.push({
          type: "warning",
          message: `"${term}" may trigger medical content filters`,
          suggestion: "Consider rephrasing to avoid platform restrictions",
        });
      }
    }

    // Check for good practices
    if (!text.includes("\n")) {
      issues.push({
        type: "info",
        message: "Consider adding line breaks for better readability",
      });
    }

    // All good!
    if (issues.length === 0) {
      issues.push({
        type: "info",
        message: "Content looks good! No issues detected.",
      });
    }

    return issues;
  };

  const handleEdit = () => {
    setEditText(currentText);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    editContent(editText);
    setIsEditing(false);
    const issues = checkCompliance(editText);
    setComplianceIssues(issues);
  };

  const autoFix = (term: string, replacement: string) => {
    const regex = new RegExp(term, "gi");
    const fixed = currentText.replace(regex, replacement);
    editContent(fixed);
  };

  const errorCount = complianceIssues.filter((i) => i.type === "error").length;
  const warningCount = complianceIssues.filter((i) => i.type === "warning").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Final Review</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Check your content before publishing
        </p>
      </div>

      {/* Compliance Summary */}
      <div className={`
        rounded-xl border p-4
        ${errorCount > 0 
          ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
          : warningCount > 0
          ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
          : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
        }
      `}>
        <div className="flex items-center gap-3 mb-3">
          <Shield className={`h-5 w-5 ${
            errorCount > 0 ? "text-red-600" : warningCount > 0 ? "text-amber-600" : "text-green-600"
          }`} />
          <h3 className="font-medium">Brand Compliance Check</h3>
        </div>
        
        <div className="space-y-2">
          {complianceIssues.map((issue, i) => (
            <div key={i} className="flex items-start gap-2">
              {issue.type === "error" ? (
                <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              ) : issue.type === "warning" ? (
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              ) : (
                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-sm">{issue.message}</p>
                {issue.autoFixable && issue.suggestion && (
                  <button
                    onClick={() => {
                      const termMatch = issue.message.match(/"([^"]+)"/);
                      if (termMatch) {
                        autoFix(termMatch[1], issue.suggestion!);
                      }
                    }}
                    className="text-xs text-primary hover:underline mt-1"
                  >
                    Auto-fix: Replace with "{issue.suggestion}"
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content Preview */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h3 className="font-medium">Content</h3>
          <button
            onClick={handleEdit}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
        
        <div className="p-4">
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-foreground leading-relaxed">
              {currentText}
            </p>
          )}
        </div>
      </div>

      {/* Hashtags */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">Hashtags</h3>
          </div>
          <span className="text-xs text-muted-foreground">{hashtags.length} tags</span>
        </div>
        
        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            {hashtags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Platform Previews */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h3 className="font-medium">Platform Visuals</h3>
        </div>
        
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
          {enabledPlatforms.map((platform) => {
            const visual = visuals.find((v) => v.platform === platform.platform);
            
            return (
              <div key={platform.platform} className="text-center">
                <div className="aspect-square bg-muted rounded-lg flex items-center justify-center mb-2">
                  {visual?.status === "completed" ? (
                    <div className="text-center">
                      <Check className="h-6 w-6 text-green-600 mx-auto" />
                      <p className="text-xs text-muted-foreground mt-1">Ready</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {visual?.status || "Pending"}
                    </p>
                  )}
                </div>
                <p className="text-sm font-medium">{PLATFORM_NAMES[platform.platform]}</p>
                <p className="text-xs text-muted-foreground">{platform.format}</p>
                {visual?.gammaUrl && (
                  <a
                    href={visual.gammaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                  >
                    View <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Summary */}
      <div className="bg-gradient-to-r from-primary/5 to-transparent border border-primary/10 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Ready to Publish</p>
            <p className="text-muted-foreground mt-1">
              {errorCount === 0 
                ? "Your content passes all brand compliance checks. Looking good!"
                : `Fix ${errorCount} issue${errorCount > 1 ? 's' : ''} before publishing for best results.`
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
