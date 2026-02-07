"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWizardStore } from "../../store";
import { WizardProgress } from "../../components/WizardProgress";
import { Loader2, AlertCircle, RotateCcw } from "lucide-react";

const PROGRESS_MESSAGES = [
  { text: "Analyzing sources...", minTime: 0 },
  { text: "Finding connections between topics...", minTime: 2000 },
  { text: "Building show outline...", minTime: 4000 },
  { text: "Generating talking points...", minTime: 6000 },
];

export default function ShowNotesGeneratePage() {
  const router = useRouter();
  const {
    showNotesData,
    setShowNotesOutline,
    setPublicShowNotes,
    setShowNotesTeaserText,
    currentStep,
    goToStep,
  } = useWizardStore();

  const [progressIndex, setProgressIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const hasStarted = useRef(false);

  // Ensure we're on step 4
  useEffect(() => {
    if (currentStep !== 4) {
      goToStep(4);
    }
  }, [currentStep, goToStep]);

  // Redirect if no source items
  useEffect(() => {
    if (showNotesData.sourceItems.length === 0) {
      router.push("/create/show-notes/sources");
    }
  }, [showNotesData.sourceItems.length, router]);

  // Dynamic progress message with source count
  const getProgressMessage = () => {
    const n = showNotesData.sourceItems.length;
    const msg = PROGRESS_MESSAGES[progressIndex];
    if (progressIndex === 0) {
      return `Analyzing ${n} source${n === 1 ? "" : "s"}...`;
    }
    return msg.text;
  };

  // Cycle through progress messages
  useEffect(() => {
    if (!isGenerating) return;

    const timers: NodeJS.Timeout[] = [];
    PROGRESS_MESSAGES.forEach((msg, index) => {
      if (index > 0) {
        const timer = setTimeout(() => {
          setProgressIndex(index);
        }, msg.minTime);
        timers.push(timer);
      }
    });

    return () => timers.forEach(clearTimeout);
  }, [isGenerating]);

  // Call the generate endpoint on mount
  useEffect(() => {
    if (hasStarted.current) return;
    if (showNotesData.sourceItems.length === 0) return;
    hasStarted.current = true;

    const generate = async () => {
      setIsGenerating(true);
      setError(null);
      setProgressIndex(0);

      try {
        const res = await fetch("/api/show-notes/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            show: showNotesData.show,
            customShowName: showNotesData.customShowName,
            sourceItems: showNotesData.sourceItems,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Generation failed (${res.status})`);
        }

        const data = await res.json();

        if (data.outline) {
          setShowNotesOutline(data.outline);
        }
        if (data.publicNotes) {
          setPublicShowNotes(data.publicNotes);
        }
        if (data.teaserText) {
          setShowNotesTeaserText(data.teaserText);
        }

        router.push("/create/show-notes/outline");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setIsGenerating(false);
      }
    };

    generate();
  }, [
    showNotesData.show,
    showNotesData.customShowName,
    showNotesData.sourceItems,
    setShowNotesOutline,
    setPublicShowNotes,
    setShowNotesTeaserText,
    router,
  ]);

  const handleRetry = () => {
    hasStarted.current = false;
    setError(null);
    setIsGenerating(false);
    setProgressIndex(0);
    // Trigger re-run by toggling state
    setTimeout(() => {
      hasStarted.current = false;
      // Force re-mount effect
      window.location.reload();
    }, 0);
  };

  return (
    <>
      <WizardProgress />

      <div className="max-w-2xl mx-auto px-6 py-16 flex flex-col items-center justify-center min-h-[60vh]">
        {error ? (
          /* Error State */
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Generation Failed
            </h2>
            <p className="text-[#888888] mb-8 max-w-md mx-auto">{error}</p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-[#FF4500] to-[#CC3700] hover:from-[#FF5500] hover:to-[#DD4700] text-white font-medium transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        ) : (
          /* Loading State */
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-8">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-2 border-[#333333]" />
              {/* Spinning ring */}
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#F4A300] animate-spin" />
              {/* Center icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#F4A300] animate-spin" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-3">
              Generating Show Notes
            </h2>

            <p className="text-[#F4A300] text-lg mb-2 transition-all duration-500">
              {getProgressMessage()}
            </p>

            <p className="text-[#666666] text-sm">
              This may take a minute depending on the amount of content.
            </p>

            {/* Source count indicator */}
            <div className="mt-8 flex items-center justify-center gap-2">
              {showNotesData.sourceItems.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i <= progressIndex
                      ? "bg-[#F4A300]"
                      : "bg-[#333333]"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
