"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWizardStore, ShowName } from "../../store";
import { WizardProgress } from "../../components/WizardProgress";
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Loader2,
  MessageSquare,
  AlertCircle,
  CalendarDays,
} from "lucide-react";

// ============================================
// Constants
// ============================================

const SHOW_LABELS: Record<ShowName, string> = {
  tbb: "Trucking Business & Beyond",
  destination_health: "Destination Health",
  power_hour: "Power Hour",
  coffee_with_kevin: "Coffee with Kevin",
  custom: "Show",
};

// ============================================
// Component
// ============================================

export default function ShowNotesTeaserPage() {
  const router = useRouter();
  const {
    showNotesData,
    setShowNotesTeaserText,
    setShowNotesSavedId,
    setShowDate,
    setTeaserScheduledFor,
    setSource,
    setContentOptions,
    selectContent,
    editContent,
    setMode,
    goToStep,
    currentStep,
  } = useWizardStore();

  const [teaserText, setTeaserText] = useState(showNotesData.teaserText || "");
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [localShowDate, setLocalShowDate] = useState(showNotesData.showDate || "");
  const [localTeaserDate, setLocalTeaserDate] = useState(showNotesData.teaserScheduledFor || "");
  const [teaserDateManuallySet, setTeaserDateManuallySet] = useState(!!showNotesData.teaserScheduledFor);

  // Ensure we're on step 6
  useEffect(() => {
    if (currentStep !== 6) {
      goToStep(6);
    }
  }, [currentStep, goToStep]);

  // Redirect if no outline
  useEffect(() => {
    if (!showNotesData.outline) {
      router.push("/create/show-notes/sources");
    }
  }, [showNotesData.outline, router]);

  // Sync local teaser text when store changes
  useEffect(() => {
    if (showNotesData.teaserText && !teaserText) {
      setTeaserText(showNotesData.teaserText);
    }
  }, [showNotesData.teaserText, teaserText]);

  const getShowLabel = () => {
    if (showNotesData.show === "custom" && showNotesData.customShowName) {
      return showNotesData.customShowName;
    }
    return SHOW_LABELS[showNotesData.show];
  };

  const characterCount = teaserText.length;

  // ============================================
  // Handlers
  // ============================================

  const handleTeaserChange = (value: string) => {
    setTeaserText(value);
    setShowNotesTeaserText(value);
  };

  const handleShowDateChange = (value: string) => {
    setLocalShowDate(value);
    setShowDate(value || null);

    // Auto-suggest teaser date as 1 day before, if not manually set
    if (value && !teaserDateManuallySet) {
      const showDateObj = new Date(value);
      showDateObj.setDate(showDateObj.getDate() - 1);
      const autoTeaser = showDateObj.toISOString().slice(0, 16);
      setLocalTeaserDate(autoTeaser);
      setTeaserScheduledFor(autoTeaser);
    }
  };

  const handleTeaserDateChange = (value: string) => {
    setLocalTeaserDate(value);
    setTeaserScheduledFor(value || null);
    setTeaserDateManuallySet(true);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setRegenerateError(null);

    try {
      const res = await fetch("/api/show-notes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          show: showNotesData.show,
          customShowName: showNotesData.customShowName,
          sourceItems: showNotesData.sourceItems,
          regenerateTeaserOnly: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to regenerate teaser");
      }

      const data = await res.json();
      if (data.teaserText) {
        setTeaserText(data.teaserText);
        setShowNotesTeaserText(data.teaserText);
      }
    } catch (err) {
      setRegenerateError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setRegenerating(false);
    }
  };

  const handleContinueToPublish = async () => {
    setPublishing(true);

    try {
      // Save show notes to DB if not already saved
      if (!showNotesData.savedId) {
        const res = await fetch("/api/show-notes/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            showName: showNotesData.show,
            customShowName: showNotesData.customShowName,
            sourceItems: showNotesData.sourceItems,
            outline: showNotesData.outline,
            publicNotes: showNotesData.publicNotes,
            teaserText: teaserText,
            showDate: showNotesData.showDate || null,
            teaserScheduledFor: showNotesData.teaserScheduledFor || null,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.id) {
            setShowNotesSavedId(data.id);
          }
        }
      }

      // Bridge to Quick Post flow
      const showLabel = getShowLabel();

      setSource("quick_idea", teaserText, `${showLabel} Show Teaser`);

      setContentOptions([
        {
          id: "teaser-1",
          text: teaserText,
          type: "teaser",
          emotion: "curiosity",
          cta: "tune_in",
          hashtags: ["LetsTruck", showLabel.replace(/\s/g, "")],
        },
      ]);

      selectContent("teaser-1");
      editContent(teaserText);
      setMode("quick_post");
      goToStep(5);
      router.push("/create/platforms");
    } catch {
      // Even if save fails, proceed to publish flow
      const showLabel = getShowLabel();

      setSource("quick_idea", teaserText, `${showLabel} Show Teaser`);

      setContentOptions([
        {
          id: "teaser-1",
          text: teaserText,
          type: "teaser",
          emotion: "curiosity",
          cta: "tune_in",
          hashtags: ["LetsTruck", showLabel.replace(/\s/g, "")],
        },
      ]);

      selectContent("teaser-1");
      editContent(teaserText);
      setMode("quick_post");
      goToStep(5);
      router.push("/create/platforms");
    } finally {
      setPublishing(false);
    }
  };

  if (!showNotesData.outline) return null;

  // ============================================
  // Render
  // ============================================

  return (
    <>
      <WizardProgress />

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push("/create/show-notes/outline")}
          className="flex items-center gap-2 text-[#888888] hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Outline
        </button>

        <h1 className="text-3xl font-bold mb-2 text-white">
          Teaser Post
        </h1>
        <p className="text-[#888888] mb-8">
          Create a social media teaser to promote{" "}
          <span className="text-[#F4A300]">{getShowLabel()}</span>.
        </p>

        {/* ============================================ */}
        {/* Teaser Editor */}
        {/* ============================================ */}
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-white flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#F4A300]" />
              Teaser Text
            </label>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#333333] text-[#888888] hover:text-[#F4A300] hover:border-[#F4A300]/50 transition-colors disabled:opacity-50"
            >
              {regenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Regenerate
            </button>
          </div>

          <textarea
            value={teaserText}
            onChange={(e) => handleTeaserChange(e.target.value)}
            rows={8}
            placeholder="Your show teaser will appear here..."
            className="w-full px-4 py-3 rounded-lg border border-[#333333] bg-[#0D0D0D] text-white resize-none focus:outline-none focus:border-[#F4A300] focus:ring-1 focus:ring-[#F4A300]/20 placeholder-[#666666] leading-relaxed"
          />

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              {regenerateError && (
                <div className="flex items-center gap-1.5 text-red-400 text-sm">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {regenerateError}
                </div>
              )}
            </div>
            <span
              className={`text-sm ${
                characterCount > 280
                  ? "text-[#F4A300]"
                  : "text-[#666666]"
              }`}
            >
              {characterCount} characters
            </span>
          </div>
        </div>

        {/* ============================================ */}
        {/* Preview */}
        {/* ============================================ */}
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6 mb-8">
          <h2 className="text-sm font-medium text-[#888888] uppercase tracking-wider mb-4">
            Preview
          </h2>

          <div className="bg-[#0D0D0D] border border-[#333333] rounded-lg p-5">
            {/* Fake social post header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF4500] to-[#CC3700] flex items-center justify-center text-white font-bold text-sm">
                LT
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Let&apos;s Truck
                </p>
                <p className="text-xs text-[#666666]">Just now</p>
              </div>
            </div>

            {/* Post content */}
            <div className="text-sm text-[#cccccc] whitespace-pre-wrap leading-relaxed">
              {teaserText || (
                <span className="text-[#444444] italic">
                  Your teaser text will preview here...
                </span>
              )}
            </div>

            {/* Fake engagement bar */}
            <div className="flex items-center gap-6 mt-4 pt-3 border-t border-[#333333]">
              <span className="text-xs text-[#666666]">Like</span>
              <span className="text-xs text-[#666666]">Comment</span>
              <span className="text-xs text-[#666666]">Share</span>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* Schedule */}
        {/* ============================================ */}
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6 mb-8">
          <h2 className="text-sm font-medium text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#F4A300]" />
            Schedule
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-[#888888] mb-2">
                Show Air Date
              </label>
              <input
                type="datetime-local"
                value={localShowDate}
                onChange={(e) => handleShowDateChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-[#333333] bg-[#0D0D0D] text-white focus:outline-none focus:border-[#F4A300] focus:ring-1 focus:ring-[#F4A300]/20"
              />
            </div>

            <div>
              <label className="block text-sm text-[#888888] mb-2">
                Teaser Post Date
              </label>
              <input
                type="datetime-local"
                value={localTeaserDate}
                onChange={(e) => handleTeaserDateChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-[#333333] bg-[#0D0D0D] text-white focus:outline-none focus:border-[#F4A300] focus:ring-1 focus:ring-[#F4A300]/20"
              />
              {localShowDate && !teaserDateManuallySet && localTeaserDate && (
                <p className="text-xs text-[#666666] mt-1.5">
                  Auto-set to 1 day before show
                </p>
              )}
            </div>
          </div>

          <p className="text-xs text-[#555555] mt-4">
            Both dates are optional. Skip to save as a draft.
          </p>
        </div>

        {/* ============================================ */}
        {/* Action Buttons */}
        {/* ============================================ */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/create/show-notes/outline")}
            className="flex items-center gap-2 px-4 py-2 rounded border border-[#333333] text-[#888888] hover:text-white hover:border-[#444444] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <button
            onClick={handleContinueToPublish}
            disabled={!teaserText.trim() || publishing}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#FF4500] to-[#CC3700] hover:from-[#FF5500] hover:to-[#DD4700] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-all"
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Continue to Publish
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}
