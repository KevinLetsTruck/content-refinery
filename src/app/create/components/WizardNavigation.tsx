"use client";

import { useWizardStore } from "../store";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

export function WizardNavigation() {
  const { currentStep, canProceed, isLoading, nextStep, prevStep } = useWizardStore();

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === 7;

  return (
    <footer className="border-t bg-card px-6 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Back Button */}
        <button
          onClick={prevStep}
          disabled={isFirstStep || isLoading}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
            ${isFirstStep || isLoading
              ? 'text-muted-foreground cursor-not-allowed'
              : 'text-foreground hover:bg-accent'
            }
          `}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Step Indicator */}
        <span className="text-sm text-muted-foreground">
          Step {currentStep} of 7
        </span>

        {/* Next Button */}
        <button
          onClick={nextStep}
          disabled={!canProceed || isLoading}
          className={`
            flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors
            ${!canProceed || isLoading
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }
          `}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : isLastStep ? (
            'Publish'
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </footer>
  );
}
